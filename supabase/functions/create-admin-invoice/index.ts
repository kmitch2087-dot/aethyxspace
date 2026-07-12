// Admin-only: create + send a Stripe invoice, store locally, notify client by email.
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const allowedOrigins = [
  "https://aethyx.space",
  "https://www.aethyx.space",
  "http://localhost:8080",
  "http://localhost:5173",
];
const getCors = (origin: string | null) => {
  const ok = origin && allowedOrigins.includes(origin);
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

    const { profileId, description, amount, daysUntilDue, finalize } = await req.json();
    const shouldFinalize = finalize !== false; // default true — preserves existing "Create & send" behavior exactly
    if (!profileId || !description || !amount) {
      return new Response(JSON.stringify({ error: "profileId, description, amount required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("client_profiles").select("*").eq("id", profileId).maybeSingle();
    if (!profile) return new Response(JSON.stringify({ error: "Profile not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if (!profile.email) return new Response(JSON.stringify({ error: "Profile has no email" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    // Ensure Stripe customer
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const list = await stripe.customers.list({ email: profile.email, limit: 1 });
      customerId = list.data[0]?.id || (await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      })).id;
      await admin.from("client_profiles").update({ stripe_customer_id: customerId }).eq("id", profileId);
    }

    // Create invoice
    const invoice = await stripe.invoices.create({
      customer: customerId,
      collection_method: "send_invoice",
      days_until_due: daysUntilDue || 14,
      description: description.slice(0, 500),
      metadata: { local_profile_id: profileId, source: "admin_dashboard" },
    });
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      amount: Math.round(amt * 100),
      currency: "usd",
      description: description.slice(0, 200),
    });
    const finalized = shouldFinalize ? await stripe.invoices.finalizeInvoice(invoice.id) : invoice;

    // Store locally
    const { data: localInv } = await admin.from("client_invoices").upsert({
      stripe_invoice_id: finalized.id,
      stripe_customer_id: customerId,
      client_profile_id: profileId,
      user_id: profile.user_id,
      invoice_number: finalized.number,
      amount_due: amt,
      amount_paid: 0,
      currency: "usd",
      status: finalized.status || (shouldFinalize ? "open" : "draft"),
      description,
      hosted_invoice_url: finalized.hosted_invoice_url ?? null,
      invoice_pdf: finalized.invoice_pdf ?? null,
      due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : null,
      email: profile.email,
    }, { onConflict: "stripe_invoice_id" }).select().single();

    // Notify client (branded email — link to portal payment page, not Stripe) — only
    // when actually finalizing. A draft save has nothing to notify the client about yet,
    // and must not be document-list-visible either (that would make it payable via the
    // portal's auto-finalize-on-pay behavior before the admin ever chose to send it).
    if (shouldFinalize) {
      // System-generated document-list entry — no real file, just a pointer so the
      // invoice shows up in the client's Documents list with an inline pay prompt.
      // Only created here (not for drafts) so a saved-but-unsent draft is never
      // client-visible or payable.
      if (localInv?.id) {
        // NB: client_documents.file_url is NOT NULL in the schema (Task 1's migration only
        // added linked_invoice_id — it didn't relax file_url) — use "" as the "no real file"
        // sentinel instead of null. All rendering branches on linked_invoice_id, not file_url,
        // so this has no effect on the portal/admin UI.
        await admin.from("client_documents").insert({
          client_profile_id: profileId,
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
    }

    return new Response(JSON.stringify({
      success: true,
      invoiceId: localInv?.id,
      stripeInvoiceId: finalized.id,
      hostedUrl: finalized.hosted_invoice_url ?? null,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[create-admin-invoice]", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
