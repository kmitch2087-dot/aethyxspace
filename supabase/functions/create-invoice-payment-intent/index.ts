// Client-facing: create a Stripe PaymentIntent for an invoice the user owns.
// Returns clientSecret + Stripe publishable key for embedded Payment Element.
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

    const { invoiceId } = await req.json();
    if (!invoiceId) return new Response(JSON.stringify({ error: "invoiceId required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Fetch invoice owned by this user
    const { data: inv, error: invErr } = await admin
      .from("client_invoices")
      .select("*")
      .eq("id", invoiceId)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (invErr || !inv) {
      return new Response(JSON.stringify({ error: "Invoice not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (inv.status === "paid") {
      return new Response(JSON.stringify({ error: "Invoice already paid" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const amountCents = Math.round(Number(inv.amount_due) * 100);
    if (amountCents <= 50) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Stripe-managed invoices: pay them directly so Stripe marks them paid.
    if (inv.stripe_invoice_id) {
      const stripeInvoice = await stripe.invoices.retrieve(inv.stripe_invoice_id);
      if (stripeInvoice.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(stripeInvoice.payment_intent as string);
        // If already succeeded, return success state
        if (pi.status === "succeeded") {
          return new Response(JSON.stringify({ alreadyPaid: true }), { headers: { ...cors, "Content-Type": "application/json" } });
        }
        return new Response(JSON.stringify({
          clientSecret: pi.client_secret,
          publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "",
          amount: amountCents,
        }), { headers: { ...cors, "Content-Type": "application/json" } });
      }
      // Finalize if still draft
      if (stripeInvoice.status === "draft") {
        await stripe.invoices.finalizeInvoice(stripeInvoice.id);
      }
      const refreshed = await stripe.invoices.retrieve(stripeInvoice.id);
      const pi2 = await stripe.paymentIntents.retrieve(refreshed.payment_intent as string);
      return new Response(JSON.stringify({
        clientSecret: pi2.client_secret,
        publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "",
        amount: amountCents,
      }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Standalone invoice (no stripe_invoice_id): create a one-off PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: inv.currency || "usd",
      automatic_payment_methods: { enabled: true },
      receipt_email: inv.email || userData.user.email!,
      metadata: { local_invoice_id: invoiceId, user_id: userData.user.id },
    });
    return new Response(JSON.stringify({
      clientSecret: pi.client_secret,
      publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "",
      amount: amountCents,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-invoice-payment-intent]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
