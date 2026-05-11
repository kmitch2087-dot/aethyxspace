// Admin-only: pull a Stripe customer + invoices by email and upsert into client_profiles + client_invoices
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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

    const { email, fullName } = await req.json();
    if (!email) return new Response(JSON.stringify({ error: "email required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    const cleanEmail = String(email).trim().toLowerCase();

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Find or create Stripe customer
    const list = await stripe.customers.list({ email: cleanEmail, limit: 1 });
    let customer = list.data[0];
    if (!customer && fullName) {
      customer = await stripe.customers.create({ email: cleanEmail, name: fullName });
    }
    if (!customer) {
      return new Response(JSON.stringify({ error: "No Stripe customer found for this email. Provide fullName to create one." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Parse name
    const name = customer.name || fullName || "";
    const [first, ...rest] = name.trim().split(/\s+/);
    const firstName = first || "";
    const lastName = rest.join(" ") || "";

    // Match by stripe_customer_ids array OR exact email
    const { data: byCust } = await admin.from("client_profiles").select("*")
      .contains("stripe_customer_ids", [customer.id]).maybeSingle();
    const { data: byEmail } = byCust ? { data: null } : await admin.from("client_profiles").select("*")
      .eq("email", cleanEmail).maybeSingle();
    const existingProfile = byCust || byEmail;

    let profileId: string;
    if (existingProfile) {
      const mergedIds = Array.from(new Set([
        ...(existingProfile.stripe_customer_ids || []),
        customer.id,
      ]));
      const { data: updated } = await admin.from("client_profiles").update({
        stripe_customer_id: existingProfile.stripe_customer_id || customer.id,
        stripe_customer_ids: mergedIds,
        email: existingProfile.email || cleanEmail,
        first_name: firstName || existingProfile.first_name,
        last_name: lastName || existingProfile.last_name,
        full_name: name || existingProfile.full_name,
        source: existingProfile.source || "stripe",
      }).eq("id", existingProfile.id).select().single();
      profileId = updated!.id;
    } else {
      const sentinelUserId = crypto.randomUUID();
      const { data: created, error: createErr } = await admin.from("client_profiles").insert({
        user_id: sentinelUserId,
        stripe_customer_id: customer.id,
        stripe_customer_ids: [customer.id],
        email: cleanEmail,
        first_name: firstName,
        last_name: lastName,
        full_name: name || cleanEmail,
        source: "stripe",
      }).select().single();
      if (createErr) throw createErr;
      profileId = created.id;
    }

    // Pull invoices
    const invoices = await stripe.invoices.list({ customer: customer.id, limit: 100 });
    let invoicesUpserted = 0;
    for (const inv of invoices.data) {
      const row = {
        stripe_invoice_id: inv.id,
        stripe_customer_id: customer.id,
        client_profile_id: profileId,
        invoice_number: inv.number,
        amount_due: (inv.amount_due || 0) / 100,
        amount_paid: (inv.amount_paid || 0) / 100,
        currency: inv.currency,
        status: inv.status || "draft",
        description: inv.description || inv.lines.data[0]?.description || null,
        hosted_invoice_url: inv.hosted_invoice_url,
        invoice_pdf: inv.invoice_pdf,
        due_date: inv.due_date ? new Date(inv.due_date * 1000).toISOString() : null,
        paid_at: inv.status_transitions?.paid_at ? new Date(inv.status_transitions.paid_at * 1000).toISOString() : null,
        email: cleanEmail,
      };
      await admin.from("client_invoices").upsert(row, { onConflict: "stripe_invoice_id" });
      invoicesUpserted++;
    }

    return new Response(JSON.stringify({
      success: true,
      profileId,
      stripeCustomerId: customer.id,
      invoicesUpserted,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[sync-stripe-customer]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
