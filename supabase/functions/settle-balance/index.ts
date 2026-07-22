// Client-facing early/partial settlement. Payments always allocate to the OLDEST
// unpaid invoice first (by due date), regardless of which invoices the client
// selected — selection only determines the amount. Allocation is recorded in the
// client_invoice_payments ledger (unique per payment_intent × invoice → idempotent
// confirm), and Stripe is kept consistent:
//   fully covered draft     → finalize, then pay(paid_out_of_band)
//   fully covered open      → pay(paid_out_of_band)
//   partial on draft        → shrink the draft's line item to the remainder
//   partial on finalized    → credit note for the covered portion
import Stripe from "npm:stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const allowedOrigins = [
  "https://aethyx.space",
  "https://www.aethyx.space",
  "http://localhost:8080",
  "http://localhost:5173",
];
const getCors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// deno-lint-ignore no-explicit-any
type Inv = any;

const remainingOf = (inv: Inv) => Math.max(0, Number(inv.amount_due) - Number(inv.amount_paid || 0));

// Payable = open, or a scheduled draft (manual drafts stay private/unpayable).
const payableFilter = (inv: Inv) =>
  remainingOf(inv) > 0 &&
  (inv.status === "open" || (inv.status === "draft" && inv.scheduled_send_at !== null));

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401);

    const body = await req.json().catch(() => ({}));

    const { data: profile } = await admin
      .from("client_profiles").select("*").eq("user_id", userData.user.id).maybeSingle();
    if (!profile) return json({ error: "No client profile" }, 404);

    const { data: allInvoices } = await admin
      .from("client_invoices")
      .select("*")
      .eq("client_profile_id", profile.id)
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });
    const payable = (allInvoices || []).filter(payableFilter);

    if (body.action === "quote") {
      return json({
        ok: true,
        invoices: payable.map((i: Inv) => ({
          id: i.id, invoice_number: i.invoice_number, description: i.description,
          status: i.status, due_date: i.due_date, amount_due: Number(i.amount_due),
          amount_paid: Number(i.amount_paid || 0), remaining: remainingOf(i),
          scheduled: i.status === "draft" && i.scheduled_send_at !== null,
        })),
        totalRemaining: payable.reduce((s: number, i: Inv) => s + remainingOf(i), 0),
      });
    }

    if (body.action === "intent") {
      const totalRemaining = payable.reduce((s: number, i: Inv) => s + remainingOf(i), 0);
      let amount: number;
      if (Array.isArray(body.invoiceIds) && body.invoiceIds.length > 0) {
        const chosen = payable.filter((i: Inv) => body.invoiceIds.includes(i.id));
        if (chosen.length === 0) return json({ error: "No matching invoices" }, 400);
        amount = chosen.reduce((s: number, i: Inv) => s + remainingOf(i), 0);
      } else {
        amount = Number(body.amount);
      }
      amount = Math.round(amount * 100) / 100;
      if (!Number.isFinite(amount) || amount < 0.5) return json({ error: "Minimum payment is $0.50" }, 400);
      if (amount > totalRemaining + 0.001) return json({ error: `Amount exceeds your balance of $${totalRemaining.toFixed(2)}` }, 400);

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
      const pi = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        receipt_email: profile.email || userData.user.email!,
        metadata: { purpose: "settle_balance", client_profile_id: profile.id, user_id: userData.user.id },
      });
      return json({
        ok: true,
        clientSecret: pi.client_secret,
        publishableKey: Deno.env.get("STRIPE_PUBLISHABLE_KEY") || "",
        amount: Math.round(amount * 100),
      });
    }

    if (body.action === "confirm") {
      const { paymentIntentId } = body;
      if (!paymentIntentId) return json({ error: "paymentIntentId required" }, 400);
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2025-08-27.basil" });
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (pi.metadata?.purpose !== "settle_balance" || pi.metadata?.client_profile_id !== profile.id) {
        return json({ error: "Payment not found" }, 404);
      }
      if (pi.status !== "succeeded") return json({ error: `Payment not completed (${pi.status})` }, 400);

      const { data: existing } = await admin
        .from("client_invoice_payments").select("id").eq("payment_intent_id", paymentIntentId).limit(1);
      if (existing && existing.length > 0) return json({ ok: true, alreadyAllocated: true });

      let left = Math.round(pi.amount) / 100;
      const allocations: Array<{ invoiceId: string; amount: number; nowPaid: boolean }> = [];

      for (const inv of payable) {
        if (left <= 0) break;
        const rem = remainingOf(inv);
        const portion = Math.min(rem, left);
        if (portion <= 0) continue;
        left = Math.round((left - portion) * 100) / 100;
        const nowPaid = portion >= rem - 0.001;

        const { error: ledgerErr } = await admin.from("client_invoice_payments").insert({
          client_profile_id: profile.id,
          invoice_id: inv.id,
          payment_intent_id: paymentIntentId,
          amount: portion,
          source: "settle",
        });
        if (ledgerErr) {
          console.error("[settle-balance] ledger insert failed", inv.id, ledgerErr);
          continue;
        }

        // Stripe-side consistency. Local update happens regardless — the ledger row
        // above is the source of truth for what was allocated.
        try {
          if (inv.stripe_invoice_id) {
            const sInv = await stripe.invoices.retrieve(inv.stripe_invoice_id);
            if (nowPaid) {
              const fin = sInv.status === "draft" ? await stripe.invoices.finalizeInvoice(sInv.id) : sInv;
              if (fin.status !== "paid") await stripe.invoices.pay(fin.id, { paid_out_of_band: true });
              const fresh = await stripe.invoices.retrieve(fin.id);
              await admin.from("client_invoices").update({
                invoice_number: fresh.number,
                hosted_invoice_url: fresh.hosted_invoice_url ?? null,
                invoice_pdf: fresh.invoice_pdf ?? null,
              }).eq("id", inv.id);
            } else if (sInv.status === "draft") {
              const line = sInv.lines?.data?.[0];
              const newRemainderCents = Math.round((rem - portion) * 100);
              if (line?.invoice_item && newRemainderCents > 0) {
                await stripe.invoiceItems.update(line.invoice_item as string, { amount: newRemainderCents });
              }
            } else {
              const line = sInv.lines?.data?.[0];
              if (line) {
                await stripe.creditNotes.create({
                  invoice: sInv.id,
                  lines: [{ type: "invoice_line_item", invoice_line_item: line.id, amount: Math.round(portion * 100) }],
                  memo: "Early partial payment via client portal",
                });
              }
            }
          }
        } catch (e) {
          console.error("[settle-balance] stripe sync failed for", inv.id, e);
        }

        await admin.from("client_invoices").update({
          amount_paid: Number(inv.amount_paid || 0) + portion,
          ...(nowPaid ? { status: "paid", paid_at: new Date().toISOString() } : {}),
        }).eq("id", inv.id);

        allocations.push({ invoiceId: inv.id, amount: portion, nowPaid });
      }

      return json({ ok: true, allocations, unallocated: left });
    }

    return json({ error: "unknown action" }, 400);
  } catch (err) {
    console.error("[settle-balance]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
