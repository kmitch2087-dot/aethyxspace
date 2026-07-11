# Bounty Program, Dashboard UX, and Multi-Project-Type Document Flows

## Context

Confirmed by reading the current repo before writing this spec:

- **Referral system (existing, closed)**: `referral_program_settings`, `referral_links` (one
  row per client, `client_profile_id` is `NOT NULL` — only existing clients can have a link
  today), `referrals`. Admin tracker: `src/pages/admin/ReferralProgram.tsx`. Client page:
  `src/pages/portal/PortalReferrals.tsx`, gated by `client_profiles.referral_enabled`. No
  public application flow exists — every referrer today is already a client.
- **Add-ons (existing)**: `add_on_catalog`, `client_add_ons` (supports client self-request via
  `status = 'requested'`). Client page: `src/pages/portal/PortalAddOns.tsx`.
- **Project types (existing, built same day as this spec)**: `client_project_plans.project_type`
  (`website_build` | `google_ads`), config in `src/lib/projectTemplates.ts`
  (`PROJECT_TYPES`, `getProjectTypeTemplate()`). `usesDocumentSlots: true` only for
  `website_build` — `client_document_slots` (5 fixed slots: `site_audit`, `market_research`,
  `service_tier`, `plan`, `agreement`) only auto-links to phases for that type.
- **Agreement e-sign (existing, real)**: `client_agreement_records` (signature data, ID doc
  path, `is_locked`, `submitted_at`, Stripe deposit fields), protected by trigger
  `protect_agreement_financial_fields`. `src/pages/portal/PortalAgreements.tsx` is the client
  page — **has not been read in detail yet; whoever picks up Section 4 must read it first**
  to see what signing UI (if any) already exists before building new.
- **Document sharing (existing, real)**: `client_documents` (generic per-client file list,
  `parent_admin_doc_id` back-links to `admin_documents`), edge function
  `document-actions` supports `share` / `email` / `share_and_email` / `unshare`.
- **Portal nav** (`src/pages/portal/PortalLayout.tsx`): Overview, Messages, Documents,
  Agreements, Payments, Referrals, Add-Ons, My Project (`/portal/projects`,
  `PortalProjects.tsx` — client-facing view of the plan/phases, not yet read in detail).
- **Public nav** (`src/components/Navbar.tsx`, array `links`): Home, Services, Portfolio,
  Blog, About, Contact. No Bounty/Referral link exists publicly today.
- **Admin pages**: `src/pages/admin/ClientDetail.tsx` (~2,500 lines — plan switcher, document
  slots, add-ons, everything client-specific lives here), `Clients.tsx` (roster list),
  `ReferralProgram.tsx`, `Documents.tsx`.

