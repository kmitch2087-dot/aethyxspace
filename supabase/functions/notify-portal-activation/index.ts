// Fires on every client portal sign-in, rate-limited to once per NOTIFY_WINDOW_HOURS per client.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ADMIN_EMAIL = "kristinmitchell@aethyx.space";
const NOTIFY_WINDOW_HOURS = 4;

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

    const { data: profile } = await admin
      .from("client_profiles")
      .select("id, full_name, first_name, last_name, business_name, email, portal_activated_at, portal_last_login_notified_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_profile" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: skip if we already notified within the window
    if (profile.portal_last_login_notified_at) {
      const lastNotified = new Date(profile.portal_last_login_notified_at).getTime();
      const windowMs = NOTIFY_WINDOW_HOURS * 60 * 60 * 1000;
      if (Date.now() - lastNotified < windowMs) {
        return new Response(JSON.stringify({ ok: true, skipped: "rate_limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const now = new Date().toISOString();

    // Mark first activation if not already set, always update last notified timestamp
    const updates: Record<string, string> = { portal_last_login_notified_at: now };
    if (!profile.portal_activated_at) updates.portal_activated_at = now;
    await admin.from("client_profiles").update(updates).eq("id", profile.id);

    const origin = req.headers.get("origin") || "https://aethyx.space";
    const clientName = profile.full_name
      || [profile.first_name, profile.last_name].filter(Boolean).join(" ")
      || profile.email
      || "A client";

    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "portal-activation-notification",
        recipientEmail: ADMIN_EMAIL,
        idempotencyKey: `portal-login-${profile.id}-${Math.floor(Date.now() / (NOTIFY_WINDOW_HOURS * 3600000))}`,
        templateData: {
          clientName,
          clientEmail: profile.email || user.email || "",
          businessName: profile.business_name || "",
          activatedAt: new Date(now).toLocaleString("en-US", {
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
