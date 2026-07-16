// Scans Kristin's Gmail for subscription receipt emails (vendors listed in
// expense_email_senders), extracts vendor/amount/date with Gemini, and posts each
// as a paid expense in financial_records — deduped by Gmail message id, with every
// examined message remembered in expense_email_seen so non-receipts aren't
// re-parsed. Runs daily via pg_cron; also triggerable from the admin Financials page.
//
// Auth: an admin JWT, or the EXPENSE_CAPTURE_SECRET bearer used by the cron job.
// Uses the same Google OAuth refresh-token flow as schedule-consultation; if that
// token lacks the gmail.readonly scope, responds with needsAuth + a ready-made
// consent URL instead of failing opaquely.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const GEMINI_TIMEOUT_MS = 30_000;
const MAX_NEW_MESSAGES_PER_RUN = 25;
const SEARCH_WINDOW = "45d";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getGoogleAccessToken(admin: any): Promise<string | null> {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET");
  // Prefer the Gmail-scoped refresh token stored by the in-app "Connect Gmail" step;
  // fall back to the original (calendar-only) env secret.
  const { data: stored } = await admin
    .from("app_private_config").select("value").eq("key", "google_oauth_refresh_token").maybeSingle();
  const refreshToken = stored?.value || Deno.env.get("GOOGLE_OAUTH_REFRESH_TOKEN");
  if (!clientId || !clientSecret || !refreshToken) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("[capture-expense-emails] google token exchange failed:", await res.text());
    return null;
  }
  return (await res.json()).access_token as string;
}

