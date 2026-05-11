// Admin-only: Stripe-style actions on invoices: send, mark-paid, mark-uncollectible, void, refund, email-to-client
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

Deno.serve(async (req) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return j({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return j({ error: "Admin only" }, 403, cors);

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });

    const body = await req.json();
    const action = String(body.action || "");
    const invoiceRowId = String(body.invoiceRowId || "");
    if (!action || !invoiceRowId) return j({ error: "action and invoiceRowId required" }, 400, cors);

    const { data: row, error: rowErr } = await admin.from("client_invoices").select("*").eq("id", invoiceRowId).maybeSingle();
    if (rowErr || !row) return j({ error: "Invoice not found" }, 404, cors);
    const sid = row.stripe_invoice_id;

    if (action === "send_reminder") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      const inv = await stripe.invoices.sendInvoice(sid);
      await syncRow(admin, row.id, inv);
      return j({ success: true }, 200, cors);
    }

    if (action === "mark_paid") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      const inv = await stripe.invoices.pay(sid, { paid_out_of_band: true });
      await syncRow(admin, row.id, inv);
      return j({ success: true }, 200, cors);
    }

    if (action === "mark_uncollectible") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      const inv = await stripe.invoices.markUncollectible(sid);
      await syncRow(admin, row.id, inv);
      return j({ success: true }, 200, cors);
    }

    if (action === "void") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      const inv = await stripe.invoices.voidInvoice(sid);
      await syncRow(admin, row.id, inv);
      return j({ success: true }, 200, cors);
    }

    if (action === "refund") {
      if (!sid) return j({ error: "Not a Stripe invoice" }, 400, cors);
      const inv = await stripe.invoices.retrieve(sid, { expand: ["charge", "payment_intent"] });
      const chargeId = (inv.charge as any)?.id || (typeof inv.charge === "string" ? inv.charge : null);
      const piId = (inv.payment_intent as any)?.id || (typeof inv.payment_intent === "string" ? inv.payment_intent : null);
      const amount = body.amount ? Math.round(Number(body.amount) * 100) : undefined;
      let refund;
      if (chargeId) refund = await stripe.refunds.create({ charge: chargeId, amount });
      else if (piId) refund = await stripe.refunds.create({ payment_intent: piId, amount });
      else return j({ error: "No charge to refund" }, 400, cors);
      // Re-sync
      const fresh = await stripe.invoices.retrieve(sid);
      await syncRow(admin, row.id, fresh);
      return j({ success: true, refundId: refund.id }, 200, cors);
    }

    if (action === "email_to_client") {
      const recipient = String(body.recipientEmail || row.email || "").trim();
      if (!recipient) return j({ error: "Recipient email required" }, 400, cors);
      const subject = body.subject ? String(body.subject).slice(0, 200) : undefined;
      const message = body.message ? String(body.message).slice(0, 4000) : "";

      // Resolve client name
      let recipientName = "";
      if (row.client_profile_id) {
        const { data: p } = await admin.from("client_profiles").select("first_name, full_name").eq("id", row.client_profile_id).maybeSingle();
        recipientName = p?.first_name || p?.full_name?.split(" ")[0] || "";
      }

      const amountStr = `$${Number(row.amount_due || 0).toFixed(2)}`;
      const dueDate = row.due_date ? new Date(row.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;

      const inv = await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "invoice-delivery",
          recipientEmail: recipient,
          idempotencyKey: `invoice-email-${row.id}-${Date.now()}`,
          templateData: {
            recipientName,
            invoiceNumber: row.invoice_number || undefined,
            amount: amountStr,
            dueDate,
            description: row.description || undefined,
            message,
            hostedUrl: row.hosted_invoice_url || "",
            pdfUrl: row.invoice_pdf || undefined,
          },
        },
      });
      if (inv.error) return j({ error: inv.error.message }, 500, cors);
      return j({ success: true }, 200, cors);
    }

    return j({ error: "Unknown action" }, 400, cors);
  } catch (err) {
    console.error("[invoice-actions]", err);
    return j({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});

async function syncRow(admin: any, id: string, inv: any) {
  await admin.from("client_invoices").update({
    status: inv.status,
    amount_paid: (inv.amount_paid || 0) / 100,
    amount_due: (inv.amount_due || 0) / 100,
    paid_at: inv.status === "paid" ? new Date((inv.status_transitions?.paid_at || Date.now() / 1000) * 1000).toISOString() : null,
    hosted_invoice_url: inv.hosted_invoice_url || null,
    invoice_pdf: inv.invoice_pdf || null,
  }).eq("id", id);
}

function j(body: any, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
