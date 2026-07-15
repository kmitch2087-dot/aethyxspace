// Client-callable: after a client signs their agreement, create the down-payment
// Stripe invoice (idempotently — at most one per agreement record) so they can be
// sent straight to the portal payment page. Mirrors create-admin-invoice's Stripe +
// local-storage flow, but authorizes the signing client instead of an admin.
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const cors = getCors(origin);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);

    const { recordId } = await req.json();
    if (!recordId) return json({ error: "recordId required" }, 400, cors);

    const { data: record } = await admin
      .from("client_agreement_records")
      .select("*")
      .eq("id", recordId)
      .maybeSingle();
    if (!record) return json({ error: "Agreement not found" }, 404, cors);

    const { data: profile } = await admin
      .from("client_profiles")
      .select("*")
      .eq("id", record.client_profile_id)
      .maybeSingle();
    if (!profile || profile.user_id !== userData.user.id) {
      return json({ error: "Not your agreement" }, 403, cors);
    }

    if (!record.is_locked || !record.client_signed_at) {
      return json({ error: "Agreement is not signed yet" }, 400, cors);
    }
    // Idempotent: the invoice was already created (e.g. retry after a redirect hiccup).
    if (record.down_payment_invoice_id) {
      return json({ ok: true, invoiceId: record.down_payment_invoice_id, existing: true }, 200, cors);
    }
    const amt = Number(record.down_payment_amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return json({ ok: true, invoiceId: null, reason: "No down payment amount set" }, 200, cors);
    }
    if (!profile.email) return json({ error: "Profile has no email" }, 400, cors);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const list = await stripe.customers.list({ email: profile.email, limit: 1 });
      customerId = list.data[0]?.id || (await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      })).id;
      await admin.from("client_profiles").update({ stripe_customer_id: customerId }).eq("id", profile.id);
    }

    const description = `First payment — ${record.client_company || profile.business_name || "project"} (due upon signing)`;
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: 7,
      description: description.slice(0, 500),
      metadata: { local_profile_id: profile.id, source: "agreement_signing", agreement_record_id: record.id },
    });
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(amt * 100),
      currency: "usd",
      description: description.slice(0, 200),
    });
    const finalized = await stripe.invoices.finalizeInvoice(invoice.id);

    const { data: localInv } = await admin.from("client_invoices").upsert({
      stripe_invoice_id: finalized.id,
      stripe_customer_id: customerId,
      client_profile_id: profile.id,
      user_id: profile.user_id,
      invoice_number: finalized.number,
      amount_due: amt,
      amount_paid: 0,
      currency: "usd",
      status: finalized.status || "open",
      description,
      hosted_invoice_url: finalized.hosted_invoice_url ?? null,
      invoice_pdf: finalized.invoice_pdf ?? null,
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
      email: profile.email,
    }, { onConflict: "stripe_invoice_id" }).select().single();

    if (localInv?.id) {
      await admin.from("client_agreement_records")
        .update({ down_payment_invoice_id: localInv.id })
        .eq("id", record.id);
      // Same pointer-only document entry create-admin-invoice makes, so the invoice
      // also shows in the client's Documents list with the inline pay prompt.
      await admin.from("client_documents").insert({
        client_profile_id: profile.id,
        user_id: profile.user_id,
        title: `Invoice ${finalized.number || ""}`.trim(),
        file_url: "",
        uploaded_by: "admin",
        linked_invoice_id: localInv.id,
      });
    }

    const portalPaymentUrl = `${origin}/portal/pay/${localInv?.id || ""}`;
    await admin.functions.invoke("send-transactional-email", {
      body: {
        templateName: "new-invoice",
        recipientEmail: profile.email,
        idempotencyKey: `new-invoice-${finalized.id}`,
        templateData: {
          firstName: profile.first_name || "",
          invoiceNumber: finalized.number,
          amount: amt.toFixed(2),
          description,
          payUrl: portalPaymentUrl,
        },
      },
    });

    return json({ ok: true, invoiceId: localInv?.id ?? null }, 200, cors);
  } catch (err) {
    console.error("[agreement-signed-actions]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500, cors);
  }
});
