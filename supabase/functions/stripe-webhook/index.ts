// Stripe webhook: keeps financial_records in sync in real time
// Public (no JWT) — verifies signature with STRIPE_WEBHOOK_SECRET
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@18.5.0";

Deno.serve(async (req) => {
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) return new Response("Stripe secrets not configured", { status: 500 });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const sig = req.headers.get("stripe-signature");
    if (!sig) return new Response("Missing signature", { status: 400 });

    const body = await req.text();
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (e) {
      return new Response(`Webhook Error: ${e instanceof Error ? e.message : "Bad signature"}`, { status: 400 });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const upsertCharge = async (charge: Stripe.Charge) => {
      const clientName = charge.billing_details?.name || charge.receipt_email || "Unknown";
      const record = {
        client_name: clientName,
        service_name: charge.description || null,
        amount: charge.amount / 100,
        payment_status: charge.refunded ? "refunded" : charge.status === "succeeded" ? "paid" : "pending",
        payment_date: new Date(charge.created * 1000).toISOString(),
        stripe_payment_id: charge.id,
        stripe_session_id: (charge.payment_intent as string) || null,
      };
      const { data: existing } = await admin.from("financial_records").select("id").eq("stripe_payment_id", charge.id).maybeSingle();
      if (existing) await admin.from("financial_records").update(record).eq("id", existing.id);
      else await admin.from("financial_records").insert(record);
    };

    // Match strategy:
    //   1. customer id contained in stripe_customer_ids array
    //   2. exact email match (lowercased)
    //   3. else create a new profile and flag the invoice for review
    const matchOrCreateProfile = async (customerId: string, email?: string | null, name?: string | null) => {
      if (!email) {
        const cust = await stripe.customers.retrieve(customerId);
        if (typeof cust !== "string" && !cust.deleted) {
          email = (cust as Stripe.Customer).email;
          name = name || (cust as Stripe.Customer).name;
        }
      }
      const cleanEmail = email ? email.toLowerCase() : null;

      // 1. Match by stripe customer id (array)
      const { data: byCust } = await admin.from("client_profiles").select("*")
        .contains("stripe_customer_ids", [customerId]).maybeSingle();
      if (byCust) {
        const emailMismatch = !!cleanEmail && !!byCust.email && byCust.email.toLowerCase() !== cleanEmail;
        return { profile: byCust, isNew: false, mismatchReason: emailMismatch
          ? `Email mismatch: Stripe ${cleanEmail} vs profile ${byCust.email}` : null };
      }

      // 2. Match by email
      if (cleanEmail) {
        const { data: byEmail } = await admin.from("client_profiles").select("*")
          .eq("email", cleanEmail).maybeSingle();
        if (byEmail) {
          const merged = Array.from(new Set([...(byEmail.stripe_customer_ids || []), customerId]));
          await admin.from("client_profiles").update({
            stripe_customer_ids: merged,
            stripe_customer_id: byEmail.stripe_customer_id || customerId,
          }).eq("id", byEmail.id);
          return { profile: { ...byEmail, stripe_customer_ids: merged }, isNew: false, mismatchReason: null };
        }
      }

      // 3. Create new + flag
      const [first, ...rest] = (name || "").trim().split(/\s+/);
      const { data: created } = await admin.from("client_profiles").insert({
        user_id: crypto.randomUUID(),
        stripe_customer_id: customerId,
        stripe_customer_ids: [customerId],
        email: cleanEmail,
        first_name: first || "",
        last_name: rest.join(" "),
        full_name: name || cleanEmail || "Unknown (Stripe)",
        source: "stripe_webhook",
        status: "active",
      }).select().single();
      return { profile: created, isNew: true, mismatchReason: "Auto-created from unmatched Stripe invoice — please confirm" };
    };

    const upsertInvoice = async (inv: Stripe.Invoice) => {
      if (!inv.customer) return null;
      const customerId = inv.customer as string;
      const { profile, isNew, mismatchReason } = await matchOrCreateProfile(customerId, inv.customer_email, inv.customer_name);
      const needsReview = isNew || !!mismatchReason;
      const row = {
        stripe_invoice_id: inv.id,
        stripe_customer_id: customerId,
        client_profile_id: profile?.id || null,
        user_id: profile?.user_id || null,
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
        email: inv.customer_email || profile?.email || null,
        needs_review: needsReview,
        review_reason: mismatchReason,
      };
      await admin.from("client_invoices").upsert(row, { onConflict: "stripe_invoice_id" });
      return profile;
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
          const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string, { expand: ["latest_charge"] });
          const charge = pi.latest_charge as Stripe.Charge | null;
          if (charge) await upsertCharge(charge);
        }
        break;
      }
      case "customer.created": {
        const cust = event.data.object as Stripe.Customer;
        await matchOrCreateProfile(cust.id, cust.email, cust.name);
        break;
      }
      case "invoice.created":
      case "invoice.finalized":
      case "invoice.sent":
      case "invoice.updated":
      case "invoice.payment_failed":
        await upsertInvoice(event.data.object as Stripe.Invoice);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const inv = event.data.object as Stripe.Invoice;
        const profile = await upsertInvoice(inv);
        if (profile?.email) {
          await admin.functions.invoke("send-transactional-email", {
            body: {
              templateName: "payment-received",
              recipientEmail: profile.email,
              idempotencyKey: `payment-received-${inv.id}`,
              templateData: {
                firstName: profile.first_name || "",
                invoiceNumber: inv.number || "",
                amount: ((inv.amount_paid || 0) / 100).toFixed(2),
              },
            },
          });
        }
        // Fire invoice_paid event for any matching document schedules
        if (profile?.id) {
          try {
            await admin.functions.invoke("dispatch-doc-event", {
              body: { event_name: "invoice_paid", client_profile_id: profile.id },
            });
          } catch (_) { /* non-blocking */ }
        }
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: { "Content-Type": "application/json" }, status: 200 });
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500 });
  }
});
