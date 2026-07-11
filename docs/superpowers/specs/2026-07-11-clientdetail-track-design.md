# ClientDetail Track: Google Ads Slots, View-as-Client, Last-Logged-In

## Context

Sections 5, 7, and 8 of the larger multi-section spec (`docs/superpowers/specs/2026-07-11-bounty-dashboard-project-types.md`), grouped into one track and sequenced one after another (not run as separate parallel branches) because all three touch `src/pages/admin/ClientDetail.tsx`, an already-large file also touched by Sections 3, 4, and 6 — the spec's own "Execution Strategy" section explicitly calls out this file as a single-owner, sequence-don't-parallelize risk. This track runs in one worktree/branch, executed in file-order (5 → 7 → 8), while a separate, fully independent Bounty Program track (Section 1) runs concurrently in its own worktree.

Research into the current repo found several facts that meaningfully change the original spec's assumptions for all three sections:

### Section 5 (Google Ads slots)
- `client_document_slots` has **no `plan_id` or `project_type` column** and a `UNIQUE(client_profile_id, slot_type)` constraint (`supabase/migrations/20260707204418_document_slots_and_agreement_records.sql:1-13`) — if Google Ads slots reuse any existing `slot_type` value (e.g. `'plan'`), the unique constraint collides for a client who has both a Website Build and a Google Ads plan simultaneously (multi-plan-per-client already shipped 2026-07-10). **No DB migration is needed** if Google Ads slot keys are namespaced distinctly (`ga_*` prefix) — avoids a schema change entirely.
- Everything in `ClientDetail.tsx` is hardwired to Website Build: `SLOT_TYPES`/`SLOT_LABELS`/`SLOT_PHASE_NAMES` are global constants (lines 197-214), and `updateProjectPhaseForSlot` explicitly queries `.eq('project_type', 'website_build')` (lines 1198-1199) — the comment there states slot uploads "only ever map onto the client's Website Build plan," which is the actual reason Google Ads can't use slots today, not a UI gap.
- `projectTemplates.ts` has no slot-definition array today, only `defaultPhases` — needs a parallel `defaultSlots` array per `ProjectTypeTemplate`.

### Section 7 (View as Client)
- **No impersonation/client-id-override concept exists anywhere.** `ClientRoute.tsx` only checks `user` truthy — it does not check `isAdmin` and does not exclude admins.
- **Every one of the 9 portal pages independently resolves its own client_profile via an inline `.eq("user_id", user.id)` query** — `PortalOverview.tsx`, `PortalDocuments.tsx`, `PortalProjects.tsx`, `PortalTasks.tsx`, `PortalIntake.tsx`, `PortalAddOns.tsx`, `PortalAgreements.tsx`, `PortalReferrals.tsx`, `PortalMessages.tsx`, plus `PortalLayout.tsx` itself (twice, independently). There is no shared hook or context today. This means the chosen approach ("reuse portal queries with a scoped client-id override") requires touching all 9 pages plus the layout — a real, moderate-sized mechanical refactor, not a one-file change. (`PortalPay.tsx`/`PortalPayments.tsx` have no `client_profiles` references at all — they resolve identity server-side via edge functions, out of scope for this change.)
- **RLS gap directly relevant to this feature's safety claim**: `client_project_plans`, `client_project_tasks`, `client_agreement_records`, `client_document_slots`, and `client_assets` all have admin policies that are `USING(true) WITH CHECK(true)` with **no `has_role()` check and no `TO` clause** (confirmed across `20260707194649_client_assets_and_project_plans.sql`, `20260707200826_project_tasks_and_client_visibility.sql`, `20260707204418_document_slots_and_agreement_records.sql`) — meaning any authenticated user (not just admins) can already read/write any client's rows on these tables today, independent of this feature. Per your decision, this track fixes these 5 tables' admin policies to require `has_role(auth.uid(), 'admin'::app_role)` — scoped tightly to what View-as-Client depends on, not the broader referral/add-on RLS gap (which stays deferred, tracked separately).
- `client_profiles` and `client_documents` are the only two tables that already correctly gate admin access via `has_role()` — confirmed safe, no change needed there.

