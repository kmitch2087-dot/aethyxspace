// Admin-only: send the bounty-approved email for an approved applicant.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await req.json();
    const action = String(body.action || "");
    const applicantId = String(body.applicantId || "");
    if (!applicantId) return json({ error: "applicantId required" }, 400, cors);

    if (action === "send_approval_email") {
      const { data: applicant, error: fetchErr } = await admin
        .from("bounty_applicants")
        .select("*")
        .eq("id", applicantId)
        .maybeSingle();
      if (fetchErr || !applicant) return json({ error: "Applicant not found" }, 404, cors);
      if (applicant.status !== "approved" || !applicant.code) {
        return json({ error: "Applicant is not approved yet" }, 400, cors);
      }

      const inv = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "bounty-approved",
          recipientEmail: applicant.email,
          idempotencyKey: `bounty-approved-${applicantId}-${Date.now()}`,
          templateData: {
            firstName: applicant.full_name?.split(" ")[0] || "",
            referralUrl: `https://aethyx.space/intake?ref=${applicant.code}`,
          },
        },
      });
      if (inv.error) return json({ error: inv.error.message }, 500, cors);
      return json({ success: true }, 200, cors);
    }

    return json({ error: "Unknown action" }, 400, cors);
  } catch (err) {
    console.error("[bounty-actions]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
