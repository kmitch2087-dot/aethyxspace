# Client Tasks Tab + Notification Bubbles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a real bug where `PortalProjects.tsx` breaks for any client with more than one project plan, extract its embedded task list into a dedicated `PortalTasks.tsx` + nav item, and add notification badges (Documents/Tasks/Agreements) backed by a new generic `client_portal_seen_at` table.

**Architecture:** One migration adds `client_portal_seen_at` (seeded with a baseline for every existing client so the feature ships without a flood of false "unseen" counts) and RLS scoped correctly to the client only. `PortalProjects.tsx` switches from `.maybeSingle()` (which errors on 2+ plans) to fetching all of a client's plans and rendering each. The task section moves to a new `PortalTasks.tsx`, which also queries across all plans. `PortalLayout.tsx` gets a second, independent effect that computes badge counts once on mount. The three portal pages (Documents, Tasks, Agreements) each get a small "mark as seen" upsert added to their existing load function.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS), shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not in generated types use `(supabase as any).from("table_name")` until types are regenerated.
- No unit tests expected for any task here (Supabase-backed pages, matching this codebase's established convention). Verify via `npm run dev`, `tsc --noEmit`, lint, and Supabase MCP `execute_sql` where a live session isn't available.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch Stripe, billing, or the deposit/checkout flow.
- Do not touch `ClientDetail.tsx`'s admin-side task management (`addTask`, the Plan tab's task list).
- No live/real-time badge updates — fetch once on mount, matching the existing admin add-on-request badge pattern (`AdminLayout.tsx`).

---

### Task 1: Migration — `client_portal_seen_at` table + baseline seed

**Files:**
- Create: `supabase/migrations/20260711_client_portal_seen_at.sql`

**Interfaces:**
- Produces: `client_portal_seen_at` table (`client_profile_id`, `item_type`, `last_seen_at`, unique on the first two), RLS scoped to the owning client only. Tasks 4-5 depend on this existing.

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE client_portal_seen_at (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id, item_type)
);

ALTER TABLE client_portal_seen_at ENABLE ROW LEVEL SECURITY;

-- Deliberately no admin/service-role policy: nothing in the admin UI reads or writes this
-- table. Adding an unused broad policy here would repeat the USING(true)-without-TO-service_role
-- pattern already flagged as a fast-follow elsewhere in this project.
CREATE POLICY "cpsa_client_own" ON client_portal_seen_at FOR ALL TO authenticated USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
) WITH CHECK (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);

-- Seed a baseline for every existing client so this feature ships "quiet" — only items that
-- arrive after this migration ever count as unseen, not every pre-existing document/task/
-- agreement.
INSERT INTO client_portal_seen_at (client_profile_id, item_type, last_seen_at)
SELECT cp.id, t.item_type, now()
FROM client_profiles cp
CROSS JOIN (VALUES ('documents'), ('tasks'), ('agreements')) AS t(item_type)
ON CONFLICT (client_profile_id, item_type) DO NOTHING;
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "client_portal_seen_at"` and the SQL body above.

- [ ] **Step 3: Verify**

Run via Supabase MCP `execute_sql`:

```sql
select column_name, is_nullable, column_default from information_schema.columns
where table_name = 'client_portal_seen_at' order by ordinal_position;

select policyname, cmd, qual from pg_policies where tablename = 'client_portal_seen_at';

select item_type, count(*) from client_portal_seen_at group by item_type;
```

Expected: the 4 expected columns (`id`, `client_profile_id`, `item_type`, `last_seen_at`); one policy (`cpsa_client_own`, `cmd = ALL`, `qual` referencing `client_profiles`/`auth.uid()`); the third query returns 3 rows (one per `item_type`) each with a count matching the current number of rows in `client_profiles`.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`. Confirm `client_portal_seen_at` appears with the expected columns.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_client_portal_seen_at.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add client_portal_seen_at table for notification badges

Seeded with a baseline row per existing client per item type so the
feature ships without every pre-existing document/task/agreement
counting as "unseen." RLS scoped to the owning client only — no
admin/service-role policy, since nothing else touches this table.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Fix `PortalProjects.tsx`'s multi-plan bug and remove the task section

**Files:**
- Modify: `src/pages/portal/PortalProjects.tsx` (entire file restructured around `plans: any[]` instead of `plan: any`)

**Interfaces:**
- Produces: nothing consumed by later tasks (Task 3 independently queries tasks across plans, doesn't reuse this file's internals).

