// Admin-only: open and forward emails from the Sent log.
// The send log historically stored only metadata, but every row carries the
// Resend message_id — so "get" fetches the full sent email (subject + HTML)
// from Resend's API on first open and caches it into email_send_log, making
// every past send viewable, not just ones sent after this feature shipped.
// "forward" re-sends that HTML to a new recipient with a Fwd: subject and
// logs it as its own send-log row.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const FROM_PERSONAL = "Kristin at Aethyx <kristinmitchell@aethyx.space>";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveContent(admin: any, resendKey: string, row: any): Promise<{ subject: string; html: string } | null> {
  if (row.html_body) return { subject: row.subject || row.template_name, html: row.html_body };
  if (!row.message_id) return null;
  const res = await fetch(`https://api.resend.com/emails/${row.message_id}`, {
    headers: { Authorization: `Bearer ${resendKey}` },
  });
  if (!res.ok) {
    console.warn("[email-actions] Resend lookup failed:", row.message_id, res.status);
    return null;
  }
  const email = await res.json();
  if (!email?.html) return null;
  const subject = email.subject || row.template_name;
  await admin.from("email_send_log").update({ subject, html_body: email.html }).eq("id", row.id);
  return { subject, html: email.html };
}

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

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json({ error: "RESEND_API_KEY not configured" }, 500, cors);

    const { action, logId, recipientEmail } = await req.json();
    if (!logId) return json({ error: "logId required" }, 400, cors);

    const { data: row } = await admin.from("email_send_log").select("*").eq("id", logId).maybeSingle();
    if (!row) return json({ error: "Email not found" }, 404, cors);

    if (action === "get") {
      const content = await resolveContent(admin, resendKey, row);
      if (!content) {
        return json({
          ok: false,
          error: "The content of this email is no longer retrievable (it predates content logging and Resend no longer has it).",
        }, 200, cors);
      }
      return json({ ok: true, subject: content.subject, html: content.html }, 200, cors);
    }

    if (action === "forward") {
      const to = String(recipientEmail || "").trim().toLowerCase();
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return json({ error: "Valid recipientEmail required" }, 400, cors);
      const content = await resolveContent(admin, resendKey, row);
      if (!content) return json({ ok: false, error: "Original content not retrievable — cannot forward." }, 200, cors);

      const subject = content.subject.startsWith("Fwd:") ? content.subject : `Fwd: ${content.subject}`;
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: FROM_PERSONAL, to: [to], subject, html: content.html }),
      });
      const resBody = await res.json();
      await admin.from("email_send_log").insert({
        message_id: resBody.id || crypto.randomUUID(),
        template_name: row.template_name,
        recipient_email: to,
        status: res.ok ? "sent" : "failed",
        error_message: res.ok ? null : JSON.stringify(resBody).slice(0, 1000),
        metadata: { forwarded_from: row.id },
        subject,
        html_body: content.html,
      });
      if (!res.ok) return json({ ok: false, error: "Resend rejected the forward" }, 500, cors);
      return json({ ok: true, id: resBody.id }, 200, cors);
    }

    return json({ error: "action must be get or forward" }, 400, cors);
  } catch (err) {
    console.error("[email-actions]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500, cors);
  }
});
