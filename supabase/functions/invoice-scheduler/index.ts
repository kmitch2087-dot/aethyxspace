// Scheduled invoices. verify_jwt OFF — does its own auth via INVOICE_SCHEDULER_SECRET
// bearer (Vault mirror: invoice_scheduler_secret; pg_cron calls daily).
//
//   {action:'schedule', profileId, amount, description, dueDate, sendAt}
//     → create a Stripe DRAFT invoice with an explicit due date + local row with
//       scheduled_send_at. Client-visible on the portal as "Scheduled" and payable
//       early; not emailed and no document-list entry until it goes live.
//
//   {action:'run'}
//     → finalize + email every draft whose scheduled_send_at has arrived. Emails the
//       remaining amount (partial early settlements may have shrunk the draft's line).
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

Deno.serve(async (req: Request) => {
  try {
    const secret = Deno.env.get("INVOICE_SCHEDULER_SECRET");
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!secret || token !== secret) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    if (body.action === "schedule") {
      const { profileId, amount, description, dueDate, sendAt } = body;
      const amt = Number(amount);
      if (!profileId || !description || !Number.isFinite(amt) || amt <= 0 || !dueDate || !sendAt) {
        return json({ error: "profileId, amount, description, dueDate, sendAt required" }, 400);
      }
      const { data: profile } = await admin.from("client_profiles").select("*").eq("id", profileId).maybeSingle();
      if (!profile?.email) return json({ error: "Profile missing/no email" }, 400);
      if (!profile.stripe_customer_id) return json({ error: "Profile has no Stripe customer" }, 400);

      const invoice = await stripe.invoices.create({
        customer: profile.stripe_customer_id,
        collection_method: "send_invoice",
        due_date: Math.floor(new Date(dueDate).getTime() / 1000),
        auto_advance: false,
        description: String(description).slice(0, 500),
        metadata: { local_profile_id: profileId, source: "scheduled" },
      });
      await stripe.invoiceItems.create({
        customer: profile.stripe_customer_id,
        invoice: invoice.id,
        amount: Math.round(amt * 100),
        currency: "usd",
        description: String(description).slice(0, 200),
      });

      const { data: localInv, error: invErr } = await admin.from("client_invoices").upsert({
        stripe_invoice_id: invoice.id,
        stripe_customer_id: profile.stripe_customer_id,
        client_profile_id: profileId,
        user_id: profile.user_id,
        invoice_number: null,
        amount_due: amt,
        amount_paid: 0,
        currency: "usd",
        status: "draft",
        description,
        due_date: new Date(dueDate).toISOString(),
        scheduled_send_at: new Date(sendAt).toISOString(),
        email: profile.email,
      }, { onConflict: "stripe_invoice_id" }).select().single();
      if (invErr) return json({ error: invErr.message }, 500);
      return json({ ok: true, invoice: localInv });
    }

    if (body.action === "run") {
      const { data: due } = await admin
        .from("client_invoices")
        .select("*")
        .eq("status", "draft")
        .not("scheduled_send_at", "is", null)
        .lte("scheduled_send_at", new Date().toISOString());

      const results: Array<{ id: string; ok: boolean; detail?: string }> = [];
      for (const inv of due || []) {
        try {
          const stripeInv = await stripe.invoices.retrieve(inv.stripe_invoice_id);
          // Early settlement may already have finalized/paid it; sync local and move on.
          const finalized = stripeInv.status === "draft"
            ? await stripe.invoices.finalizeInvoice(stripeInv.id)
            : stripeInv;

          const { data: profile } = await admin.from("client_profiles").select("*").eq("id", inv.client_profile_id).maybeSingle();

          await admin.from("client_invoices").update({
            status: finalized.status || "open",
            invoice_number: finalized.number,
            hosted_invoice_url: finalized.hosted_invoice_url ?? null,
            invoice_pdf: finalized.invoice_pdf ?? null,
            due_date: finalized.due_date ? new Date(finalized.due_date * 1000).toISOString() : inv.due_date,
          }).eq("id", inv.id);

          // Same client-visible document pointer create-admin-invoice makes on finalize.
          await admin.from("client_documents").insert({
            client_profile_id: inv.client_profile_id,
            user_id: inv.user_id,
            title: `Invoice ${finalized.number || ""}`.trim(),
            file_url: "",
            uploaded_by: "admin",
            linked_invoice_id: inv.id,
          });

          const remaining = Math.max(0, Number(inv.amount_due) - Number(inv.amount_paid || 0));
          if (remaining > 0 && profile?.email) {
            await admin.functions.invoke("send-transactional-email", {
              body: {
                templateName: "invoice-delivery",
                recipientEmail: profile.email,
                templateData: {
                  recipientName: profile.first_name || profile.full_name || "",
                  invoiceNumber: finalized.number || "",
                  amount: `$${remaining.toFixed(2)}`,
                  dueDate: finalized.due_date
                    ? new Date(finalized.due_date * 1000).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
                    : "",
                  description: inv.description || "",
                  message: "Your next payment is coming up — here's the invoice a few days ahead so nothing sneaks up on you. Pay in one tap with the button below (no login needed), or through your portal.",
                  hostedUrl: finalized.hosted_invoice_url || `https://aethyx.space/portal/pay/${inv.id}`,
                  pdfUrl: finalized.invoice_pdf || "",
                },
                metadata: { client_profile_id: inv.client_profile_id, purpose: "scheduled_invoice" },
              },
            });
          }
          results.push({ id: inv.id, ok: true });
        } catch (e) {
          console.error("[invoice-scheduler] failed for", inv.id, e);
          results.push({ id: inv.id, ok: false, detail: String(e) });
        }
      }
      return json({ ok: true, processed: results });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error("[invoice-scheduler]", e);
    return json({ error: String(e) }, 500);
  }
});
