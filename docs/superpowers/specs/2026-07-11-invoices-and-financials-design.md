# Invoices & Financials Enhancements

## Context

Four related requests, bundled into one spec since they all touch `Invoices.tsx`/`Financials.tsx`:

1. Creating a new invoice currently only has one action — "Create & send" — which does everything atomically inside `create-admin-invoice`: create the Stripe customer/invoice, **finalize** it, write the local `client_invoices` row, and email the client. There's no way to just save it without sending.
2. No way to hide an invoice from the admin list (no `hidden`/`archived` column exists on `client_invoices` today).
3. No link between an invoice and a document — the client can only find/pay an invoice via the separate Payments tab, not via the Documents list.
4. `Financials.tsx`'s `financial_records` table is entirely income-shaped (`client_name`, `service_name`, `payment_status`) — no way to log a business expense (e.g., your own Claude/Anthropic subscription cost) for tax-season reference.

Research confirmed: invoice creation is fully Stripe-tied (no local-only "draft" concept exists yet, but Stripe invoices natively support a draft state — `stripe.invoices.create()` without calling `finalizeInvoice()` leaves it as `status: 'draft'`), there's no invoice↔document FK anywhere in the schema, and `client_invoices` has no visibility/hidden column.

## 1. Save as Draft

`create-admin-invoice` gets a new `finalize: boolean` request field (default `true`, preserving today's "Create & send" behavior exactly). When `false`:
- Skip `stripe.invoices.finalizeInvoice()` — the Stripe invoice stays in `draft` status.
- Skip the `new-invoice` email send.
- Still upsert the local `client_invoices` row (status will reflect Stripe's own `draft` status, no new local status value needed).

The "New Invoice" dialog gets a second button: **"Save"** (calls with `finalize: false`) alongside the existing **"Create & Send"** (calls with `finalize: true`, unchanged).

**Finalizing a draft later**: a draft invoice needs a way to actually get sent once you're ready. Add a new row-level action, **"Finalize & Send"** (shown only for `status: 'draft'` rows, alongside the existing dropdown actions), calling a new `invoice-actions` action that does `stripe.invoices.finalizeInvoice()` + sends the `new-invoice` email — i.e., performs exactly the second half of what "Create & Send" already does today, just deferred.

## 2. Hide Invoice

```sql
ALTER TABLE client_invoices ADD COLUMN hidden boolean NOT NULL DEFAULT false;
```

- Row-level dropdown gets a **"Hide"** / **"Unhide"** toggle (admin-only action, direct `client_invoices` update — no Stripe call, this is purely an Aethyx-side visibility flag, the invoice still fully exists in Stripe).
- The admin Invoices list filters out `hidden = true` rows by default, with a small "Show hidden (N)" toggle to reveal them — matches the "unassigned"/"show hidden" pattern already used elsewhere in this app (e.g. the Assets tab's Unassigned section).
- Hiding an invoice has no effect on the client's own view — `PortalPayments.tsx` is unaffected by this column (hiding is an admin-list decluttering tool, not a way to hide an invoice from the client who owes it).

## 3. Invoice → Document list entry with inline pay prompt

```sql
ALTER TABLE client_documents ADD COLUMN linked_invoice_id uuid REFERENCES client_invoices(id) ON DELETE CASCADE;
```

- On invoice creation (both "Save" and "Create & Send" paths), `create-admin-invoice` also inserts a `client_documents` row for the client: `title: "Invoice {invoice_number}"`, `linked_invoice_id: <the new invoice's id>`, `file_url: null` (no real file — this is a payment-prompt placeholder, not an uploaded document).
- `PortalDocuments.tsx`'s document list: a row with `linked_invoice_id` set renders differently from a normal file — instead of the usual view/download actions, it shows the invoice's amount/status and a **"Pay Now"** button linking to `/portal/pay/{invoiceId}` (reusing the existing, already-built payment page — no new payment logic). If the invoice is already paid, shows a "Paid" badge instead of the button.
- `ClientDetail.tsx`'s admin-side document list gets the equivalent read-only rendering (status + amount, no admin "pay" action — that's a client-only action).

## 4. Expense tracking on Financials

```sql
ALTER TABLE financial_records ADD COLUMN entry_type text NOT NULL DEFAULT 'income';
```

(`'income' | 'expense'`, defaulting to `'income'` so every existing row is classified correctly with zero backfill ambiguity — everything in this table today already represents client revenue.)

- The existing add/edit form gets a new "Type" toggle (Income / Expense) at the top, defaulting to Income.
- For an Expense row, `client_name` doubles as the payee/vendor field (e.g. "Anthropic") — same underlying column, just relabeled contextually in the UI ("Client" for income rows, "Vendor" for expense rows) rather than adding a second column for what's conceptually the same "who this money involves" field.
- The records list gets an Income/Expense/All filter (mirroring the Hide-invoice show/hide pattern), and the running total becomes net (income minus expenses) when "All" is selected, with income/expense subtotals shown separately.
- This is manual entry, not an Anthropic billing integration — no such API/webhook exists or is being added; you'll add each Claude invoice as its own expense row same as any other manual financial record, just tagged `expense` instead of `income`.

## Explicitly out of scope

- Any real integration with Anthropic's billing/invoicing (no such API is being called) — this is manual expense entry only.
- Changing how Stripe invoice reminders (`stripe.invoices.sendInvoice`) work — untouched.
- A general "attach any document to any invoice" feature (e.g. attaching a proposal PDF to an invoice) — this spec only covers the system-generated invoice→document-list entry described in #3, not arbitrary document attachment.
- Hiding an invoice from the CLIENT's own view — hidden only ever affects the admin list.
