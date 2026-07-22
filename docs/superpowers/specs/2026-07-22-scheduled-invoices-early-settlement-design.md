# Scheduled Invoices + Early/Partial Settlement — Design

**Date:** 2026-07-22 · **Approved by:** Kristin (in-session)

## Goal

Irving Munoz (Limitless Barbershop, Google Ads engagement) has two remaining payments
($350 month 2, $350 month 3). Create them now as future-dated invoices that
auto-email him 5 days before due, show as "scheduled / not due yet" on his portal
payments screen, and let any client settle their balance early — whole invoices or an
exact partial amount — with payments always applied oldest-invoice-first.

## Decisions (approved)

- Due dates anchor to the date he paid the first invoice (2026-07-21): **month 2 due
  Aug 20**, **month 3 due Sep 19** (paid + 30/60 days). Auto-send emails Aug 15 / Sep 14.
- Early-settle allocation is **always oldest-first** regardless of which invoices the
  client checks in the dialog — selection only sets the amount. UI states this.
- T-5 email uses the `invoice-delivery` template with the **Stripe hosted pay link**
  (no portal login — proven to work with this client) plus portal link as backup.

## Schema

- `client_invoices.scheduled_send_at timestamptz NULL` — set only on scheduled
  invoices. Manual drafts (Kristin's save-as-draft flow) keep `NULL` and stay
  client-invisible exactly as before. Scheduled drafts (`status='draft' AND
  scheduled_send_at IS NOT NULL`) are client-visible and payable early.
- New `client_invoice_payments` ledger: `id, client_profile_id, invoice_id (FK),
  payment_intent_id, amount, source ('settle'), created_at`. Unique
  `(payment_intent_id, invoice_id)` for idempotent allocation. RLS: admin ALL via
  `has_role`, client SELECT own.

## Edge functions

**`invoice-scheduler`** (verify_jwt off; own auth: `INVOICE_SCHEDULER_SECRET` bearer,
mirrored in Vault as `invoice_scheduler_secret`):
- `{action:'schedule', profileId, amount, description, dueDate, sendAt}` — creates a
  Stripe **draft** invoice (collection_method `send_invoice`, explicit `due_date`) +
  local row (`status='draft'`, `scheduled_send_at`).
- `{action:'run'}` (daily pg_cron 13:00 UTC) — for each draft whose
  `scheduled_send_at <= now()`: finalize in Stripe, update local row (number, hosted
  URL, pdf, status), insert the `client_documents` invoice pointer (mirrors
  `create-admin-invoice`), email via `invoice-delivery` (hosted URL, remaining amount).

**`settle-balance`** (client-callable, CORS + user JWT like
`create-invoice-payment-intent`):
- `{action:'quote'}` — returns payable invoices (open, or scheduled drafts), remaining
  amounts, oldest-first order.
- `{action:'intent', amount | invoiceIds}` — validates ($0.50 ≤ amount ≤ total
  remaining), creates standalone PaymentIntent (metadata `purpose='settle_balance'`),
  returns clientSecret.
- `{action:'confirm', paymentIntentId}` — verifies PI succeeded + belongs to this
  client + not yet allocated (ledger), then allocates oldest-first:
  - fully covered draft → finalize in Stripe, then `pay(paid_out_of_band)`; local
    `status='paid'`.
  - fully covered open invoice → `pay(paid_out_of_band)`.
  - partial on draft → reduce the Stripe draft's line item to the remainder (so the
    later T-5 live invoice shows only what's left).
  - partial on finalized/open → credit note for the covered portion.
  - every allocation writes a ledger row; local `amount_paid` accumulates.
- Known gap (accepted): if the browser dies between payment success and `confirm`,
  the PI is charged but unallocated — ledger idempotency makes re-running `confirm`
  safe; surfaced in Stripe dashboard by `purpose` metadata.

## Portal UI (`PortalPayments.tsx` + new `SettleBalanceDialog`)

- Hide `status='draft' AND scheduled_send_at IS NULL` (preserves manual-draft privacy).
- Scheduled rows: muted card, amber "Scheduled" badge, "Not due yet — due {date}",
  no Pay-now button. Partial coverage shows "Paid $X of $Y".
- Balance strip: paid to date / remaining / next due date.
- Card: "Want to settle your balance early or make a partial payment? Click here." →
  dialog with two modes (checkbox invoice list / exact amount), allocation preview via
  shared `src/lib/allocatePayment.ts` (unit-tested; single source of allocation order
  for UI preview — the edge function reimplements it server-side as authority),
  embedded PaymentElement (same appearance config as `PortalPay`), then `confirm` +
  refresh.

## Rollout

Migration → deploy functions → Vault/edge secret + cron job → create Irving's two
scheduled drafts via `action:'schedule'` → ship UI.
