// Admin-only: create a new client profile, Stripe customer, and send portal invite — all in one.
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
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

    const body = await req.json();
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = body.phone ? String(body.phone).trim() : null;
    const businessName = body.businessName ? String(body.businessName).trim() : null;
    const sendInvite = body.sendInvite !== false;

    if (!email || !firstName) {
      return new Response(JSON.stringify({ error: "firstName and email required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const fullName = `${firstName} ${lastName}`.trim();

    // 1. Find existing profile by email (auto-merge rule)
    const { data: existing } = await admin.from("client_profiles")
      .select("*").eq("email", email).maybeSingle();

    let profileId: string;
    let warnings: string[] = [];

    // 2. Create / fetch Stripe customer
    let stripeCustomerId: string | null = existing?.stripe_customer_id ?? null;
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
      if (!stripeCustomerId) {
        const list = await stripe.customers.list({ email, limit: 1 });
        if (list.data[0]) {
          stripeCustomerId = list.data[0].id;
        } else {
          const created = await stripe.customers.create({
            email, name: fullName, phone: phone || undefined,
            metadata: businessName ? { business_name: businessName } : undefined,
          });
          stripeCustomerId = created.id;
        }
      }
    } catch (e) {
      warnings.push(`Stripe customer not created: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 3. Upsert profile
    if (existing) {
      const mergedIds = Array.from(new Set([...(existing.stripe_customer_ids || []), stripeCustomerId].filter(Boolean))) as string[];
      const { data: updated, error: updErr } = await admin.from("client_profiles").update({
        first_name: firstName, last_name: lastName, full_name: fullName,
        phone: phone || existing.phone,
        business_name: businessName || existing.business_name,
        stripe_customer_id: stripeCustomerId || existing.stripe_customer_id,
        stripe_customer_ids: mergedIds,
      }).eq("id", existing.id).select().single();
      if (updErr) throw updErr;
      profileId = updated.id;
    } else {
      const sentinelUserId = crypto.randomUUID();
      const { data: created, error: insErr } = await admin.from("client_profiles").insert({
        user_id: sentinelUserId,
        email, first_name: firstName, last_name: lastName, full_name: fullName,
        phone, business_name: businessName,
        stripe_customer_id: stripeCustomerId,
        stripe_customer_ids: stripeCustomerId ? [stripeCustomerId] : [],
        source: "admin_manual",
      }).select().single();
      if (insErr) throw insErr;
      profileId = created.id;
    }

    // 4. Send portal invite (creates auth user + email)
    if (sendInvite) {
      const inviteRes = await admin.functions.invoke("provision-client-portal", {
        body: { email, firstName, profileId },
      });
      if (inviteRes.error) warnings.push(`Portal invite: ${inviteRes.error.message}`);
    }

    return new Response(JSON.stringify({
      success: true, profileId, stripeCustomerId, warnings,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-client]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
