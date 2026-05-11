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

    // Also re-sync existing client_invoices statuses from Stripe so
    // payments that succeeded after the original webhook (or where the webhook
    // was missed) get reflected in the admin's "Pending" totals.
    let invoicesSynced = 0;
    const { data: localInvoices } = await admin
      .from("client_invoices")
      .select("id, stripe_invoice_id, status")
      .not("stripe_invoice_id", "is", null)
      .neq("status", "paid");

    for (const li of localInvoices || []) {
      try {
        const si = await stripe.invoices.retrieve(li.stripe_invoice_id!);
        const newStatus = si.status || li.status;
        const amountPaid = (si.amount_paid || 0) / 100;
        const amountDue = (si.amount_due || 0) / 100;
        const paidAt = si.status_transitions?.paid_at
          ? new Date(si.status_transitions.paid_at * 1000).toISOString()
          : null;
        await admin
          .from("client_invoices")
          .update({
            status: newStatus,
            amount_paid: amountPaid,
            amount_due: amountDue,
            paid_at: paidAt,
            hosted_invoice_url: si.hosted_invoice_url || null,
            invoice_pdf: si.invoice_pdf || null,
          })
          .eq("id", li.id);
        invoicesSynced++;
      } catch (e) {
        console.warn("[stripe-sync] invoice sync failed", li.stripe_invoice_id, e);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        skipped,
        total: charges.data.length,
        invoicesSynced,
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
