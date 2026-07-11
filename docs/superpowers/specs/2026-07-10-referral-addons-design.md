# Referral Program Completion & Add-On Services Client Page

## Context

`Aethyx_Referral_AddOns.docx` (agency growth strategy doc, prepared by a prior Claude Code
session) describes a referral program and an add-on services catalog. Most of this is
already built:

- **Referral program**: fully implemented. `referral_program_settings`, `referral_links`,
  `referrals` tables (migration `20260707000000_referral_and_addons_schema.sql`); admin
  tracker at `src/pages/admin/ReferralProgram.tsx`; client-facing page at
  `src/pages/portal/PortalReferrals.tsx`. Reward amounts match the doc exactly.
- **Add-on catalog admin tooling**: fully implemented. Catalog CRUD at
  `src/pages/admin/AddOns.tsx`; per-client assignment/status/price management inside
  `src/pages/admin/ClientDetail.tsx` (uses `client_add_ons` table).

What's missing, and what this spec covers:

1. Admin control over which clients get referral-program access (currently automatic for
   everyone).
2. Capturing "who referred you" on the public intake form, and auto-linking it to the
   referrer's record.
3. A client-facing page where clients can browse the add-on catalog and request services
   (no such page exists — the catalog and per-client assignment tables exist, but nothing
   in the client portal surfaces them).

Out of scope: any billing/payment integration for add-ons, a new admin table/page for
add-on requests (reusing `client_add_ons` instead — see below), and the doc's "client
portal as revenue" positioning (that's internal business strategy, not a feature).

## 1. Referral access control

**Schema**: add `referral_enabled boolean not null default false` to `client_profiles`.

**Admin**: a toggle in `ClientDetail.tsx`, next to the existing per-client status controls.

**Client portal**:
- `PortalLayout.tsx` nav hides the "Referrals" item when the client's `referral_enabled`
  is false.
- `PortalReferrals.tsx` checks the flag before auto-generating a `referral_links` row;
  if disabled, it renders a simple "not enabled for your account" message instead.

Existing `referral_links`/`referrals` rows are untouched by this change — the flag only
gates future visibility and link generation, not historical data.

## 2. Intake referral capture

**Silent capture via referral link** (`https://aethyx.space/intake?ref=CODE`, a URL
format the referral page already generates but which nothing currently reads):

- Add `referral_code text` column to `client_intakes`.
- `Intake.tsx` reads the `ref` query param on mount and includes it in the
  `client_intakes` insert payload.
- New Postgres function, `SECURITY DEFINER`, narrowly scoped to this one job:

  ```sql
  create or replace function public.resolve_and_record_referral(
    p_code text,
    p_intake_id uuid,
    p_referred_name text,
    p_referred_email text
  ) returns void
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_referrer_id uuid;
  begin
    if p_code is null or length(trim(p_code)) = 0 then
      return;
    end if;

    select client_profile_id into v_referrer_id
    from referral_links
    where code = p_code;

    if v_referrer_id is null then
      return;
    end if;

    insert into referrals (
      referrer_profile_id, referred_email, referred_name, status, notes
    ) values (
      v_referrer_id, p_referred_email, p_referred_name, 'pending',
      'Auto-created from intake ' || p_intake_id
    );
  end;
  $$;

  revoke all on function public.resolve_and_record_referral(text, uuid, text, text) from public;
  grant execute on function public.resolve_and_record_referral(text, uuid, text, text) to anon, authenticated;
  ```

  `Intake.tsx` calls this via `supabase.rpc(...)` right after the `client_intakes` insert
  succeeds, fire-and-forget (same pattern as the existing notification emails — don't
  block the user on it). This function is the only way anon/authenticated roles touch
  `referral_links`/`referrals` from the intake flow; no new broad SELECT/INSERT policies
  are added to those tables.

  Repeat submissions with the same code create multiple `pending` referrals rather than
  being de-duplicated — admin already reviews and advances/cancels referrals manually in
  `ReferralProgram.tsx`, so no de-dup logic is added here (YAGNI).

**Visible fallback question** (for people who didn't use a referral link):

- Seed one new row into `intake_form_fields`: label "Who referred you to Aethyx?
  (optional)", `field_key: referred_by_name`, `section: about`, `required: false`.
- No code change needed — `Intake.tsx` already renders whatever's active in
  `intake_form_fields`, and the answer lands in the existing `responses` jsonb column
  like every other field. Admin reconciles this manually via the existing "Add Referral"
  dialog in `ReferralProgram.tsx` — it's free text, not a resolvable code, so it isn't
  auto-linked.

**Admin visibility**: `Intakes.tsx` shows a "Referred by: {name}" line when
`referral_code` resolved to a client (join `referral_links` → `client_profiles` on
`referral_code`).

## 3. Add-on services client page

**Reuse `client_add_ons`, don't add a new table.** It already has the right shape
(`client_profile_id`, `add_on_catalog_id`, `custom_name`, `price`, `status`, `notes`) and
`ClientDetail.tsx` already lists every row for a client regardless of status.

- New status value `requested` (alongside existing `active`/`paused`/`cancelled`).
- New RLS policy: authenticated clients may `INSERT` into `client_add_ons` only where
  `client_profile_id` resolves to their own profile, `status = 'requested'`, and
  `price is null` — they cannot self-assign a priced/active add-on.
- New route `/portal/add-ons` (`PortalAddOns.tsx`) + nav item in `PortalLayout.tsx`.
  Lists active `add_on_catalog` items grouped Retainers vs. One-Time (matching the doc's
  structure). For each item, the page checks the client's existing `client_add_ons` rows
  for that `add_on_catalog_id`: if one exists with status `active`, show an "Active"
  badge; if `requested`, show a disabled "Requested — Kristin will follow up" state; if
  neither (or the only existing row is `cancelled`/`paused`), show an enabled "Request
  this" button that inserts the `requested` row. This prevents duplicate open requests
  for the same catalog item.
- `ClientDetail.tsx`: add `requested` as a status option in the existing add-on edit
  dialog/select and give it a distinct badge color, consistent with how referral
  statuses are styled in `ReferralProgram.tsx`.
- Small badge/count on the admin `Clients` nav item (`AdminLayout.tsx`) showing the
  count of `client_add_ons` rows with `status = 'requested'` across all clients, so
  requests don't go unnoticed.

## Data flow summary

```
Client shares referral link (?ref=CODE)
  → new lead opens /intake?ref=CODE
  → submits form → client_intakes row (referral_code stored)
  → resolve_and_record_referral() RPC → referrals row (status: pending), if code valid
  → admin sees it in ReferralProgram.tsx tracker, advances status as deal progresses

Existing client → /portal/add-ons
  → sees catalog + their active add-ons
  → clicks "Request this" → client_add_ons row (status: requested, price: null)
  → admin sees badge on Clients nav → opens ClientDetail → sets price, flips to active
```

## Migration files

One new migration covering: `client_profiles.referral_enabled` column,
`client_intakes.referral_code` column, the `resolve_and_record_referral` function, the
new `client_add_ons` RLS insert policy, and the `intake_form_fields` seed row.