function buildConsentUrl(): string | null {
  const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID");
  if (!clientId) return null;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: "https://developers.google.com/oauthplayground",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

// Decode Gmail's base64url body data.
function decodeBody(data: string): string {
  try {
    const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
}

// Walk MIME parts, preferring text/plain, falling back to tag-stripped text/html.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractText(payload: any): string {
  const plain: string[] = [];
  const html: string[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const walk = (part: any) => {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data) plain.push(decodeBody(part.body.data));
    if (part.mimeType === "text/html" && part.body?.data) html.push(decodeBody(part.body.data));
    for (const p of part.parts || []) walk(p);
  };
  walk(payload);
  const text = plain.join("\n") || html.join("\n").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

const PARSE_PROMPT = `You are extracting expense data from an email sent to a small design agency owner. Decide whether this email is a RECEIPT or INVOICE for a payment (a charge that was made or is due), as opposed to a newsletter, product announcement, security alert, or other non-billing email.

Respond with ONLY a JSON object, no other text:
{"is_receipt": true/false, "vendor": "company name", "amount": 12.34, "currency": "USD", "date": "YYYY-MM-DD", "description": "short human label e.g. 'Claude Pro subscription — monthly'"}

Rules: amount is the total charged, as a number. If the email shows no actual amount, set is_receipt to false. Use the payment/charge date if shown, else the email's date.`;

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const bearer = (req.headers.get("Authorization") || "").replace("Bearer ", "");

    // Cron path: shared secret. Admin path: user JWT + role check.
    const cronSecret = Deno.env.get("EXPENSE_CAPTURE_SECRET");
    let authorized = !!cronSecret && bearer === cronSecret;
    if (!authorized) {
      const { data: userData } = await admin.auth.getUser(bearer);
      if (userData.user) {
        const { data: roleRow } = await admin
          .from("user_roles").select("role")
          .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
        authorized = !!roleRow;
      }
    }
    if (!authorized) return json({ error: "Unauthorized" }, 401, cors);

    // "Connect Gmail" step: exchange the pasted authorization code for a
    // Gmail-scoped refresh token and persist it for all future runs.
    let requestBody: { authCode?: string } = {};
    try { requestBody = await req.json(); } catch { /* cron sends {} or nothing */ }
    if (requestBody.authCode) {
      const clientId = Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")!;
      const clientSecret = Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")!;
      const exch = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: requestBody.authCode.trim(),
          grant_type: "authorization_code",
          redirect_uri: "https://developers.google.com/oauthplayground",
        }),
      });
      const exchJson = await exch.json().catch(() => ({}));
      if (!exch.ok || !exchJson.refresh_token) {
        console.warn("[capture-expense-emails] code exchange failed:", JSON.stringify(exchJson).slice(0, 300));
        return json({
          ok: false,
          error: `Google rejected the code: ${exchJson.error_description || exchJson.error || exch.status}. Codes are single-use and expire in minutes — get a fresh one and try again.`,
        }, 200, cors);
      }
      await admin.from("app_private_config").upsert({
        key: "google_oauth_refresh_token",
        value: exchJson.refresh_token,
        updated_at: new Date().toISOString(),
      });
      return json({ ok: true, connected: true }, 200, cors);
    }

    const accessToken = await getGoogleAccessToken(admin);
    if (!accessToken) {
      return json({ ok: false, error: "Google OAuth is not configured or the refresh token is invalid." }, 500, cors);
    }

    const { data: senders } = await admin
      .from("expense_email_senders").select("vendor_name, sender_domain").eq("active", true);
    if (!senders?.length) return json({ ok: true, scanned: 0, captured: 0, note: "No active vendors configured" }, 200, cors);

    const q = `from:(${senders.map((s) => s.sender_domain).join(" OR ")}) newer_than:${SEARCH_WINDOW}`;
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(q)}&maxResults=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (listRes.status === 403) {
      const detail = await listRes.text().catch(() => "");
      console.warn("[capture-expense-emails] Gmail scope insufficient:", detail.slice(0, 300));
      return json({
        ok: false,
        needsAuth: true,
        error: "The Google connection doesn't have Gmail read permission yet.",
        consentUrl: buildConsentUrl(),
      }, 200, cors);
    }
    if (!listRes.ok) {
      const detail = await listRes.text().catch(() => "");
      return json({ ok: false, error: `Gmail search failed (${listRes.status}): ${detail.slice(0, 200)}` }, 500, cors);
    }
    const listJson = await listRes.json();
    const messageIds: string[] = (listJson.messages || []).map((m: { id: string }) => m.id);

    // Drop everything we've already examined.
    const { data: seenRows } = await admin
      .from("expense_email_seen").select("message_id").in("message_id", messageIds.length ? messageIds : ["-"]);
    const seen = new Set((seenRows || []).map((r: { message_id: string }) => r.message_id));
    const fresh = messageIds.filter((id) => !seen.has(id)).slice(0, MAX_NEW_MESSAGES_PER_RUN);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ ok: false, error: "GEMINI_API_KEY is not configured" }, 500, cors);

    let captured = 0;
    let notReceipts = 0;
    let failures = 0;
    let totalAmount = 0;
    const capturedItems: { vendor: string; amount: number; date: string }[] = [];

    for (const id of fresh) {
      let verdict = "parse_failed";
      try {
        const msgRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        if (!msgRes.ok) throw new Error(`fetch message ${id}: ${msgRes.status}`);
        const msg = await msgRes.json();
        const headers: { name: string; value: string }[] = msg.payload?.headers || [];
        const header = (n: string) => headers.find((h) => h.name.toLowerCase() === n.toLowerCase())?.value || "";
        const from = header("From");
        const subject = header("Subject");
        const emailDate = msg.internalDate ? new Date(Number(msg.internalDate)) : new Date();
        const bodyText = extractText(msg.payload);
        const sender = senders.find((s) => from.toLowerCase().includes(s.sender_domain));

        const geminiController = new AbortController();
        const geminiTimeout = setTimeout(() => geminiController.abort(), GEMINI_TIMEOUT_MS);
        let geminiResp: Response;
        try {
          geminiResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: `${PARSE_PROMPT}\n\nFrom: ${from}\nSubject: ${subject}\nDate: ${emailDate.toISOString()}\n\n${bodyText}` }],
                }],
              }),
              signal: geminiController.signal,
            },
          );
        } finally {
          clearTimeout(geminiTimeout);
        }
        if (!geminiResp.ok) throw new Error(`Gemini ${geminiResp.status}`);
        const gj = await geminiResp.json();
        const text = gj?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) throw new Error("Gemini returned no JSON");
        const parsed = JSON.parse(match[0]);

        const amount = Number(parsed.amount);
        if (!parsed.is_receipt || !Number.isFinite(amount) || amount <= 0 || amount > 10000) {
          verdict = "not_receipt";
          notReceipts++;
        } else {
          const vendor = sender?.vendor_name || String(parsed.vendor || "Unknown vendor").slice(0, 100);
          const paidDate = /^\d{4}-\d{2}-\d{2}/.test(String(parsed.date)) ? new Date(parsed.date) : emailDate;
          const currencyNote = parsed.currency && parsed.currency !== "USD" ? ` (${parsed.currency})` : "";
          const { error: insErr } = await admin.from("financial_records").insert({
            entry_type: "expense",
            client_name: vendor,
            service_name: String(parsed.description || subject || "Subscription").slice(0, 200),
            amount,
            payment_status: "paid",
            payment_date: paidDate.toISOString(),
            notes: `Auto-captured from Gmail${currencyNote} — "${subject.slice(0, 150)}"`,
            source_email_id: id,
          });
          if (insErr) throw new Error(`insert: ${insErr.message}`);
          verdict = "expense";
          captured++;
          totalAmount += amount;
          capturedItems.push({ vendor, amount, date: paidDate.toISOString().slice(0, 10) });
        }
      } catch (err) {
        failures++;
        console.warn(`[capture-expense-emails] message ${id} failed:`, err instanceof Error ? err.message : err);
      }
      await admin.from("expense_email_seen").upsert({ message_id: id, verdict });
    }

    return json({
      ok: true,
      scanned: fresh.length,
      alreadyProcessed: messageIds.length - fresh.length,
      captured,
      notReceipts,
      failures,
      totalAmount: Number(totalAmount.toFixed(2)),
      items: capturedItems,
    }, 200, cors);
  } catch (err) {
    console.error("[capture-expense-emails]", err);
    return json({ ok: false, error: err instanceof Error ? err.message : "Unknown error" }, 500, cors);
  }
});
