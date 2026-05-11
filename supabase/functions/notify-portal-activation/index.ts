// Called by the client portal when an invited user signs in for the first time.
// Marks `client_profiles.portal_activated_at` and emails the admin once.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "aethyxspace@protonmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Auth required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up the client profile for this user
    const { data: profile } = await admin
      .from("client_profiles")
      .select("id, full_name, first_name, last_name, business_name, email, portal_activated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (profile.portal_activated_at) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_activated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const activatedAt = new Date().toISOString();
    await admin.from("client_profiles")
      .update({ portal_activated_at: activatedAt })
      .eq("id", profile.id);

    const origin = req.headers.get("origin") || "https://aethyx.space";
    const clientName = profile.full_name
      || [profile.first_name, profile.last_name].filter(Boolean).join(" ")
      || profile.email
      || "Client";

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "portal-activation-notification",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `portal-activation-${profile.id}`,
        templateData: {
          clientName,
          clientEmail: profile.email || user.email || "",
          businessName: profile.business_name || "",
          activatedAt: new Date(activatedAt).toLocaleString("en-US", {
            dateStyle: "medium", timeStyle: "short",
          }),
          adminClientUrl: `${origin}/admin/clients/${profile.id}`,
        },
      },
    });

    return new Response(JSON.stringify({ ok: true, notified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-portal-activation]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
