// Admin-only: invite a client to the portal. Creates auth user + sends magic-link "set password" email.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const allowedOrigins = [
  "https://aethyxspace.lovable.app",
  "https://aethyx.space",
  "https://www.aethyx.space",
  "http://localhost:8080",
  "http://localhost:5173",
];
const getCors = (origin: string | null) => {
  const ok = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com"));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCors(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return new Response(JSON.stringify({ error: "Auth required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return new Response(JSON.stringify({ error: "Admin only" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

    const { email, firstName, profileId } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const cleanEmail = String(email).trim().toLowerCase();

    // Find existing user (admin.auth.admin.listUsers paginates; use getUserByEmail-equivalent)
    let authUserId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const found = existing.users.find((u) => (u.email || "").toLowerCase() === cleanEmail);

    if (found) {
      authUserId = found.id;
    } else {
      // Create auth user with a random temp password — they'll reset via magic link
      const tempPw = crypto.randomUUID() + "Aa1!";
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: cleanEmail,
        password: tempPw,
        email_confirm: true,
        user_metadata: { first_name: firstName || null, source: "portal_invite" },
      });
      if (createErr) throw createErr;
      authUserId = created.user!.id;
    }

    // Link the client_profile to the auth user, and propagate to dependent tables.
    if (profileId && authUserId) {
      await admin.from("client_profiles").update({ user_id: authUserId }).eq("id", profileId);
      // Backfill stable client_profile_id linkage on rows that may already exist
      await admin.from("client_invoices").update({ user_id: authUserId, client_profile_id: profileId }).eq("client_profile_id", profileId);
      await admin.from("client_documents").update({ user_id: authUserId }).eq("client_profile_id", profileId);
      await admin.from("client_messages").update({ user_id: authUserId }).eq("client_profile_id", profileId);
      // Link any agreements / intakes whose email matches but weren't tagged yet
      await admin.from("client_agreements").update({ client_profile_id: profileId }).is("client_profile_id", null).ilike("client_email", cleanEmail);
      await admin.from("client_intakes").update({ client_profile_id: profileId, linked_user_id: authUserId }).is("client_profile_id", null).ilike("email", cleanEmail);
    }

    // Generate password recovery link via Supabase
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: cleanEmail,
      options: { redirectTo: `${origin}/portal` },
    });
    if (linkErr) throw linkErr;
    const actionLink = linkData.properties?.action_link;

    // Send the branded portal-invite email via existing infrastructure
    const { error: mailErr } = await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "portal-invite",
        recipientEmail: cleanEmail,
        idempotencyKey: `portal-invite-${authUserId}-${Date.now()}`,
        templateData: {
          firstName: firstName || "",
          actionLink,
          portalUrl: `${origin}/portal`,
        },
      },
    });
    if (mailErr) console.error("[provision-client-portal] mail error:", mailErr);

    return new Response(JSON.stringify({ success: true, authUserId }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[provision-client-portal]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