- [ ] **Step 1: Replace the single-plan fetch with an all-plans fetch**

Current (`src/pages/portal/PortalProjects.tsx:100-132`):

```typescript
      const { data: planData } = await (supabase as any)
        .from("client_project_plans")
        .select("*")
        .eq("client_profile_id", profile.id)
        .maybeSingle();

      if (!planData) { setLoading(false); return; }

      setPlan(planData);

      const [{ data: phasesData }, { data: updatesData }, { data: tasksData }] = await Promise.all([
        (supabase as any)
          .from("client_project_phases")
          .select("*")
          .eq("plan_id", planData.id)
          .order("sort_order"),
        (supabase as any)
          .from("client_project_updates")
          .select("*")
          .eq("plan_id", planData.id)
          .eq("is_client_visible", true)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("client_project_tasks")
          .select("*")
          .eq("plan_id", planData.id)
          .eq("assigned_to", "client")
          .order("sort_order"),
      ]);

      setPhases(phasesData ?? []);
      setUpdates(updatesData ?? []);
      setTasks(tasksData ?? []);
```

Replace with a version that fetches all plans and, per plan, its phases and updates (the task fetch is removed entirely — tasks move to `PortalTasks.tsx` in Task 3):

```typescript
      const { data: plansData } = await (supabase as any)
        .from("client_project_plans")
        .select("*")
        .eq("client_profile_id", profile.id)
        .order("created_at");

      if (!plansData?.length) { setLoading(false); return; }

      setPlans(plansData);

      const planIds = plansData.map((p: any) => p.id);
      const [{ data: phasesData }, { data: updatesData }] = await Promise.all([
        (supabase as any)
          .from("client_project_phases")
          .select("*")
          .in("plan_id", planIds)
          .order("sort_order"),
        (supabase as any)
          .from("client_project_updates")
          .select("*")
          .in("plan_id", planIds)
          .eq("is_client_visible", true)
          .order("created_at", { ascending: false }),
      ]);

      setPhases(phasesData ?? []);
      setUpdates(updatesData ?? []);
```

- [ ] **Step 2: Replace the `plan`/`tasks` state with `plans`, drop the task-related state**

Current state declarations (`src/pages/portal/PortalProjects.tsx:77-82`):

```typescript
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [phases, setPhases] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);
```

Replace with:

```typescript
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [phases, setPhases] = useState<any[]>([]);
  const [updates, setUpdates] = useState<any[]>([]);
```

(`completing`/`markTaskComplete` move to `PortalTasks.tsx` in Task 3 — remove the `markTaskComplete` function and the `completing` state from this file entirely.)

- [ ] **Step 3: Restructure the render to loop over `plans`, removing the task section**

Current render structure (`src/pages/portal/PortalProjects.tsx:164-338`) computes `status`/`expectedPct`/`completionPct`/`clientTasks` for a single `plan`, then renders one Overview + Phases + Tasks + Updates block. Replace the single-plan computation and render with a per-plan loop. The `calcSchedule`, `fmtDate`, `fmtDateLong`, and all the `*Colors`/`*Labels` constants at the top of the file are unchanged and still used per-plan.

Replace this section:

```tsx
  const { status, expectedPct } = plan ? calcSchedule(plan) : { status: "no_date" as ScheduleStatus, expectedPct: 0 };
  const completionPct = plan?.completion_percent ?? 0;
  const clientTasks = tasks.filter((t) => t.assigned_to === "client");

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Your Project</h1>
        {plan?.project_name && (
          <p className="text-white/50 text-sm mt-1">{plan.project_name}</p>
        )}
      </div>

      {!plan ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">
            Your project plan isn't set up yet. We'll add it once your project kicks off.
          </p>
        </div>
      ) : (
        <>
          {/* Section 1 — Overview */}
          ... (through the end of Section 2 — Phases) ...

          {/* Section 3 — Client tasks */}
          {clientTasks.length > 0 && (
            ... entire block ...
          )}

          {/* Section 4 — Updates */}
          {updates.length > 0 && (
            ... entire block ...
          )}
        </>
      )}
    </div>
  );
```