Out of scope for this spec (flag, don't build): payment/payout execution for bounty rewards
(Stripe payout automation), a general-purpose CMS for arbitrary project types beyond the two
that exist, and any change to the Stripe deposit/checkout flow.

---

## 1. Bounty Program (rename + open to the public)

Rename "Referral Program" → "Bounty" everywhere client- and public-facing (nav label, page
titles, copy). Keep internal table/column names as-is (`referral_links`, `referrals`,
`referral_program_settings`) — renaming those is a pure-cosmetic risk with no user-facing
upside; add a `label`/copy layer instead of a schema rename.

**New: public Bounty page** (`/bounty`, new nav link in `Navbar.tsx`). Explains the program,
shows reward amounts (pull from `referral_program_settings`, don't hardcode), and has an
apply form for non-clients: name, email, phone (optional), how they know Aethyx / relationship
to Kristin, and (recommend, see below) a checkbox acknowledging tax reporting.

**New: application + approval flow.** `referral_links.client_profile_id` is `NOT NULL` today,
so a non-client applicant has no row to attach a link to. Needed:
- A new table, e.g. `bounty_applicants` (name, email, phone, relationship note, `status`:
  `pending`/`approved`/`rejected`, `w9_on_file boolean default false`, `applied_at`).
- Relax `referral_links` to reference either a client OR a `bounty_applicants` row (nullable
  FK to each, a check constraint requiring exactly one to be set), OR simpler: give
  `bounty_applicants` its own `code`/link generation on approval, mirroring `referral_links`
  shape, and have `referrals.referrer_profile_id` become polymorphic (referrer is either a
  client or an applicant). **Decide the exact shape during planning — this is the one piece
  of real schema design in this spec; don't wing it during implementation.**
- Admin approval UI: extend `ReferralProgram.tsx` (renamed "Bounty" tab) with a
  pending-applications list, approve/reject actions. Approving generates the link/code and
  (per the "no email yet" pattern already established elsewhere in this app) does NOT
  auto-email — admin decides when to notify, reusing the existing share/email pattern from
  `document-actions` as the template for a `bounty-approved` transactional email.

**Attribution**: identical mechanism to the existing `resolve_and_record_referral()` intake
flow (`?ref=CODE` on `/intake`) — already works for any row with a matching `code`, so once
applicant links exist in the same shape, no change needed there. Confirm this during
implementation rather than assuming.

**Client dashboards already show a referral link** via `PortalReferrals.tsx` (auto-generated
per client) — just needs the "Bounty" rename, not new plumbing.

**Discovery-call fee waiver**: `Intakes.tsx` already has a fee-waiver action (confirmed in
the add-ons/referral plan doc). Extend the resolution logic: if `client_intakes.referral_code`
resolves to a valid client or approved-partner link, auto-flag the intake as fee-waived (or
at minimum surface it prominently to the admin reviewing the intake — auto-apply is the
better UX, don't make Kristin manually notice every time).

**W9 question — direct answer, not folded into the build**: yes, collect a W9 from every
approved bounty partner, before any payout, regardless of amount. The $600/year threshold
(1099-NEC) is cumulative per payee per calendar year, not per referral — a partner who sends
several referrals will cross it even though your `first_reward_amount` ($200) and
`completion_bonus_amount` ($150) are each under $600 individually. Collecting upfront avoids
having to track down a partner in January who's already earned $650 and has an unfiled W9.
There's no downside to having one on file even if they never cross the threshold. This isn't
a substitute for accountant advice — confirm with yours on state-level 1099 thresholds (some
states are lower than $600) and on whether/how this differs for business vs. individual
payees. Practical build note: add the `w9_on_file` boolean noted above so it's tracked
per-partner, and consider a simple admin view of "who's owed what + W9 status" before money
starts moving — you'll want that visibility once this is live and not just for the paperwork.

---

## 2. Client Dashboard: Tasks Tab + Notification Bubbles

Add "Tasks" as its own top-level portal nav item (`PortalLayout.tsx`), pulling from
`client_project_tasks` (the table already wired to `client_project_plans` — **do not use**
`project_tasks`/`project_updates`, a differently-named, separate pair of tables described in
`.lovable/plan.md` for a deferred, unrelated Claude-Desktop-integration idea; confirm this
distinction during planning if there's any doubt).

Notification bubbles: small count badges on nav items (Documents, Tasks, Agreements) when
there's something new/pending the client hasn't seen — new document uploaded, task
assigned/due, agreement awaiting signature. Needs a "seen" concept per client per item type;
simplest approach is a `client_portal_seen_at` table (`client_profile_id`, `item_type`,
`last_seen_at`) updated on tab visit, compared against `updated_at`/`created_at` of the
underlying rows to compute unseen counts. Keep this generic (one small table, one query
pattern) rather than bolting a bespoke "seen" flag onto every table it might apply to.

---

## 3. Document Management: Move-to-Slot + Inline Viewer

**Move an uploaded document into a slot**: on a client's uploaded-documents list
(`ClientDetail.tsx` and/or `Documents.tsx`), add an action "Assign to slot" that lets admin
pick one of the client's current project's slots (respecting whichever slots apply for that
project's `project_type` — see Section 5) and copies/links the file into
`client_document_slots`, triggering the same phase-completion logic that direct slot-upload
already does.

**Inline embedded viewer**: clicking a document (admin or client side) must not navigate away
or open a new tab/download — it renders embedded, scrollable, within the current page, tabs/
nav still visible. Build this **once** as a shared component (e.g.
`src/components/DocumentViewer.tsx` — panel or in-page drawer, PDF via browser-native
`<iframe>`/PDF.js, images via `<img>`) and have both `ClientDetail.tsx` (admin) and
`PortalDocuments.tsx`/`PortalAgreements.tsx` (client) consume it, rather than two parallel
implementations. Build this component first, standalone — Section 4's agreement viewer and
Section 3's document list both depend on it.

---

## 4. Agreement Signing Flow

**Read `PortalAgreements.tsx` in full before starting this section** — establish what already
exists (if anything) vs. what's net-new.

Requirements: a signing box (draw or type-style signature capture), a document-upload box
(for the client to attach a countersigned/ID doc if relevant — the schema already has an ID
document path field on `client_agreement_records`), typed full name field, date field. Two
actions:
- **Save** — persists progress, editable, not final.
- **Save and Send** — before submitting, show a confirmation warning that once sent, the
  agreement cannot be changed. Per your existing intent, exactly **one edit is allowed, ever**
  — the doc becomes locked after that single edit. `client_agreement_records.is_locked` and
  the `protect_agreement_financial_fields` trigger already exist for the "signed and locked"
  state; this section needs to add the "one edit allowed" counter/rule on top (a small
  `edit_count` column with a check constraint, or trigger logic capping it at 1) — the
  current trigger blocks post-lock edits but doesn't yet track/limit a single pre-lock edit.

All documents (agreements included, pre- and post-signing) need a share action exposing
print/download — this already exists as the `share` action in `document-actions`; the
agreement viewer just needs to surface that same action, not reinvent it.

---

## 5. Project-Type-Aware Document Slots (Google Ads)

Extend `src/lib/projectTemplates.ts` so slot definitions (not just phases) are
per-project-type — today `client_document_slots` has one fixed set of 5 slot types used only
by `website_build`. For `google_ads`, add a parallel slot set with these labels:

- "Site Audit" → **"Google Search / Digital Presence Audit"**
- "Market Research" → unchanged (applies as-is)
- **new**: "SEO Keyword Research"
- "Service Tier" → unchanged in purpose, but sourced from Kristin's Google Ads service-tier
  document (she'll provide/upload it as the reference doc admins attach when filling this
  slot — no schema change needed beyond making sure the existing document-library reference
  flow works for this slot on a `google_ads` plan)
- "Project Plan" → unchanged

Implementation-wise this likely means: add a `slotType` per `ProjectTypeTemplate` (an array
of `{ key, label }` mirroring `PhaseTemplate`), set `usesDocumentSlots: true` for
`google_ads` too, and make every place that currently hardcodes the 5 website-build slot
labels (`SLOT_LABELS`/`SLOT_TYPES`/`SLOT_PHASE_NAMES` in `ClientDetail.tsx`) look up labels
from the plan's `project_type` instead. This is the same file/pattern already touched when
`usesDocumentSlots` was introduced today — read that code before changing it.

---

## 6. AI URL Scraping → Auto-Populate Assets

Feasible, and a reasonable scope: a new admin-only action ("Scrape from URL") that takes a
client's website URL, fetches the page(s), extracts assets (logo, images, brand colors, key
copy/text blurbs) and populates `admin_media`/`client-assets` storage + metadata for admin
review before anything goes live on their profile — **review step is important**, don't
auto-publish scraped content directly into a client-facing area. Recommended approach: a new
edge function using a fetch + HTML-parse pass (no need for a heavy headless-browser
dependency unless the target sites are JS-rendered SPAs — check a few real client sites
first) to pull `<img>` sources, OpenGraph meta tags, and visible text, then hands results to
Claude (via the Anthropic API, using an existing secret/key if one is already configured for
this project, or a new `ANTHROPIC_API_KEY` secret if not) to summarize/tag before staging them
for admin approval. Treat this as its own isolated workstream — new edge function, small UI
hook into the existing Assets tab, no dependency on the other sections.

---

## 7. Admin "View as [Client]"

A button on `ClientDetail.tsx` ("View as {first name}") that opens the client portal exactly
as that client would see it. Cleanest approach given existing auth (`useAuth`, admin-role
check via `user_roles`): an admin-only "impersonation" mode that scopes portal data queries
to the target `client_profile_id` while keeping the real admin session — i.e. a query-param
or context flag (`?viewAs=clientId`) read by `PortalLayout.tsx`/the portal pages, gated so it
only ever activates for an authenticated admin, never persisted, never changes what RLS
actually permits (RLS still enforces via the admin's real `auth.uid()` + a security-definer
read path, or via read-only service-role queries scoped server-side) so this can't become a
privilege-escalation bug. Do not implement this as literally logging in as the client (no
credential/session swap) — a view-only overlay is both simpler and safer.

---

## 8. Admin-only "Last Logged In"

Display under each client's name in `Clients.tsx` (and/or `ClientDetail.tsx` header) —
**admin-only, never client-visible**. Source: Supabase `auth.users.last_sign_in_at`, which is
not directly queryable via RLS from client code. Needs either (a) a `SECURITY DEFINER` Postgres
function/view exposing `last_sign_in_at` joined to `client_profiles.user_id`, callable only by
admins (gate with `has_role(auth.uid(), 'admin'::app_role)` inside the function body, the
existing standard pattern in this schema), or (b) an edge function using the Supabase admin
API. Prefer (a) — consistent with existing patterns (`resolve_and_record_referral`) and one
less edge function to maintain.

---

## Execution Strategy (read before starting implementation)

Several sections above touch the **same large files** — running them as fully independent
parallel subagents risks conflicting edits in `ClientDetail.tsx` (~2,500 lines, touched by
Sections 3, 5, 7, 8) and `PortalLayout.tsx` (touched by Sections 1's nav rename and Section 2's
new Tasks tab). Recommended grouping to actually get the token-efficiency and speed benefit of
parallelism without merge conflicts:

**Safe to fully parallelize (separate/mostly-new files):**
- Section 1 (Bounty: new table(s), new public page, new nav link, admin approval UI extension)
- Section 6 (AI asset scraping: new edge function + isolated Assets UI hook-in)
- Section 3's `DocumentViewer.tsx` component build (standalone, no existing-file edits yet)

**Sequence, don't parallelize (single owner per file, one task list, worked in order):**
- Everything touching `ClientDetail.tsx`: Section 3's "assign to slot" action, Section 5's
  slot-label lookups, Section 7 (View as Client button), Section 8 (last-login display).
  One subagent, one pass, in that order — each is a small, additive change to the same file.
- Everything touching `PortalLayout.tsx`: Section 1's nav rename + Section 2's new Tasks tab
  + notification-bubble wiring. One subagent, one pass.
- Section 4 (agreement signing) depends on `DocumentViewer.tsx` existing — run after that
  component lands, not concurrently with it.

Suggest using this repo's existing spec → plan → execute convention (see
`docs/superpowers/plans/2026-07-10-referral-addons.md` for the format) — have Claude Code turn
this spec into a dated plan file with exact diffs first, then execute via its
subagent-driven-development skill using the grouping above rather than one-subagent-per-section.

After implementation: regenerate `src/integrations/supabase/types.ts` via Supabase MCP for any
new/changed tables, and verify with `npx tsc --noEmit -p .` (this repo has no Supabase-backed
component tests — manual `npm run dev` verification is the established pattern here).
