# In-App Agreement Signing

## Context

This is Section 4 of a larger multi-section spec ("Bounty Program, Dashboard UX, and
Multi-Project-Type Document Flows") — picked to be spec'd/planned/executed first, one section
at a time, per the chosen sequencing approach. The other sections (Bounty program, dashboard
notification bubbles, document viewer/slot assignment, project-type-aware slots, AI asset
scraping, admin view-as-client, last-login display) are out of scope here and will each get
their own spec/plan cycle later.

The original spec assumed an existing signing UI needed reading before extending. Reading it
revealed the actual state is rawer than assumed:

- **`AgreementDocument.tsx`** (`src/components/AgreementDocument.tsx`) is a fully-built,
  polished component — legal agreement text (12 sections), signature capture (canvas
  draw, mouse + touch), photo ID upload, admin/client/view modes via an `editableIn` prop
  on its internal `Field` helper, autosave-on-blur (500ms debounce calling `onSave`), a
  `Submit Agreement` button (client mode), a `Save Agreement` button (admin mode), and a
  print button (`window.print()`) for locked/view mode. It takes `onSave`/`onSubmit` as
  props — the caller owns persistence.
- **It is never rendered anywhere.** `src/pages/portal/PortalAgreements.tsx` is a static
  "DocuSign Integration Coming Soon" placeholder. `src/pages/admin/ClientDetail.tsx`'s
  "Edit Agreement" dialog is a literal stub: *"Agreement builder — use the AgreementDocument
  component."* Nothing currently creates a `client_agreement_records` row for anyone.
- **Two separate, unrelated "agreement" systems exist.** The legacy `client_agreements`
  table (external link + `draft`/`sent`/`signed` status, no signing) powers today's admin
  Agreements tab (`src/pages/admin/Agreements.tsx`) and the old Google-Forms-based
  `src/components/AgreementPopup.tsx` used pre-payment on the public site. The real
  `client_agreement_records` table (migration `20260707204418_document_slots_and_agreement_records.sql`)
  has the signature/ID/lock/Stripe-deposit fields `AgreementDocument.tsx` was built for.
  These are not the same system and this spec does not merge them.
- **`protect_agreement_financial_fields` trigger exists live** (confirmed via direct SQL
  query against the database — it is not in any committed migration file, a pre-existing
  gap unrelated to this feature). Its actual body: `SECURITY DEFINER`, bypassed entirely
  for `service_role`/admin; for anyone else, raises an exception if `project_scope`,
  `services_included`, `total_investment`, `down_payment_amount`, `payment_schedule`,
  `timeline_start`, `timeline_end`, `down_payment_status`, `stripe_checkout_session_id`,
  `paid_at`, or `client_profile_id` differ from the existing row. It does **not** touch
  `is_locked` or any client-owned field (signature, name, company, address, ID path,
  `submitted_at`) — locking is enforced purely by the existing `car_client_update` RLS
  policy's `USING (... AND is_locked = false)` clause. There is currently no concept of
  limiting how many times a client can edit before or after locking.
- **The `document-actions` edge function's `share` action doesn't apply here** — it only
  operates on `admin_documents` → `client_documents` (generic admin-uploaded file sharing).
  Print/download for agreements is already covered by `AgreementDocument.tsx`'s own print
  button; nothing from `document-actions` needs to be reused.

Out of scope: the generic `DocumentViewer.tsx` component described in the larger spec's
Section 3 (not built yet — this spec adds one narrow, ID-photo-only viewer instead, see
below); any change to `admin/Agreements.tsx`, `AgreementPopup.tsx`, or the `client_agreements`
table; any change to the Stripe deposit/checkout flow (the `down_payment_status`,
`stripe_checkout_session_id`, `paid_at` fields already exist and are admin/service-role-only
per the trigger — this spec doesn't touch how a deposit gets collected, only the signing flow
around it).

## 1. Schema changes

Two additive columns on `client_agreement_records`, no breaking changes to existing rows
(there are none yet, in practice, but the change is additive regardless):

```sql
ALTER TABLE client_agreement_records ADD COLUMN sent_at timestamptz;
ALTER TABLE client_agreement_records ADD COLUMN unlock_count integer NOT NULL DEFAULT 0
  CHECK (unlock_count <= 1);
```

- `sent_at` (null = draft): the client's SELECT RLS policy (`car_client_own`) must be updated
  to additionally require `sent_at IS NOT NULL` — before that, the client has no way to see
  the row at all, letting admin compose privately with the existing autosave behavior
  already built into `AgreementDocument.tsx`.
- `unlock_count` with a DB-level check constraint (not just app logic) means a signed
  agreement can be reopened for correction **at most once, ever**, for the life of the
  record — this holds even against a direct SQL edit or a future UI bug, not just the
  admin button described below.

No changes to `protect_agreement_financial_fields` or the `is_locked`/`car_client_update`
policy — both already do the right thing once these two columns exist.

## 2. Admin side (`ClientDetail.tsx`)

Replaces the current stub "Edit Agreement" dialog (`agreementDialogOpen` state, the
`<p>Agreement builder — use the AgreementDocument component</p>` placeholder) with a real
integration:

- **No existing row**: a "Create Agreement" action inserts a new `client_agreement_records`
  row for the client (empty defaults per the table's existing `NOT NULL DEFAULT ''`
  columns), then opens `<AgreementDocument mode="admin">` against it.
- **Existing row**: opens `<AgreementDocument mode="admin">` directly.
- **Save Agreement** (already exists in the component) — no change; persists ongoing edits
  via `onSave`, works both before and after `sent_at` is set.
- **New: "Send to Client" button** — visible/enabled only while `sent_at IS NULL`. Its
  handler collects the same admin-editable fields `Save Agreement` does (via the
  component's existing `collectAdminFields()`) and updates the row with those fields plus
  `sent_at: new Date().toISOString()` in one call — so clicking Send always persists
  whatever is currently in the form, not just the flag, even if the admin hasn't blurred a
  field recently. This is the moment `PortalAgreements.tsx` starts showing anything to the
  client.
- **New: "Unlock for Correction" button** — visible/enabled only when `is_locked = true`
  AND `unlock_count = 0`. Sets `is_locked = false`, `unlock_count = 1`. Disappears from the
  UI immediately after use (and is blocked at the DB level regardless, per the check
  constraint above) — there is no path to a second unlock.
- **New: "View ID" action** — next to the existing "ID Verified ✓" text, when
  `id_document_path` is set. Opens the uploaded photo ID (`client-slot-docs` bucket) via a
  short-lived signed URL, rendered inline in a `Dialog` (`<img>` for image types, `<iframe>`
  for PDF). This is a narrow, single-purpose viewer for this one field — not the
  general-purpose `DocumentViewer.tsx` component described in the larger spec's Section 3,
  which doesn't exist yet. If that component gets built later, this can be swapped to use
  it; it isn't a blocking dependency for this spec.
- The legacy Agreements tab (`client_agreements` table, `admin/Agreements.tsx`) is untouched
  — stays exactly as it is today, a separate read-only-in-practice history list.

## 3. Client side (`PortalAgreements.tsx`)

Currently a static placeholder; becomes a real page:

- Fetch the client's own `client_agreement_records` row (`car_client_own` policy, now also
  gated on `sent_at IS NOT NULL`). No row, or `sent_at` still null (shouldn't be visible
  per RLS, but handle the empty-result case cleanly): show "No agreement yet — check back
  soon."
- Otherwise render `<AgreementDocument mode="client">` against the fetched row, wiring
  `onSave`/`onSubmit` to real Supabase update calls scoped to `.eq("id", record.id)`.
- **New: explicit "Save Progress" button for client mode.** Today client mode has no visible
  save control, only silent autosave-on-blur. Add a button that calls the same save path
  and shows a "Saved" toast — the spec's "Save — persists progress, editable, not final"
  requirement, made visible/confirmable rather than purely implicit.
- **Existing "Submit Agreement" button gets a confirmation step.** Before calling the
  existing `onSubmit`, show a confirmation dialog: *"Once submitted, this agreement is
  final and cannot be changed. Are you sure?"* On confirm, the save payload includes
  `is_locked: true` (in addition to the signature/name/ID fields `AgreementDocument.tsx`
  already collects) so locking happens atomically with submission — not a separate step
  that could be skipped or raced.

## 4. Lifecycle summary

```
Admin creates row → drafts privately (sent_at null, autosave via existing Save Agreement)
  → "Send to Client" (sent_at = now())
  → client fills in name/company/address/signature/ID (autosave + explicit Save Progress)
  → client "Submit" (confirmation dialog) → is_locked=true, submitted_at=now()
  → [optional, at most once, ever] admin "Unlock for Correction"
      → is_locked=false, unlock_count=1
      → one more edit/re-submit cycle → is_locked=true again, permanently
```

## Explicitly out of scope

- The generic `DocumentViewer.tsx` component (Section 3 of the larger spec) — the ID-photo
  viewer here is narrow and single-purpose, not a preview of building that component early.
- Any change to the legacy `client_agreements` table, `admin/Agreements.tsx`, or
  `AgreementPopup.tsx`.
- Adding a migration file to retroactively document the already-live
  `protect_agreement_financial_fields` trigger / `client_document_slots` /
  `client_agreement_records` tables — noted as a known gap, not fixed here (matches this
  session's established pattern of flagging rather than silently absorbing unrelated
  cleanup into a feature spec).
- The pre-existing `car_admin`/`cds_admin` RLS policies (`USING (true) WITH CHECK (true)`,
  no `TO` clause) share the same systemic gap already flagged twice this session (Stripe
  schema, referral/add-ons) — not fixed here, tracked separately.
