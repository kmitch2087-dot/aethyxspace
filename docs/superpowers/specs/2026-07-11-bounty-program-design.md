# Bounty Program (public applications + admin approval)

## Context

Section 1 of the larger multi-section spec (`docs/superpowers/specs/2026-07-11-bounty-dashboard-project-types.md`), executed as an independent track in parallel with a second track covering Sections 5/7/8.

Research into the current repo before writing this spec found several facts that change or correct the original spec's assumptions:

- **`referral_links.client_profile_id` is `NOT NULL` and unique per client** (`supabase/migrations/20260707000000_referral_and_addons_schema.sql:16-22`) — there is no existing way to attach a link to anything but a real `client_profiles` row.
- **`client_profiles.user_id` is `NOT NULL`, with zero existing "profile without a login" pattern anywhere in the codebase.** A previous session's notes suggested promoting approved bounty applicants into a `client_profiles` row with a null `user_id` — that approach does not fit this schema safely: every RLS policy and index on `client_profiles` assumes a real authenticated user, and relaxing the constraint is a wide-blast-radius change for a narrow need. **Corrected approach**: a fully separate `bounty_applicants` table, with `referrals.referrer_profile_id` made nullable and a new nullable `referrer_bounty_applicant_id` FK added alongside it — this is exactly the alternative the original spec text itself offered ("give `bounty_applicants` its own code/link generation... have `referrals.referrer_profile_id` become polymorphic"), just confirmed as the correct choice rather than the promote-to-client-profiles idea.
- **`resolve_and_record_referral()`** (`supabase/migrations/20260710_referral_addons_completion.sql:9-46`) is the one correctly-scoped, `SECURITY DEFINER` entry point in the whole referral schema (explicit `REVOKE ALL FROM PUBLIC` + `GRANT EXECUTE TO anon, authenticated`). Extending this single function (rather than adding a second parallel RPC) keeps one entry point for "a referral code resolved on intake," matching the existing call site in `src/pages/Intake.tsx:127-137`.
- **The rest of the referral/add-on schema's RLS is broken** (`rl_service_role`, `ref_service_role`, etc. are `USING(true) WITH CHECK(true)` with no `TO` clause, granting full read/write to every role including anon) — this is the already-tracked, deliberately-deferred fast-follow item. The new `bounty_applicants` table must **not** copy this pattern; it needs a real anon-insert-only policy (mirroring `client_intakes`'s correctly-scoped "Anyone can submit intake" policy) plus a `has_role`-gated admin policy for everything else.
- **`client_intakes.status = 'waived'` is used by existing app code (`Intakes.tsx`'s `waiveFee()`) but is not a legal value under the live CHECK constraint** (`supabase/migrations/20260422164257_...sql:39-51` only allows `new|reviewing|invoice_sent|paid|archived`). This is a pre-existing, unrelated bug — but the auto-apply fee waiver this section adds writes the exact same status, so it must be fixed here or the new feature silently fails on its first use.
- **No `email_queue` table exists.** The real send path is the synchronous `send-transactional-email` edge function + Resend (`supabase/functions/send-transactional-email/index.ts`), with a `TemplateEntry` registry (`supabase/functions/_shared/transactional-email-templates/registry.ts`). `document-actions/index.ts` is the template for an admin-triggered "send an email about this record" action. Every email send in this app is an explicit admin click — nothing sends automatically on a DB state change (confirmed: `ReferralProgram.tsx`'s reward-marking actions update the DB with no email at all despite having templates registered for it). The new bounty-approval email follows this same manual-click convention; auto-applying the fee waiver does **not** auto-send an email.
- **Admin file uploads for non-client entities already have an established, safe pattern** (`admin_documents`/`admin_media`, private buckets, `has_role`-gated storage RLS, admin-authenticated only) — reusable as-is for W9 storage since only the admin ever writes this file (collected from the partner however Kristin prefers — email, DocuSign, etc. — then attached in the app). This avoids building a new public/anon-facing upload path (which would otherwise need MIME/magic-byte validation like `upload-review-photo` does).

Out of scope (per the original spec, confirmed still correct): Stripe payout automation/execution, any change to the deposit/checkout flow, a general CMS. Also out of scope for this section specifically: fixing the broader referral/add-on RLS gap beyond the new tables this section adds (tracked separately).

## 1. Schema

```sql
CREATE TABLE bounty_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship_note text,
  tax_ack boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  w9_file_path text,        -- storage path in bounty-documents bucket, admin-uploaded
  w9_uploaded_at timestamptz,
  code text UNIQUE,          -- generated on approval, mirrors referral_links.code
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

- `referrals.referrer_profile_id` → `DROP NOT NULL`.
- `referrals` gets a new nullable `referrer_bounty_applicant_id uuid REFERENCES bounty_applicants(id)`.
- CHECK constraint on `referrals`: exactly one of `referrer_profile_id` / `referrer_bounty_applicant_id` is non-null.
- `client_intakes.status` CHECK constraint: add `'waived'` to the allowed list (fixes the pre-existing latent bug in `Intakes.tsx`'s `waiveFee()`).

RLS on `bounty_applicants`:
- Anon INSERT-only policy (the public apply form), mirroring `client_intakes`'s existing "Anyone can submit" shape — no SELECT/UPDATE/DELETE for anon.
- Admin `FOR ALL` policy via `has_role(auth.uid(), 'admin'::app_role)` — real role gating, not a blanket `USING(true)`.

New storage bucket `bounty-documents` (private, admin-only read/write via `has_role`-gated storage policies), mirroring the existing `admin-documents` bucket exactly.

## 2. Public Bounty page (`/bounty`)

New route + new `Navbar.tsx` `links` array entry (single-array push, renders in both desktop/mobile menus automatically). Content: program explanation, reward amounts pulled live from `referral_program_settings` (not hardcoded), and an apply form: name, email, phone (optional), relationship/how-they-know-Aethyx note, tax-acknowledgment checkbox. Submits directly to `bounty_applicants` via the anon INSERT-only RLS policy (no edge function needed — same pattern as the existing intake form's direct anon insert).

## 3. Admin approval UI

Extend `ReferralProgram.tsx` (rename to "Bounty Program" in the page title/nav — internal file/route names can stay, this is copy-only) with a new "Applicants" section: pending list, full detail (name/email/phone/relationship note/tax ack), a W9 upload control (admin-side file input → `bounty-documents` bucket, sets `w9_file_path`/`w9_uploaded_at`), and Approve/Reject actions.

- **Approve**: generates a unique `code` (crypto-random, not the existing weak `Math.random().toString(36)` generator `referral_links` uses — this is new code, no reason to copy a known weakness), sets `status='approved'`, `reviewed_at`, `reviewed_by`. Does **not** auto-email.
- **Reject**: sets `status='rejected'`, `reviewed_at`, `reviewed_by`.
- **Send approval email** (separate explicit button, only enabled once approved): new `bounty-approved` template added to the `TemplateEntry` registry (same shape as existing `referral-signed`/`referral-payout` entries), sent via `send-transactional-email`, invoked the same way `document-actions` invokes it — admin-only auth check first.

## 4. Attribution (extending the existing function)

`resolve_and_record_referral(p_code, p_intake_id, p_referred_name, p_referred_email)` gets one additional lookup path: if `p_code` doesn't match any `referral_links.code`, check `bounty_applicants.code` (only rows with `status='approved'` — an applicant's code shouldn't resolve before approval, even though a code doesn't exist until approval anyway, this is a defensive check). If it matches, insert into `referrals` with `referrer_bounty_applicant_id` set (and `referrer_profile_id` left null) instead of the client-referrer path.

**New in this pass**: after successfully recording a referral (either path), update `client_intakes SET status = 'waived' WHERE id = p_intake_id AND status = 'new'` — this is the auto-apply fee waiver. Runs inside the same `SECURITY DEFINER` function, so it bypasses RLS the same way the rest of the function already does. Does not touch intakes that are already past `'new'` (avoids clobbering an admin who already moved the intake forward).

## 5. Client-facing surface

`PortalReferrals.tsx` needs only a copy/label change ("Bounty" instead of "Referral Program") — the existing link-fetch/display/reward-tracking logic is unchanged and already works correctly for existing clients.

## Explicitly out of scope

- Fixing `referral_links`/`referrals`/`referral_program_settings`'s existing broken RLS (`USING(true)` with no role scoping) — tracked separately, not part of this section.
- Fixing `referral_links`'s weak client-side code generator — not touched by this section (new bounty codes use a better generator, but the existing referral code path is untouched).
- Wiring the previously-dormant `referral-signed`/`referral-payout` email templates into `ReferralProgram.tsx`'s existing reward-marking actions — a related but separate gap, not part of this section.
- Any Stripe payout automation.