Replace with (per-plan loop; the Overview and Phases JSX bodies are byte-identical to the existing file, just moved inside a `plans.map(...)` and reading from the loop variable `plan` and that plan's own filtered `phases`/`updates`; the Tasks section is deleted entirely):

```tsx
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Your Project</h1>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">
            Your project plan isn't set up yet. We'll add it once your project kicks off.
          </p>
        </div>
      ) : (
        plans.map((plan) => {
          const { status, expectedPct } = calcSchedule(plan);
          const completionPct = plan?.completion_percent ?? 0;
          const planPhases = phases.filter((p) => p.plan_id === plan.id);
          const planUpdates = updates.filter((u) => u.plan_id === plan.id);

          return (
            <div key={plan.id} className="space-y-6">
              {/* Section 1 — Overview */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h2 className="text-xl font-bold text-white">{plan.project_name ?? "Project"}</h2>
                    {plan.status && (
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[plan.status] ?? "bg-white/10 text-white/60"}`}>
                        {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                      </span>
                    )}
                    {plan.overview && (
                      <p className="text-white/60 text-sm leading-relaxed">{plan.overview}</p>
                    )}
                  </div>

                  <div className="flex flex-col items-start md:items-end gap-3">
                    <span className="text-5xl font-bold text-white tabular-nums">{completionPct}%</span>
                    <div className="w-full max-w-xs">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-500"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                    <span className={`flex items-center gap-1.5 text-sm font-medium ${scheduleColors[status]}`}>
                      <ScheduleIcon status={status} />
                      {scheduleLabels[status]}
                    </span>
                  </div>
                </div>

                {(plan.start_date || plan.target_date) && (
                  <div className="flex items-center gap-2 text-sm text-white/50 pt-2 border-t border-white/10">
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    <span>
                      {plan.start_date && <>Started: {fmtDate(plan.start_date)}</>}
                      {plan.start_date && plan.target_date && " · "}
                      {plan.target_date && <>Due: {fmtDate(plan.target_date)}</>}
                    </span>
                  </div>
                )}
              </div>

              {/* Section 2 — Phases */}
              {planPhases.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <h2 className="text-base font-semibold text-white">Project Phases</h2>
                  <div className="space-y-4">
                    {planPhases.map((phase) => {
                      const pct = phase.completion_percent ?? 0;
                      return (
                        <div key={phase.id} className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-sm text-white font-medium">{phase.name}</span>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phaseColors[phase.status] ?? "bg-white/10 text-white/50"}`}>
                                {phase.status === "in_progress" ? "In Progress" : phase.status ? phase.status.charAt(0).toUpperCase() + phase.status.slice(1) : "Pending"}
                              </span>
                              <span className="text-xs text-white/50 tabular-nums w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-teal-500/70 rounded-full transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3 — Updates */}
              {planUpdates.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                  <div>
                    <h2 className="text-base font-semibold text-white">Latest Updates</h2>
                    <p className="text-sm text-white/50 mt-0.5">From the Aethyx team</p>
                  </div>
                  <div className="space-y-4">
                    {planUpdates.map((update) => (
                      <div key={update.id} className="border-l-2 border-teal-500/40 pl-4 space-y-1">
                        <p className="text-xs text-white/40">{fmtDateLong(update.created_at)}</p>
                        <p className="text-sm text-white/80 leading-relaxed">{update.content}</p>
                        {update.author_name && (
                          <p className="text-xs text-white/40">— {update.author_name}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
```

The `CheckCircle2`, `Circle` imports (used only by the removed task-completion button) and the `priorityColors` constant (used only by the removed task cards) become unused — remove them from the import list and the top-of-file constants. `AlertTriangle`, `TrendingUp`, `Minus`, `CalendarDays` stay (still used by `ScheduleIcon`/the overview date row).

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalDocuments.tsx src/pages/portal/PortalProjects.tsx
```
Expected: clean, no unused-import warnings for the removed `CheckCircle2`/`Circle`/`priorityColors`.

Since this page requires an authenticated client session, verify the fix at the data layer instead: use the Supabase MCP `execute_sql` tool to confirm at least one real client currently has 2+ rows in `client_project_plans` (from the earlier multi-plan work) — `select client_profile_id, count(*) from client_project_plans group by client_profile_id having count(*) > 1` — and reason through the new query (`.eq("client_profile_id", X).order("created_at")`, no `.maybeSingle()`) against that client's actual row count to confirm it would now return successfully instead of erroring.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalProjects.tsx
git commit -m "$(cat <<'EOF'
Fix PortalProjects.tsx breaking for clients with multiple plans

.maybeSingle() errors when more than one row matches, which became
possible once multi-plan-per-client support shipped earlier the same
day. Now fetches and renders all of a client's plans. The embedded
task section is removed here — it moves to a dedicated Tasks tab.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: New `PortalTasks.tsx` + route + nav item

**Files:**
- Create: `src/pages/portal/PortalTasks.tsx`
- Modify: `src/pages/portal/PortalLayout.tsx` (nav item, ~lines 30-43)
- Modify: `src/App.tsx` (import + route)

**Interfaces:**
- Produces: the `/portal/tasks` route and nav item — consumed by Task 4 (which adds a badge to this same nav item) and Task 5 (which adds a "mark as seen" upsert to this page).

- [ ] **Step 1: Write `PortalTasks.tsx`**

Reuses the task-card markup and `markTaskComplete` logic that existed in `PortalProjects.tsx` before Task 2 removed it, adapted to query across all of the client's plans:

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, ListTodo } from "lucide-react";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

const priorityColors: Record<string, string> = {
  high: "bg-red-500/20 text-red-400",
  normal: "bg-teal-500/20 text-teal-400",
  low: "bg-white/10 text-white/50",
};

export default function PortalTasks() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!profile) { setLoading(false); return; }

      const { data: plansData } = await (supabase as any)
        .from("client_project_plans")
        .select("id")
        .eq("client_profile_id", profile.id);

      const planIds = (plansData ?? []).map((p: any) => p.id);
      if (!planIds.length) { setTasks([]); setLoading(false); return; }

      const { data: tasksData } = await (supabase as any)
        .from("client_project_tasks")
        .select("*")
        .in("plan_id", planIds)
        .eq("assigned_to", "client")
        .order("sort_order");

      setTasks(tasksData ?? []);
    } catch {
      toast({ title: "Failed to load tasks", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function markTaskComplete(taskId: string) {
    setCompleting(taskId);
    const { error } = await (supabase as any)
      .from("client_project_tasks")
      .update({ status: "complete" })
      .eq("id", taskId);

    if (error) {
      toast({ title: "Could not update task", variant: "destructive" });
    } else {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: "complete" } : t));
      toast({ title: "Task marked complete" });
    }
    setCompleting(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Tasks</h1>
        <p className="text-white/50 text-sm mt-1">Action items waiting on you across your projects.</p>
      </div>

      {tasks.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <ListTodo className="h-8 w-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">No tasks right now — check back soon.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const done = task.status === "complete";
            return (
              <div
                key={task.id}
                className={`bg-white/5 border border-white/10 rounded-lg p-4 flex gap-4 items-start transition-opacity ${done ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => !done && markTaskComplete(task.id)}
                  disabled={done || completing === task.id}
                  className="mt-0.5 shrink-0 text-white/40 hover:text-teal-400 disabled:cursor-default disabled:hover:text-white/40 transition-colors"
                  aria-label={done ? "Task complete" : "Mark complete"}
                >
                  {done ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : completing === task.id ? (
                    <div className="w-5 h-5 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {task.priority && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority] ?? "bg-white/10 text-white/50"}`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    )}
                    <span className={`text-sm font-semibold ${done ? "line-through text-white/40" : "text-white"}`}>
                      {task.title}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-xs text-white/50 leading-relaxed">{task.description}</p>
                  )}
                  {task.due_date && (
                    <p className="text-xs text-white/40">Due: {fmtDate(task.due_date)}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the nav item**

Add `ListTodo` to the existing `lucide-react` import list in `src/pages/portal/PortalLayout.tsx`:

```typescript
import {
  LayoutDashboard,
  MessageSquare,
  FolderOpen,
  FileSignature,
  CreditCard,
  ClipboardList,
  LogOut,
  GitBranch,
  FolderKanban,
  Package,
  ListTodo,
} from "lucide-react";
```

Add the new item to `baseNavItems`, immediately after "My Project":

```typescript
const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Referrals", url: "/portal/referrals", icon: GitBranch },
  { title: "Add-Ons", url: "/portal/add-ons", icon: Package },
  { title: "My Project", url: "/portal/projects", icon: FolderKanban },
  { title: "Tasks", url: "/portal/tasks", icon: ListTodo },
];
```

- [ ] **Step 3: Wire the route**

In `src/App.tsx`, add the import alongside the other portal page imports:

```typescript
import PortalTasks from "./pages/portal/PortalTasks";
```

Add the route inside the `/portal` route block, after the `projects` route:

```tsx
              <Route path="tasks" element={<PortalTasks />} />
```

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalTasks.tsx src/pages/portal/PortalLayout.tsx src/App.tsx
npm run dev
```
Expected: clean compile. This page requires an authenticated client session to click-test — if unavailable, verify the query shape at the data layer: use the Supabase MCP `execute_sql` tool to confirm `client_project_tasks` rows exist with `assigned_to = 'client'` for a plan tied to a real client, and that the `.in("plan_id", planIds)` query would correctly return them.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalTasks.tsx src/pages/portal/PortalLayout.tsx src/App.tsx
git commit -m "$(cat <<'EOF'
Add dedicated client Tasks tab

Relocates the task list/mark-complete flow previously embedded in
PortalProjects.tsx into its own page, querying across all of a
client's plans rather than assuming exactly one.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Notification badge counts (`PortalLayout.tsx`)

**Files:**
- Modify: `src/pages/portal/PortalLayout.tsx` (new effect + state, nav rendering)

**Interfaces:**
- Consumes: `client_portal_seen_at` (Task 1), the "Tasks" nav item (Task 3).
- Produces: nothing consumed by later tasks (Task 5 is independent — it only writes to `client_portal_seen_at`, doesn't read the badge state this task produces).

- [ ] **Step 1: Add badge state and a new, separate effect**

Add new state near the existing `needsIntake`/`referralEnabled` state in the `PortalLayout` component:

```typescript
  const [badgeCounts, setBadgeCounts] = useState<Record<string, number>>({});
```

Add a new, separate `useEffect` (do not merge into the existing intake/referral effect — keep that one untouched to avoid risking a regression in already-working code):

```typescript
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!profile) return;

      const { data: seenRows } = await (supabase as any)
        .from("client_portal_seen_at")
        .select("item_type, last_seen_at")
        .eq("client_profile_id", profile.id);
      const seenMap: Record<string, string> = {};
      (seenRows ?? []).forEach((r: any) => { seenMap[r.item_type] = r.last_seen_at; });
      const epoch = "1970-01-01T00:00:00.000Z";

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [{ count: docsCount }, { data: agreementRow }, { data: plansData }] = await Promise.all([
        supabase
          .from("client_documents")
          .select("id", { count: "exact", head: true })
          .eq("client_profile_id", profile.id)
          .gt("created_at", seenMap.documents ?? epoch),
        (supabase as any)
          .from("client_agreement_records")
          .select("sent_at")
          .eq("client_profile_id", profile.id)
          .maybeSingle(),
        (supabase as any)
          .from("client_project_plans")
          .select("id")
          .eq("client_profile_id", profile.id),
      ]);

      const agreementUnseen =
        agreementRow?.sent_at && agreementRow.sent_at > (seenMap.agreements ?? epoch) ? 1 : 0;

      const planIds = (plansData ?? []).map((p: any) => p.id);
      let tasksUnseen = 0;
      if (planIds.length) {
        const dueSoonCutoff = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
        const [{ data: newTasks }, { data: dueSoonTasks }] = await Promise.all([
          (supabase as any)
            .from("client_project_tasks")
            .select("id")
            .in("plan_id", planIds)
            .eq("assigned_to", "client")
            .gt("created_at", seenMap.tasks ?? epoch),
          (supabase as any)
            .from("client_project_tasks")
            .select("id")
            .in("plan_id", planIds)
            .eq("assigned_to", "client")
            .neq("status", "complete")
            .lte("due_date", dueSoonCutoff),
        ]);
        const unseenIds = new Set([
          ...(newTasks ?? []).map((t: any) => t.id),
          ...(dueSoonTasks ?? []).map((t: any) => t.id),
        ]);
        tasksUnseen = unseenIds.size;
      }

      setBadgeCounts({
        documents: docsCount ?? 0,
        agreements: agreementUnseen,
        tasks: tasksUnseen,
      });
    })();
  }, [user]);
```

- [ ] **Step 2: Render the badges**

Current nav rendering in `PortalSidebar` (`src/pages/portal/PortalLayout.tsx:71-86`):

```tsx
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/portal"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
```

`PortalSidebar` needs the badge counts threaded in as a new prop. Change its signature and the nav rendering:

```tsx
function PortalSidebar({
  showIntake,
  showReferrals,
  badgeCounts,
}: {
  showIntake: boolean;
  showReferrals: boolean;
  badgeCounts: Record<string, number>;
}) {
```

```tsx
            <SidebarMenu>
              {navItems.map((item) => {
                const badgeKey = item.title === "Documents" ? "documents"
                  : item.title === "Tasks" ? "tasks"
                  : item.title === "Agreements" ? "agreements"
                  : null;
                const badgeCount = badgeKey ? (badgeCounts[badgeKey] ?? 0) : 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === "/portal"}
                        className="hover:bg-muted/50"
                        activeClassName="bg-muted text-primary font-medium"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                        {!collapsed && badgeCount > 0 && (
                          <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] leading-none px-1.5 py-1">
                            {badgeCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
```

Update the `PortalSidebar` render call in `PortalLayout`:

```tsx
        <PortalSidebar showIntake={needsIntake} showReferrals={referralEnabled} badgeCounts={badgeCounts} />
```

- [ ] **Step 3: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalLayout.tsx
```

Since this requires an authenticated client session, verify the count logic at the data layer: pick a real client, insert a throwaway `client_documents` row for them with `created_at` after their seeded `client_portal_seen_at.last_seen_at` for `'documents'`, confirm the count query would return `1`, then delete the throwaway row so no test data is left behind.

- [ ] **Step 4: Commit**

```bash
git add src/pages/portal/PortalLayout.tsx
git commit -m "$(cat <<'EOF'
Add notification badge counts to Documents/Tasks/Agreements nav items

Documents and Agreements use a pure unseen-since-last-visit count.
Tasks combines that with a second, independent trigger: tasks due
within 48 hours and not yet complete, deduplicated against the
unseen set. Fetched once on mount, matching the existing admin
add-on-request badge pattern — no live refresh.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Mark-as-seen upserts in the three portal pages

**Files:**
- Modify: `src/pages/portal/PortalDocuments.tsx` (`load` function, ~line 40-80)
- Modify: `src/pages/portal/PortalTasks.tsx` (`load` function, from Task 3)
- Modify: `src/pages/portal/PortalAgreements.tsx` (`load` function, ~line 15-35)

**Interfaces:**
- Consumes: `client_portal_seen_at` (Task 1).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add the upsert to `PortalDocuments.tsx`**

At the end of the existing `load` function (`src/pages/portal/PortalDocuments.tsx`, after `setDocuments(data || []); setLoading(false);`), add a fire-and-forget upsert (don't block the page on it):

```typescript
    if (profileId) {
      (supabase as any)
        .from("client_portal_seen_at")
        .upsert(
          { client_profile_id: profileId, item_type: "documents", last_seen_at: new Date().toISOString() },
          { onConflict: "client_profile_id,item_type" },
        )
        .then(() => {});
    }
```

- [ ] **Step 2: Add the upsert to `PortalTasks.tsx`**

At the end of the `load` function's `try` block (`src/pages/portal/PortalTasks.tsx`, from Task 3), right after `setTasks(tasksData ?? []);`, add:

```typescript
      (supabase as any)
        .from("client_portal_seen_at")
        .upsert(
          { client_profile_id: profile.id, item_type: "tasks", last_seen_at: new Date().toISOString() },
          { onConflict: "client_profile_id,item_type" },
        )
        .then(() => {});
```

- [ ] **Step 3: Add the upsert to `PortalAgreements.tsx`**

At the end of the `load` function (`src/pages/portal/PortalAgreements.tsx`), inside the `if (profileData)` block, right after `setRecord(recordData);`, add:

```typescript
      (supabase as any)
        .from("client_portal_seen_at")
        .upsert(
          { client_profile_id: profileData.id, item_type: "agreements", last_seen_at: new Date().toISOString() },
          { onConflict: "client_profile_id,item_type" },
        )
        .then(() => {});
```

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalDocuments.tsx src/pages/portal/PortalTasks.tsx src/pages/portal/PortalAgreements.tsx
```

Since these pages require an authenticated client session, verify the upsert shape at the data layer instead: using the Supabase MCP `execute_sql` tool, manually run an equivalent upsert for a real client/item_type pair (e.g. set `last_seen_at` to `now()` for `'documents'`), confirm the row updates (not duplicates, due to the `onConflict` target), then leave it — this is the correct end-state for that client, not test data to clean up, since it's semantically "they've now seen documents as of now."

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalDocuments.tsx src/pages/portal/PortalTasks.tsx src/pages/portal/PortalAgreements.tsx
git commit -m "$(cat <<'EOF'
Mark portal sections as seen on visit

Each of Documents, Tasks, and Agreements now upserts its own
client_portal_seen_at row (fire-and-forget) whenever the client
loads that page, so Task 4's badge counts clear once visited.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
