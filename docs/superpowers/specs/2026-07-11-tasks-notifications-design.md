# Client Tasks Tab + Notification Bubbles

## Context

This is Section 2 of the larger multi-section spec
(`docs/superpowers/specs/2026-07-11-bounty-dashboard-project-types.md`), done one section at a
time. Sections 3 (DocumentViewer) and 4 (agreement signing) already shipped.

Reading the current repo before writing this spec found the section overlaps more with
existing code than assumed, and surfaces a real regression from earlier the same day:

- **`/portal/projects` (`PortalProjects.tsx`) already has a client-facing task list.** An
  "Action Items for You" section renders `client_project_tasks` filtered to
  `assigned_to = 'client'`, with a working mark-complete button. This directly contradicts the
  older backlog note ("Client portal — Projects/Tasks view... Not yet built") — the view exists,
  it's just embedded in the project-overview page rather than being its own nav item.
- **Real bug: `PortalProjects.tsx` fetches the client's plan with `.maybeSingle()`, no project-type
  filter.** Supabase's `.maybeSingle()` errors when more than one row matches. Earlier the same
  day, multi-plan-per-client support shipped (a client can now have both a `website_build` and a
  `google_ads` `client_project_plans` row). Any client with two plans will currently see this
  entire page fail to load correctly. Since the new Tasks feature hangs off the same
  plan/task relationship, this needs fixing as part of this section, not left broken.
- **Confirmed `client_project_tasks` (not `project_tasks`) is the right table.**
  `.lovable/plan.md` describes a `project_tasks`/`project_updates`/`client_projects` schema for
  a separate, deferred, never-built Claude Desktop integration edge function — unrelated,
  not built, not to be confused with the real, already-shipped
  `client_project_tasks`/`client_project_updates`/`client_project_plans` tables this section
  uses.
- Admin already manages tasks per-plan via an "Add Task" flow in `ClientDetail.tsx`'s Plan tab
  (existing `addTask` function, unaffected by this section).

Decided during brainstorming:
- Extract the existing task section out of `PortalProjects.tsx` into a new, dedicated
  `PortalTasks.tsx` + nav item, rather than duplicating it in two places.
- The client-facing views (both the fixed `PortalProjects.tsx` and the new `PortalTasks.tsx`)
  show data from **all** of the client's plans together in one list — no plan-switcher on the
  client side, unlike admin's. This is both the simpler UX choice and the actual fix for the
  `.maybeSingle()` bug (query for all matching rows instead of assuming one).
- Notification bubbles use one generic mechanism (a `client_portal_seen_at` table) for
  Documents and Agreements (pure "is there something new since last visit"), but Tasks combines
  that with a second, independent trigger: tasks due within 48 hours, regardless of whether
  they've been "seen" before (since approaching urgency should resurface even for an
  already-seen task).

Out of scope: any change to `ClientDetail.tsx`'s admin-side task management (`addTask`, the Plan
tab's task list) — this section only touches the client-facing portal and the new seen-tracking
table. No live/real-time badge updates — matching the already-established, accepted pattern
from the admin add-on-request badge (fetched once on mount, updates on reload).

## 1. Fix the multi-plan bug in `PortalProjects.tsx`

Replace the `.maybeSingle()` plan fetch with a query for all of the client's plans:

```typescript
const { data: plansData } = await (supabase as any)
  .from("client_project_plans")
  .select("*")
  .eq("client_profile_id", profile.id)
  .order("created_at");
```

Render the existing "Overview" + "Phases" + "Updates" sections once per plan (stacked, each
plan's own card), instead of assuming a single `plan`. The "Action Items for You" task section
is removed from this page entirely (moves to the new `PortalTasks.tsx`, see below) — everything
else about this page's existing look/behavior per plan stays the same, just repeated per plan
instead of assumed singular.

## 2. New `PortalTasks.tsx` + `/portal/tasks` route + nav item

- Fetches all of the client's plans (same all-plans query as above, or reuses the plan ID list),
  then fetches `client_project_tasks` where `plan_id IN (...)` and `assigned_to = 'client'`,
  across all plans, into one combined list.
- Reuses the exact task-card markup and `markTaskComplete` logic already in
  `PortalProjects.tsx` today — relocated, not rewritten.
- New nav item in `PortalLayout.tsx`'s `baseNavItems`, positioned near "My Project" (e.g.
  immediately after it), pointing at `/portal/tasks`.
- On mount, upserts `client_portal_seen_at` for `item_type = 'tasks'` (see below) — visiting the
  tab marks it seen.

## 3. `client_portal_seen_at` table (new)

```sql
CREATE TABLE client_portal_seen_at (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id, item_type)
);

ALTER TABLE client_portal_seen_at ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpsa_client_own" ON client_portal_seen_at FOR ALL TO authenticated USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
) WITH CHECK (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
```

Deliberately no admin-facing policy — nothing in the admin UI reads or writes this table, and
adding an unused broad policy here would repeat the exact `USING(true)`-without-`TO
service_role` pattern already flagged as a fast-follow elsewhere in this project. If a future
admin view ever needs it, add a correctly-scoped policy then.

`item_type` values used: `'documents'`, `'tasks'`, `'agreements'`. One row per client per type,
upserted (`on_conflict: 'client_profile_id,item_type'`) with `last_seen_at: now()` each time the
client visits that section.

## 4. Badge counts (`PortalLayout.tsx`)

Computed once when the sidebar mounts (same pattern as the existing admin add-on-request
count badge — no live refresh):

- **Migration seeds a baseline.** At deploy time, the migration inserts a `client_portal_seen_at`
  row with `last_seen_at = now()` for every existing `client_profile_id` × each of the three
  `item_type`s. Without this, every client would see every pre-existing document/task/agreement
  as "unseen" the moment this ships — a wall of scary badge counts for old data, not a useful
  notification. With the seed, only things that genuinely arrive *after* launch ever count as
  unseen. New clients created after this migration naturally have no row yet for any type —
  treat that as "everything unseen" (correct for a brand-new client with nothing seen yet).
- **Documents**: `count(client_documents where client_profile_id = X and created_at > last_seen_at['documents'])`.
- **Agreements**: whether `client_agreement_records.sent_at` exists and is greater than
  `last_seen_at['agreements']` — a boolean shown as a `1`, not a count (there's only ever one
  agreement record per client today).
- **Tasks**: `count` of client-assigned tasks (across all plans) where EITHER
  `created_at > last_seen_at['tasks']` OR (`due_date <= now() + 48 hours` AND
  `status != 'complete'`) — deduplicated (a task matching both conditions counts once, not
  twice).

Badges render as small numeric pills on the "Documents", "Tasks", and "Agreements" nav items,
matching the existing admin nav badge's visual style, hidden when the count is 0.

## Explicitly out of scope

- Real-time/live badge updates (refetch on route change, websocket, etc.) — fetch-once-on-mount
  only, matching the established admin pattern.
- Any change to admin's task management in `ClientDetail.tsx`.
- A client-facing plan switcher (deliberately not building this — all-plans-together instead).
