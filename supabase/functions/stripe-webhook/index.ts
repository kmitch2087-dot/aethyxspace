// Stripe webhook: keeps financial_records in sync in real time
// Public (no JWT) — verifies signature with STRIPE_WEBHOOK_SECRET
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      return new Response("Stripe secrets not configured", { status: 500 });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        sig,
        webhookSecret,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Bad signature";
      console.error("[stripe-webhook] signature verify failed:", msg);
      return new Response(`Webhook Error: ${msg}`, { status: 400 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const upsertCharge = async (charge: Stripe.Charge) => {
      const clientName =
        charge.billing_details?.name ||
        charge.receipt_email ||
        charge.customer?.toString() ||
        "Unknown";
      const record = {
        client_name: clientName,
        service_name: charge.description || null,
        amount: charge.amount / 100,
        payment_status: charge.refunded
          ? "refunded"
          : charge.status === "succeeded"
          ? "paid"
          : "pending",
        payment_date: new Date(charge.created * 1000).toISOString(),
        stripe_payment_id: charge.id,
        stripe_session_id: (charge.payment_intent as string) || null,
      };
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
      } else {
        await admin.from("financial_records").insert(record);
      }
    };

    switch (event.type) {
      case "charge.succeeded":
      case "charge.updated":
      case "charge.refunded":
      case "charge.failed":
        await upsertCharge(event.data.object as Stripe.Charge);
        break;
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_intent) {
          const pi = await stripe.paymentIntents.retrieve(
            session.payment_intent as string,
            { expand: ["latest_charge"] },
          );
          const charge = pi.latest_charge as Stripe.Charge | null;
          if (charge) await upsertCharge(charge);
        }
        break;
      }
      default:
        // ignore other events
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe-webhook]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
