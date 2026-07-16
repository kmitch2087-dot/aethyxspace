// Admin-only: polish a drafted compose email (subject + body) in Aethyx's
// brand voice before sending. Returns JSON { subject, message } — never
// streams, never invents content beyond the draft's meaning.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

const SYSTEM = `You polish outgoing client emails for Kristin Mitchell, founder of Aethyx (a one-woman premium web design & branding studio).

Rewrite the draft to be clear, warm, and professional while preserving its meaning, all facts, and any specific details (names, amounts, dates, links) exactly.

Brand voice:
- First person ("I", not "we") — Aethyx is solo, founder-led
- Premium, confident, outcome-focused, human — not stiff or corporate
- No technical jargon, no filler, no exclamation overload

CRITICAL formatting rules — the email template wraps your text automatically:
- Do NOT add a greeting (no "Hi …" line) — the template adds one
- Do NOT add a sign-off or signature (no "Best," / "— Kristin") — the template signs it
- Plain text only, short paragraphs separated by blank lines. No markdown.

Respond with ONLY a JSON object: {"subject": "...", "message": "..."}. If the draft subject is empty, write a fitting one; otherwise polish it lightly.`;

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin
      .from("user_roles").select("role")
      .eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) return json({ error: "GEMINI_API_KEY not configured" }, 500, cors);

    const { subject = "", message = "", recipientName = "" } = await req.json();
    if (!String(message).trim()) return json({ error: "Nothing to polish — write a draft first." }, 400, cors);

    const res = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: `Recipient first name (template greets them automatically): ${recipientName || "unknown"}\n\nDraft subject: ${String(subject).slice(0, 300)}\n\nDraft message:\n${String(message).slice(0, 4000)}`,
          },
        ],
        temperature: 0.4,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[polish-email] Gemini error:", res.status, detail.slice(0, 300));
      return json({ error: `AI polish failed (${res.status})` }, 500, cors);
    }
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return json({ error: "AI returned an unexpected format — try again." }, 500, cors);
    const parsed = JSON.parse(match[0]);
    if (!parsed.message) return json({ error: "AI returned no message — try again." }, 500, cors);

    return json({
      ok: true,
      subject: String(parsed.subject || subject).slice(0, 300),
      message: String(parsed.message).slice(0, 5000),
    }, 200, cors);
  } catch (err) {
    console.error("[polish-email]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500, cors);
  }
});
