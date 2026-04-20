// Manually sync charges + invoices from Stripe into financial_records
// Admin-only: requires authenticated admin JWT
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleCheck) throw new Error("Admin access required");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    // Pull last 100 successful charges
    const charges = await stripe.charges.list({ limit: 100 });
    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const charge of charges.data) {
      if (charge.status !== "succeeded" && charge.status !== "pending") {
        skipped++;
        continue;
      }

      const clientName =
        charge.billing_details?.name ||
        charge.receipt_email ||
        charge.customer?.toString() ||
        "Unknown";

      const record = {
        client_name: clientName,
        service_name: charge.description || null,
        amount: charge.amount / 100,
        payment_status:
          charge.refunded
            ? "refunded"
            : charge.status === "succeeded"
            ? "paid"
            : "pending",
        payment_date: new Date(charge.created * 1000).toISOString(),
        stripe_payment_id: charge.id,
        stripe_session_id: (charge.payment_intent as string) || null,
        notes: charge.receipt_email
          ? `Stripe email: ${charge.receipt_email}`
          : null,
      };

      // Upsert by stripe_payment_id
      const { data: existing } = await admin
        .from("financial_records")
        .select("id")
        .eq("stripe_payment_id", charge.id)
        .maybeSingle();

      if (existing) {
        await admin
          .from("financial_records")
          .update(record)
          .eq("id", existing.id);
        updated++;
      } else {
        await admin.from("financial_records").insert(record);
        inserted++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        skipped,
        total: charges.data.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-sync]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