### Section 8 (Last Logged In)
- **No existing function exposes `auth.users.last_sign_in_at`.** `client_profiles.portal_last_login_notified_at` is a red herring — it's a 4-hour rate-limit marker for a notification email, not a reliable last-login timestamp, and should not be repurposed.
- `resolve_and_record_referral()` is the exact `SECURITY DEFINER` template to follow (explicit `REVOKE ALL FROM PUBLIC` + scoped `GRANT EXECUTE`), extended here with an internal `has_role()` check since this function returns auth data rather than just writing a record.
- `Clients.tsx`'s roster query (`supabase.from("client_profiles").select(...)`, line 72) doesn't currently join anything from `auth.users` — needs one additional batched RPC call per page load, not a per-row query.

## 1. Section 5 — Project-Type-Aware Document Slots

**`src/lib/projectTemplates.ts`**: add `defaultSlots: SlotTemplate[]` to `ProjectTypeTemplate` (`SlotTemplate = { key: string; label: string; phaseName?: string }`, mirroring `PhaseTemplate`'s shape).

- `website_build.defaultSlots`: the current 5, lifted as-is from `ClientDetail.tsx`'s existing `SLOT_TYPES`/`SLOT_LABELS`/`SLOT_PHASE_NAMES` — `site_audit` / `market_research` / `service_tier` / `plan` / `agreement`, unchanged keys and labels (no behavior change for existing clients).
- `google_ads.defaultSlots`: 5 new, namespaced keys — `ga_digital_audit` ("Google Search / Digital Presence Audit"), `ga_market_research` ("Market Research"), `ga_keyword_research` ("SEO Keyword Research"), `ga_service_tier` ("Service Tier"), `ga_plan` ("Project Plan"). No agreement-equivalent slot for Google Ads (matches the 5-item list in the original spec) — the agreement-auto-trigger logic (`checkAndTriggerAgreement`) only runs for project types whose `defaultSlots` includes an `agreement`-flagged entry (mark the website_build agreement slot with a boolean, e.g. `isAgreement: true`, rather than hardcoding the key name).

**`ClientDetail.tsx` generalization** — replace the global `SLOT_TYPES`/`SLOT_LABELS`/`SLOT_PHASE_NAMES` constants and every hardcoded `'website_build'` lookup with helpers derived from the owning plan's `project_type`:
- `getSlotTypesForPlan(plan)` → `getProjectTypeTemplate(plan.project_type).defaultSlots.map(s => s.key)`
- `getSlotLabel(plan, slotType)` / `getSlotPhaseName(plan, slotType)` → look up within that plan's `defaultSlots`
- `updateProjectPhaseForSlot(slotType, plan)` — takes the specific plan a slot belongs to as a parameter instead of re-querying `.eq('project_type','website_build')`. Since `client_document_slots` has no `plan_id`, resolve "which plan owns this slot_type" by reverse-lookup: find which project type's `defaultSlots` contains this key, then find the client's plan of that `project_type` (namespacing guarantees a slot key belongs to exactly one project type).
- **Slot seeding** (`initSlots` effect, lines 539-569): seed slots per each of the client's existing plans' project types, not unconditionally seed only the fixed website-build 5 — i.e. if a client has both a Website Build and a Google Ads plan, both slot sets get seeded.
- **Service Tier doc for Google Ads**: no new code needed — the "Assign to Slot" action already built in Section 3 (copy an `admin_documents` file into any slot) already generalizes correctly once `SLOT_TYPES`/labels are plan-derived; Kristin uploads the Google Ads service-tier reference doc once to the admin document library and assigns it into each Google Ads client's `ga_service_tier` slot the same way any other library doc gets assigned today.

No `client_document_slots` schema migration required for this section.

## 2. Section 7 — View as Client

**New hook** `src/hooks/usePortalClientProfile.tsx`:
```ts
function usePortalClientProfile(): {
  profile: ClientProfile | null;
  loading: boolean;
  isViewingAsAdmin: boolean;
}
```
Reads `useAuth()` (`user`, `isAdmin`) and a `viewAs` search param. If `viewAs` is present and `isAdmin` is true, resolves `client_profiles` by `id = viewAs` (admins already have a correctly `has_role`-gated SELECT policy on `client_profiles` — no RLS change needed for that table). Otherwise resolves by `user_id = user.id` (existing behavior, unchanged for real clients).

**Refactor** all 9 portal pages + `PortalLayout.tsx` to call this hook instead of their inline `client_profiles` lookups — each page's change is small (replace ~5-8 lines of inline query with one hook call, keep the rest of the page's own data-fetching as-is, just sourced from `profile.id` returned by the hook instead of a locally-resolved id).

