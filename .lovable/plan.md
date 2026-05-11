
## Goal

Turn `/admin/clients` into a real CRM hub. Each client gets a dedicated detail page where you see and edit everything sourced from across the site (profile, invoices, documents, agreements, intakes, messages). Stripe stays the source of truth for billing, with smart matching and a review queue for ambiguous cases.

## 1. Merge Aaron's two profiles

One-time data fix:
- Keep `36dec941…` (ahearnmanagement@icloud.com) as primary.
- Move all `client_invoices` from the `ahearnrecovery` profile onto the primary.
- Add `cus_URe4RZ33ffjKTh` to the primary as a secondary Stripe customer (see schema change below).
- Delete the duplicate `client_profiles` row.

## 2. Schema changes (one migration)

- `client_profiles`: add `stripe_customer_ids text[]` (multi-customer support), `notes text`, `status text default 'active'`, `archived_at timestamptz`. Backfill `stripe_customer_ids` from existing `stripe_customer_id`.
- `client_invoices`: add `needs_review boolean default false`, `review_reason text`.
- New `client_projects` table for the projects piece you mentioned earlier (id, client_profile_id, name, lovable_url, status, notes, timestamps) with admin-only + owner RLS, so the detail page can list projects too.
- RLS: admin-manage on all; client read-own where applicable.

## 3. Dedup rule (going forward)

Auto-merge **only on exact email match (case-insensitive)**. Different email = always a new profile, even if name matches. No name-based fuzzy merging.

## 4. Stripe → profile matching (updated webhook + sync logic)

When an invoice arrives:
1. Match by `stripe_customer_id` against `client_profiles.stripe_customer_ids` (array contains).
2. Else match by exact `customer_email` (lowercased) against `client_profiles.email`.
3. **Both fail** → auto-create a new profile (source `stripe_webhook`), attach the invoice, and set `needs_review = true` with `review_reason = 'auto-created from unmatched Stripe invoice'`. The invoice + profile both surface a yellow "Needs review" badge in admin.
4. Email mismatch (customer ID matches existing profile but email differs from profile.email) → attach invoice normally, but flag `needs_review` with reason `'email mismatch: <stripe email> vs <profile email>'`.

## 5. Admin Clients list redesign (`/admin/clients`)

- Searchable table (name, email, # invoices, total billed, status, "Needs review" badge).
- "+ New Client" button (top right).
- Each row links to `/admin/clients/:id`.
- Banner at top if any invoices have `needs_review = true`.

## 6. Client detail page (`/admin/clients/:id`) — new

Tabbed layout, all editable inline:

- **Profile** — first/last/full name, email, phone, business, billing address, notes, status. Manage secondary emails + linked Stripe customer IDs (add/remove).
- **Invoices** — all `client_invoices` for this profile. "Needs review" rows highlighted with reason; admin can confirm-and-clear or reassign to another client. Button "Create new invoice" (uses existing `create-admin-invoice`).
- **Documents** — list/upload/delete (`client-documents` bucket, existing flow).
- **Agreements** — pulled from `client_agreements` matched by email.
- **Intakes** — matching `client_intakes` rows (by email).
- **Messages** — `client_messages` history.
- **Projects** — placeholder for the projects feature (Lovable URL link manager). Adds rows to `client_projects`.
- **Actions** sidebar: Resend portal invite, Create Stripe customer (if none), Archive client.

## 7. New Client flow (one click)

A "+ New Client" dialog asks: first name, last name, email, phone (optional), business (optional).

On submit, a new `create-client` edge function does **all** of the following atomically:
1. Create `client_profiles` row (with sentinel `user_id`).
2. Create the Stripe customer; store `id` in `stripe_customer_ids`.
3. Call `provision-client-portal` (existing) → creates Supabase auth user + sends branded portal invite email so they can log in to view documents/invoices.
4. Redirect admin to the new client's detail page.

Failures roll back gracefully (Stripe customer creation failure ≠ profile failure; surface warnings instead).

## 8. Edge function changes

- **New** `create-client` — orchestrates profile + Stripe customer + portal invite.
- **New** `merge-client-profiles` — admin-only; takes `primaryId` + `secondaryId`, moves invoices, merges customer IDs, deletes secondary. Used for the Aaron one-time merge and any future merges from the UI.
- **Update** `stripe-webhook` and `sync-stripe-customer` — array-based customer ID matching, mismatch flagging, `needs_review` writes.

## Technical details

- All new tables/columns use HSL design tokens in any new UI; reuse existing shadcn `Card`, `Tabs`, `Dialog`, `Table` components.
- Routes: add `/admin/clients/:id` in `App.tsx` inside the existing `AdminRoute` wrapper.
- The admin-only merge function uses service role and the same auth check pattern as `sync-stripe-customer` (verify `user_roles.role = 'admin'`).
- Webhook: when both `email` and `stripe_customer_id` are missing from the lookup, profile is still created so nothing is lost — the review queue is the fallback, not data loss.
- One-time Aaron merge runs as the first action after migration, calling `merge-client-profiles` server-side (or via a one-shot SQL block in a migration since it's a known fix).

## Out of scope for this round (queued for next)

- Projects page that loads the live Lovable URL with floating buttons — schema is added now so we can build the UI next round.
- 1-to-1 email-from-portal feature.
- Financials expansion (waiting for payment, net/gross, tax estimates).
