// Admin-only: merge a duplicate client profile into a primary one.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

Deno.serve(async (req) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const { primaryId, secondaryId } = await req.json();
    if (!primaryId || !secondaryId || primaryId === secondaryId) {
      return new Response(JSON.stringify({ error: "primaryId and distinct secondaryId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: primary } = await admin.from("client_profiles").select("*").eq("id", primaryId).maybeSingle();
    const { data: secondary } = await admin.from("client_profiles").select("*").eq("id", secondaryId).maybeSingle();
    if (!primary || !secondary) {
      return new Response(JSON.stringify({ error: "Profiles not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Merge stripe customer ids
    const mergedIds = Array.from(new Set([
      ...(primary.stripe_customer_ids || []),
      ...(secondary.stripe_customer_ids || []),
      primary.stripe_customer_id,
      secondary.stripe_customer_id,
    ].filter(Boolean))) as string[];

    await admin.from("client_profiles").update({
      stripe_customer_ids: mergedIds,
      stripe_customer_id: primary.stripe_customer_id || secondary.stripe_customer_id,
    }).eq("id", primaryId);

    // Move related records
    await admin.from("client_invoices").update({ client_profile_id: primaryId, user_id: primary.user_id }).eq("client_profile_id", secondaryId);
    await admin.from("client_documents").update({ user_id: primary.user_id }).eq("user_id", secondary.user_id);
    await admin.from("client_messages").update({ user_id: primary.user_id }).eq("user_id", secondary.user_id);
    await admin.from("client_projects").update({ client_profile_id: primaryId }).eq("client_profile_id", secondaryId);

    // Delete duplicate
    await admin.from("client_profiles").delete().eq("id", secondaryId);

    return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[merge-client-profiles]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
