// Server-internal: dispatch a system event (client_added, portal_activated, invoice_paid, etc.)
// Looks up matching event-based document_schedules and fires them for the relevant client.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VALID_EVENTS = ["client_added","portal_activated","invoice_paid","project_status_changed","agreement_signed","intake_completed"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const eventName = String(body.event_name || "");
    const clientProfileId = body.client_profile_id ? String(body.client_profile_id) : null;
    if (!VALID_EVENTS.includes(eventName)) return new Response(JSON.stringify({ error: "invalid event" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: schedules } = await admin.from("document_schedules")
      .select("*").eq("active", true).eq("trigger_type", "event").eq("event_name", eventName);

    let fired = 0;
    for (const sched of (schedules || [])) {
      let targetIds: string[] = sched.target_client_ids || [];
      if (sched.target_type === "event_subject" && clientProfileId) targetIds = [clientProfileId];
      else if (sched.target_type === "all") {
        const { data } = await admin.from("client_profiles").select("id").eq("status", "active");
        targetIds = (data || []).map((r: any) => r.id);
      }
      if (!targetIds.length) continue;
      await admin.functions.invoke("document-actions", {
        body: {
          action: "share_and_email",
          adminDocId: sched.admin_document_id,
          clientProfileIds: targetIds,
          subject: sched.subject || "",
          message: sched.message || "",
        },
        headers: { Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!}` },
      });
      await admin.from("document_schedules").update({ last_run_at: new Date().toISOString() }).eq("id", sched.id);
      fired++;
    }
    return new Response(JSON.stringify({ ok: true, fired }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("[dispatch-doc-event]", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "err" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