**`ClientRoute.tsx`**: add a guard — if `viewAs` is present, require `isAdmin` (redirect to `/admin/login` otherwise); unchanged behavior when `viewAs` is absent.

**`ClientDetail.tsx`**: add a "View as {first name}" button opening `/portal/overview?viewAs={profile.id}` in a new browser tab (keeps the admin's own panel tab intact).

**Visual indicator + write-lockout**: a persistent banner in `PortalLayout` when `isViewingAsAdmin` is true ("Viewing as {client name} — read-only" + an exit link back to `/admin/clients/{id}`). Every write action across the 9 portal pages (document upload, agreement signing/save, task status changes, add-on requests, intake submission, message sending) must check `isViewingAsAdmin` and disable/hide itself — this is the actual read-only enforcement at the UI layer; audited page-by-page as part of implementation, not assumed.

**RLS fix (this track's scope, per your decision)**: add `has_role(auth.uid(), 'admin'::app_role)` to the existing admin policies on `client_project_plans`, `client_project_tasks`, `client_agreement_records`, `client_document_slots`, and `client_assets` (currently blanket `USING(true)`) — this makes the "admin, and only admin, can read/write any client's rows here" claim actually true, which View-as-Client's safety depends on. Scoped to exactly these 5 tables; the broader referral/add-on RLS gap remains a separate, already-tracked fast-follow.

## 3. Section 8 — Last Logged In

New `SECURITY DEFINER` function, following `resolve_and_record_referral()`'s exact pattern:
```sql
CREATE OR REPLACE FUNCTION public.get_client_last_sign_ins()
RETURNS TABLE(client_profile_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN; -- empty result set for non-admins, not an error
  END IF;
  RETURN QUERY
    SELECT cp.id, u.last_sign_in_at
    FROM client_profiles cp
    JOIN auth.users u ON u.id = cp.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_last_sign_ins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_last_sign_ins() TO authenticated;
```
One batched call per page load (not per-row) — `Clients.tsx`'s `fetchAll()` calls this once alongside its existing parallel queries and merges by `client_profile_id`; `ClientDetail.tsx` calls it once (or filters a shared cache) for the single client being viewed.

- `Clients.tsx`: render as small muted text in the existing roster row subline (near the `email · business_name` line).
- `ClientDetail.tsx`: same value shown in the client header. Admin-only — never rendered anywhere client-facing (nothing in this design touches any portal page).

## Explicitly out of scope

- The broader referral/add-on RLS gap (`referral_links`, `referrals`, `client_add_ons`, `add_on_catalog`, `referral_program_settings`) — stays deferred, tracked separately.
- Any change to `client_document_slots`' schema (no `plan_id` column added) — namespacing avoids needing it.
- Payments/Stripe-related portal pages in the View-as-Client refactor (`PortalPay.tsx`/`PortalPayments.tsx` resolve identity server-side already, untouched).
- Migration filename convention drift (already tracked separately) — new migrations in this track will use the correct convention regardless.
