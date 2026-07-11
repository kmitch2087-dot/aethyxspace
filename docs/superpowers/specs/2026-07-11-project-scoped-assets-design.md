# Project-Scoped Assets (Multi-Business Foundation)

## Context

Discovered mid-session: a client can run multiple distinct businesses under one portal login — confirmed with Irving Munoz, who has a "Website Project" plan (his business "Scotty's Adventures", per his `client_profiles.business_name`) and a separate "Limitless Barbershop - Google Ads Management" plan (a different business entirely). Today, `client_assets` (logos, brand voice, taglines, etc.) is scoped only to `client_profile_id` — one shared asset pool per login, with no way to tell which business a given asset belongs to. That's wrong for a client like Irving: his two businesses need separate logos, separate brand voice, separate everything.

This is the foundation piece for three follow-on items already scoped and sequenced (not part of this spec): scraping enhancements (keywords/phrases input, contact/hours/staff extraction) becoming per-project, a client-facing Assets tab, and a document-intelligence feature. All three need "which project does this asset/scrape/document belong to" to already be answerable, which is what this spec adds.

Data check before writing this spec: only **one** client (Irving Munoz) currently has more than one project plan — the other two clients with any assets (Carvalho Wellness, Pournogravy) each have exactly one plan. `client_assets` already has a correctly-scoped client-facing SELECT RLS policy (`ca_client_own`, scoped to the client's own `client_profile_id`) — nobody has built a page that uses it, but the read-access groundwork already exists for the later client-facing Assets tab.

## 1. Schema

```sql
ALTER TABLE client_assets ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;
```

Nullable, matching this codebase's existing `plan_id` naming convention on `client_project_tasks`/`client_project_phases`/`client_project_updates` (not a new `project_plan_id` name). `ON DELETE SET NULL` rather than `CASCADE` — deleting a project plan should not delete the client's brand assets, just orphan them back to "unassigned" for manual reassignment.

**Backfill** (data migration, not just schema):
- For every client with exactly one project plan, set `plan_id` on all their existing `client_assets` rows to that plan's id.
- For Irving Munoz specifically (the one multi-plan client), leave his existing assets' `plan_id` as `NULL` — do not guess which of his two businesses each asset belongs to. He'll reassign manually via the new UI (see below).
- Clients with zero project plans (shouldn't exist in practice, since a Website Build plan is auto-created for every client, but defensively): leave `plan_id` NULL, no-op.

No RLS changes needed — `ca_admin` (admin, `has_role`-gated) and `ca_client_own` (client, own-profile-scoped) both already correctly scope by `client_profile_id`, which is unaffected by adding a nullable sibling column.

## 2. Admin UI (`ClientDetail.tsx`'s Assets tab)

The Assets tab becomes scoped to whichever project plan is currently selected — reusing the exact same `plan` variable (derived from `selectedPlanId`) that the Documents tab already uses after the Section 5 slot-generalization work. Switching the plan-switcher pills elsewhere on the page changes which project's assets the Assets tab shows, consistent with how Documents already works.

- **Add Text Asset / Upload File**: both existing flows tag the new row with `plan_id: plan.id` at creation time.
- **Scrape from URL / approved scrape items**: the scrape trigger and the approve-into-`client_assets` action both tag with the currently-selected plan's id (this spec doesn't touch the scrape feature's own logic beyond this tagging — the keywords/contact-info extraction enhancements are a separate, already-sequenced piece of work).
- **No plan selected** (a client with zero project plans — edge case, defensively handled): disable Add/Scrape actions with an explanatory message rather than silently writing `plan_id: null` for brand-new assets.
- **Unassigned assets** (existing rows with `plan_id = NULL`, e.g. Irving's pre-existing assets after backfill): shown in a small separate "Unassigned" section at the top of the Assets tab (visible regardless of which plan is currently selected, since they don't belong to any specific one yet), each with a quick "Assign to {current plan}" action to move it into the currently-selected project.

## Explicitly out of scope (separate, already-sequenced work)

- The scraping feature's keywords/phrases field and contact-info/hours/staff-name extraction — builds on top of this once it lands.
- The client-facing Assets tab (view/toggle which assets are in use) — the RLS groundwork already exists (`ca_client_own`), building the actual page is separate work.
- Document intelligence (parsing uploaded documents to auto-fill fields / generate derived documents) — separate, most novel piece, comes last.
- Any change to `client_document_slots` (already project-type-aware via namespaced keys, not `plan_id` — a different, already-shipped mechanism from the ClientDetail track work).
