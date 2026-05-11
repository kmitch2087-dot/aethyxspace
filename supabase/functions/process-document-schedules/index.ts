// Cron-invoked: process due document_schedules (time-based + recurring)
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Find due schedules that are time-based
  const { data: due } = await admin.from("document_schedules")
    .select("*")
    .eq("active", true)
    .in("trigger_type", ["once", "recurring"])
    .lte("next_run_at", new Date().toISOString())
    .limit(50);

  let processed = 0;
  for (const sched of (due || [])) {
    await runSchedule(admin, sched);
    processed++;
  }

  return new Response(JSON.stringify({ ok: true, processed }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});

async function runSchedule(admin: any, sched: any) {
  try {
    let targetIds: string[] = sched.target_client_ids || [];
    if (sched.target_type === "all") {
      const { data } = await admin.from("client_profiles").select("id").eq("status", "active");
      targetIds = (data || []).map((r: any) => r.id);
    }
    if (targetIds.length) {
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
    }
    // Compute next_run_at
    let nextRunAt: string | null = null;
    let active = sched.active;
    if (sched.trigger_type === "recurring" && sched.recurrence) {
      const base = new Date();
      if (sched.recurrence === "daily") base.setUTCDate(base.getUTCDate() + 1);
      else if (sched.recurrence === "weekly") base.setUTCDate(base.getUTCDate() + 7);
      else if (sched.recurrence === "monthly") base.setUTCMonth(base.getUTCMonth() + 1);
      nextRunAt = base.toISOString();
    } else {
      active = false; // one-shot
    }
    await admin.from("document_schedules").update({
      last_run_at: new Date().toISOString(),
      next_run_at: nextRunAt,
      active,
    }).eq("id", sched.id);
  } catch (e) {
    console.error("[process-document-schedules] schedule failed", sched.id, e);
  }
}
