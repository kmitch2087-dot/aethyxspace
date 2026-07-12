# Client-facing Assets Tab + Google Drive Folder Link Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let clients view their own project's assets and toggle whether each is "in use" (a signal Kristin sees), and let each project plan carry a client-editable Google Drive folder link, so a client with multiple businesses (e.g. Irving Munoz's Scotty's Adventures + Limitless Barbershop) can share a different folder per project.

**Architecture:** Two additive columns (`client_assets.in_use`, `client_project_plans.drive_folder_url`) plus two new client-scoped `UPDATE` RLS policies (clients currently only have `SELECT` on both tables). A new portal page (`PortalAssets.tsx`) renders one section per project plan — following the same multi-plan-per-client pattern `PortalProjects.tsx` already uses — showing that plan's assets with an "In use" toggle and an editable Drive-link field. The existing admin Assets tab in `ClientDetail.tsx` gets two small read-only additions: a dimmed "Not in use" badge and a clickable Drive-link display.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS), shadcn/ui (`Switch`, `Badge`), Tailwind.

## Global Constraints

- No upload, delete, or edit of asset label/content from the client portal — admin-only, unchanged. The client can only toggle `in_use` and edit `drive_folder_url`.
- The `in_use` flag is a pure display signal for this pass — no other feature (scraping, document generation) reads it.
- `drive_folder_url` is scoped per `client_project_plans` row, not per client — a client with multiple plans gets one field per plan.
- The new RLS `UPDATE` policies are row-scoped (ownership via `client_profile_id`/`plan_id → client_profiles.user_id = auth.uid()`) but not column-scoped — this is an accepted, already-precedented tradeoff in this codebase (see `client_project_tasks`'s `cpt_client_update` policy). The app's own UI must only ever send `{ in_use }` or `{ drive_folder_url }` in its update calls; do not build a generic "update any field" form.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — `in_use`, `drive_folder_url`, client UPDATE policies

**Files:**
- Create: `supabase/migrations/20260711_client_assets_tab.sql`

**Interfaces:**
- Produces: `client_assets.in_use` (boolean, default `true`), `client_project_plans.drive_folder_url` (nullable text), `ca_client_update`/`cpp_client_update` RLS policies — consumed by Tasks 2 and 3.

- [ ] **Step 1: Write the migration**

```sql
-- Client-facing Assets tab: a per-asset "in use" signal for Kristin, and a per-project
-- Google Drive folder link a client can share back. Both are client-editable, so each
-- table needs a new ownership-scoped UPDATE policy (clients currently only have SELECT).
ALTER TABLE client_assets ADD COLUMN in_use boolean NOT NULL DEFAULT true;
ALTER TABLE client_project_plans ADD COLUMN drive_folder_url text;

CREATE POLICY "ca_client_update" ON client_assets FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "cpp_client_update" ON client_project_plans FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "client_assets_tab"`.

- [ ] **Step 3: Verify columns**

```sql
SELECT table_name, column_name, is_nullable, column_default FROM information_schema.columns
WHERE (table_name = 'client_assets' AND column_name = 'in_use')
   OR (table_name = 'client_project_plans' AND column_name = 'drive_folder_url');
```
Expected: `in_use` (not nullable, default `true`), `drive_folder_url` (nullable, no default).

- [ ] **Step 4: Verify the new RLS policies**

```sql
SELECT polname, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as with_check_expr, polcmd
FROM pg_policy WHERE polrelid IN ('client_assets'::regclass, 'client_project_plans'::regclass)
AND polname IN ('ca_client_update', 'cpp_client_update');
```
Expected: both rows present, `polcmd: 'w'` (UPDATE), `using_expr`/`with_check_expr` both the `client_profile_id IN (...)` ownership subquery.

- [ ] **Step 5: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20260711_client_assets_tab.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add in_use, drive_folder_url columns + client UPDATE policies

client_assets.in_use (client-toggleable, admin-visible signal, defaults
true so existing assets aren't newly excluded), client_project_plans.
drive_folder_url (per-plan Google Drive link, editable by the owning
client). Both need a new ownership-scoped UPDATE policy since clients
previously only had SELECT on these tables.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Admin-side display — "Not in use" badge + Drive link

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx`

**Interfaces:**
- Consumes: `client_assets.in_use`, `client_project_plans.drive_folder_url` (Task 1).
- Produces: nothing consumed by later tasks — this task is purely read-only display, independent of Task 3.

- [ ] **Step 1: Add the two new fields to the existing interfaces**

Current (`src/pages/admin/ClientDetail.tsx`, `ClientAsset` interface):
```tsx
interface ClientAsset {
  id: string;
  type: "text" | "file";
  category: AssetCategory;
  label: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  sort_order: number;
  created_at: string;
  bg_color?: string | null;
  plan_id: string | null;
}
```
Replace with:
```tsx
interface ClientAsset {
  id: string;
  type: "text" | "file";
  category: AssetCategory;
  label: string;
  content?: string;
  file_url?: string;
  file_name?: string;
  file_size?: number;
  sort_order: number;
  created_at: string;
  bg_color?: string | null;
  plan_id: string | null;
  in_use: boolean;
}
```

Current (`ProjectPlan` interface):
```tsx
interface ProjectPlan {
  id: string;
  client_profile_id: string;
  project_name: string;
  overview?: string | null;
  completion_percent: number;
  status: "planning" | "active" | "review" | "complete" | "paused" | "abandoned";
  start_date?: string | null;
  target_date?: string | null;
  github_url?: string | null;
  project_type: string;
  created_at: string;
  updated_at: string;
}
```
Replace with:
```tsx
interface ProjectPlan {
  id: string;
  client_profile_id: string;
  project_name: string;
  overview?: string | null;
  completion_percent: number;
  status: "planning" | "active" | "review" | "complete" | "paused" | "abandoned";
  start_date?: string | null;
  target_date?: string | null;
  github_url?: string | null;
  project_type: string;
  created_at: string;
  updated_at: string;
  drive_folder_url?: string | null;
}
```

(Both tables are already fetched via `select("*")` in `fetchAll` — no query change needed; the new columns arrive automatically.)

- [ ] **Step 2: Show the plan's Drive folder link at the top of the Assets tab**

Current (`src/pages/admin/ClientDetail.tsx`, the Assets tab's opening):
```tsx
        {/* ASSETS */}
        <TabsContent value="assets" className="mt-4 space-y-6">
          {!plan ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              This client has no project yet — assets are scoped to a project, so create one first (Plan tab).
            </p>
          ) : (
            <>
              {unassignedAssets.length > 0 && (
```
Replace with:
```tsx
        {/* ASSETS */}
        <TabsContent value="assets" className="mt-4 space-y-6">
          {!plan ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              This client has no project yet — assets are scoped to a project, so create one first (Plan tab).
            </p>
          ) : (
            <>
              {plan.drive_folder_url && (
                <div className="flex items-center gap-2 text-sm bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
                  <ExternalLink className="h-4 w-4 text-teal-700 shrink-0" />
                  <span className="text-teal-800">Client-shared Drive folder for {plan.project_name}:</span>
                  <a href={plan.drive_folder_url} target="_blank" rel="noreferrer" className="text-teal-700 font-medium hover:underline truncate">
                    {plan.drive_folder_url}
                  </a>
                </div>
              )}

              {unassignedAssets.length > 0 && (
```

(`ExternalLink` is already imported in this file's `lucide-react` import list — confirmed, no new import needed.)

- [ ] **Step 3: Dim + badge text (brand identity) assets that aren't in use**

Current (`src/pages/admin/ClientDetail.tsx`, inside the `textAssets.map` render):
```tsx
                {textAssets.map((asset) => {
                  const { classes, label: catLabel } = assetCategoryInfo(asset.category);
                  return (
                    <Card key={asset.id}>
                      <CardContent className="pt-4 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge className={`${classes} hover:${classes} text-xs`}>{catLabel}</Badge>
                              <span className="font-medium text-sm">{asset.label}</span>
                            </div>
                            <p className="text-sm text-black/80 whitespace-pre-wrap">{asset.content}</p>
                          </div>
```
Replace with:
```tsx
                {textAssets.map((asset) => {
                  const { classes, label: catLabel } = assetCategoryInfo(asset.category);
                  return (
                    <Card key={asset.id} className={asset.in_use ? "" : "opacity-50"}>
                      <CardContent className="pt-4 group">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <Badge className={`${classes} hover:${classes} text-xs`}>{catLabel}</Badge>
                              <span className="font-medium text-sm">{asset.label}</span>
                              {!asset.in_use && (
                                <Badge className="bg-gray-200 text-gray-500 border-gray-300 hover:bg-gray-200 text-xs">Not in use</Badge>
                              )}
                            </div>
                            <p className="text-sm text-black/80 whitespace-pre-wrap">{asset.content}</p>
                          </div>
```

- [ ] **Step 4: Dim + badge file assets that aren't in use**

Current (`src/pages/admin/ClientDetail.tsx`, inside `renderThumb`):
```tsx
                return (
                  <div key={`${keyPrefix}-${asset.id}`} className="group relative rounded-lg border border-black/10 bg-white overflow-hidden flex flex-col">
                    <div className={`relative aspect-square ${thumbBg} flex items-center justify-center overflow-hidden`}>
```
Replace with:
```tsx
                return (
                  <div key={`${keyPrefix}-${asset.id}`} className={`group relative rounded-lg border border-black/10 bg-white overflow-hidden flex flex-col ${asset.in_use ? "" : "opacity-50"}`}>
                    <div className={`relative aspect-square ${thumbBg} flex items-center justify-center overflow-hidden`}>
```

Current (`renderThumb`'s label row):
```tsx
                        ) : (
                          <p
                            className="text-xs font-medium truncate text-black/80 cursor-pointer hover:text-teal-700 transition-colors"
                            title="Click to rename"
                            onClick={() => { setEditingLabelId(asset.id); setEditingLabelValue(asset.label); }}
                          >
                            {asset.label}
                          </p>
                        )}
                      </div>
                      {signedUrl && (
```
Replace with:
```tsx
                        ) : (
                          <p
                            className="text-xs font-medium truncate text-black/80 cursor-pointer hover:text-teal-700 transition-colors"
                            title="Click to rename"
                            onClick={() => { setEditingLabelId(asset.id); setEditingLabelValue(asset.label); }}
                          >
                            {asset.label}
                          </p>
                        )}
                        {!asset.in_use && (
                          <span className="text-[10px] text-gray-400">Not in use</span>
                        )}
                      </div>
                      {signedUrl && (
```

- [ ] **Step 5: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Manually toggle `in_use` to `false` on a test asset via `execute_sql` (the client-facing toggle doesn't exist until Task 3), confirm the admin Assets tab shows it dimmed with the "Not in use" badge/label, and confirm setting a plan's `drive_folder_url` via SQL makes the teal link banner appear at the top of that plan's Assets tab.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Show in_use status and Drive folder link in admin Assets tab

Read-only additions: assets with in_use=false render dimmed with a
"Not in use" badge/label (both text and file asset cards), and a
plan's client-shared Google Drive folder link (if set) shows as a
clickable banner at the top of that plan's Assets tab.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: New portal page — `PortalAssets.tsx`

**Files:**
- Create: `src/pages/portal/PortalAssets.tsx`
- Modify: `src/App.tsx`
- Modify: `src/pages/portal/PortalLayout.tsx`

**Interfaces:**
- Consumes: `client_assets.in_use`, `client_project_plans.drive_folder_url`, `ca_client_update`/`cpp_client_update` RLS policies (Task 1).
- Produces: nothing consumed by later tasks — final task in this plan.

- [ ] **Step 1: Create `src/pages/portal/PortalAssets.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePortalClientProfile } from "@/hooks/usePortalClientProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Image as ImageIcon } from "lucide-react";

interface PortalAsset {
  id: string;
  plan_id: string | null;
  type: "text" | "file";
  category: string;
  label: string;
  content?: string | null;
  file_name?: string | null;
  in_use: boolean;
}

interface PortalPlan {
  id: string;
  project_name: string;
  drive_folder_url?: string | null;
}

const PortalAssets = () => {
  const { user } = useAuth();
  const { profile: resolvedProfile, loading: profileLoading, isViewingAsAdmin } = usePortalClientProfile();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<PortalPlan[]>([]);
  const [assets, setAssets] = useState<PortalAsset[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [driveDrafts, setDriveDrafts] = useState<Record<string, string>>({});
  const [savingDrive, setSavingDrive] = useState<string | null>(null);

  const load = async () => {
    if (!user || profileLoading) return;
    const profile = resolvedProfile;
    if (!profile) { setLoading(false); return; }

    const { data: plansData } = await supabase
      .from("client_project_plans")
      .select("id, project_name, drive_folder_url")
      .eq("client_profile_id", profile.id)
      .order("created_at");
    setPlans(plansData ?? []);
    setDriveDrafts(
      Object.fromEntries((plansData ?? []).map((p) => [p.id, p.drive_folder_url ?? ""])),
    );

    const { data: assetsData } = await supabase
      .from("client_assets")
      .select("id, plan_id, type, category, label, content, file_name, in_use")
      .eq("client_profile_id", profile.id)
      .order("sort_order");
    setAssets(assetsData ?? []);

    const fileAssets = (assetsData ?? []).filter((a) => a.type === "file" && a.file_name);
    if (fileAssets.length) {
      const { data: urlData } = await supabase.storage
        .from("client-assets")
        .createSignedUrls(fileAssets.map((a) => a.file_name!), 60 * 60 * 24 * 7);
      if (urlData) {
        const map: Record<string, string> = {};
        for (const item of urlData) {
          const asset = fileAssets.find((a) => a.file_name === item.path);
          if (asset && item.signedUrl) map[asset.id] = item.signedUrl;
        }
        setSignedUrls(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user, resolvedProfile, profileLoading]);

  const toggleInUse = async (asset: PortalAsset) => {
    if (isViewingAsAdmin) return;
    const next = !asset.in_use;
    setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, in_use: next } : a)));
    const { error } = await supabase.from("client_assets").update({ in_use: next }).eq("id", asset.id);
    if (error) {
      setAssets((prev) => prev.map((a) => (a.id === asset.id ? { ...a, in_use: asset.in_use } : a)));
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    }
  };

  const saveDriveLink = async (planId: string) => {
    if (isViewingAsAdmin) return;
    setSavingDrive(planId);
    const url = driveDrafts[planId]?.trim() || null;
    const { error } = await supabase.from("client_project_plans").update({ drive_folder_url: url }).eq("id", planId);
    setSavingDrive(null);
    if (error) {
      toast({ title: "Failed to save link", description: error.message, variant: "destructive" });
      return;
    }
    setPlans((prev) => prev.map((p) => (p.id === planId ? { ...p, drive_folder_url: url } : p)));
    toast({ title: "Drive folder link saved" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
      </div>
    );
  }

  const groups: { key: string; title: string; planId: string | null }[] =
    plans.length > 0
      ? plans.map((p) => ({ key: p.id, title: p.project_name, planId: p.id }))
      : [{ key: "none", title: "Project Assets", planId: null }];
  // Assets with no plan_id (single-project clients, or anything not yet assigned)
  // render in their own leading section when the client has more than one plan,
  // so nothing silently disappears once a client becomes multi-plan.
  if (plans.length > 0 && assets.some((a) => a.plan_id === null)) {
    groups.unshift({ key: "unassigned", title: "Project Assets", planId: null });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-white">Your Assets</h1>

      {assets.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-8 text-center">
          <p className="text-white/60">No assets have been added to your project yet.</p>
        </div>
      ) : (
        groups.map((group) => {
          const groupAssets = assets.filter((a) => a.plan_id === group.planId);
          if (groupAssets.length === 0 && group.key !== "unassigned") return null;
          const plan = plans.find((p) => p.id === group.planId);
          return (
            <div key={group.key} className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-semibold text-white">{group.title}</h2>

              {plan && (
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <label className="text-sm text-white/60 shrink-0">Google Drive folder link</label>
                  <Input
                    value={driveDrafts[plan.id] ?? ""}
                    onChange={(e) => setDriveDrafts((prev) => ({ ...prev, [plan.id]: e.target.value }))}
                    placeholder="https://drive.google.com/..."
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button
                    size="sm"
                    disabled={isViewingAsAdmin || savingDrive === plan.id}
                    onClick={() => saveDriveLink(plan.id)}
                  >
                    {savingDrive === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              )}

              {groupAssets.length === 0 ? (
                <p className="text-sm text-white/40">No assets in this project yet.</p>
              ) : (
                <div className="space-y-2">
                  {groupAssets.map((asset) => (
                    <div key={asset.id} className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-white/5">
                      {asset.type === "file" ? (
                        signedUrls[asset.id] ? (
                          <img src={signedUrls[asset.id]} alt={asset.label} className="h-10 w-10 object-contain rounded bg-black/20 shrink-0" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-white/40 shrink-0" />
                        )
                      ) : (
                        <FileText className="h-5 w-5 text-white/40 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{asset.label}</p>
                        {asset.type === "text" && asset.content && (
                          <p className="text-xs text-white/50 truncate">{asset.content}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-white/50">{asset.in_use ? "In use" : "Not in use"}</span>
                        <Switch
                          checked={asset.in_use}
                          disabled={isViewingAsAdmin}
                          onCheckedChange={() => toggleInUse(asset)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default PortalAssets;
```

- [ ] **Step 2: Register the route in `src/App.tsx`**

Current (`src/App.tsx`, inside the `/portal` route group):
```tsx
              <Route path="projects" element={<PortalProjects />} />
              <Route path="tasks" element={<PortalTasks />} />
            </Route>
```
Replace with:
```tsx
              <Route path="projects" element={<PortalProjects />} />
              <Route path="tasks" element={<PortalTasks />} />
              <Route path="assets" element={<PortalAssets />} />
            </Route>
```

Add the import alongside the other portal page imports at the top of `src/App.tsx` (find the line importing `PortalProjects` and add directly below it):
```tsx
import PortalAssets from "@/pages/portal/PortalAssets";
```

- [ ] **Step 3: Add the nav item in `src/pages/portal/PortalLayout.tsx`**

Current (`src/pages/portal/PortalLayout.tsx`, `baseNavItems`):
```tsx
const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Bounty", url: "/portal/referrals", icon: GitBranch },
  { title: "Add-Ons", url: "/portal/add-ons", icon: Package },
  { title: "My Project", url: "/portal/projects", icon: FolderKanban },
  { title: "Tasks", url: "/portal/tasks", icon: ListTodo },
];
```
Replace with:
```tsx
const baseNavItems = [
  { title: "Overview", url: "/portal", icon: LayoutDashboard },
  { title: "Messages", url: "/portal/messages", icon: MessageSquare },
  { title: "Documents", url: "/portal/documents", icon: FolderOpen },
  { title: "Agreements", url: "/portal/agreements", icon: FileSignature },
  { title: "Payments", url: "/portal/payments", icon: CreditCard },
  { title: "Bounty", url: "/portal/referrals", icon: GitBranch },
  { title: "Add-Ons", url: "/portal/add-ons", icon: Package },
  { title: "My Project", url: "/portal/projects", icon: FolderKanban },
  { title: "Assets", url: "/portal/assets", icon: Image },
  { title: "Tasks", url: "/portal/tasks", icon: ListTodo },
];
```

Current (`src/pages/portal/PortalLayout.tsx`'s `lucide-react` import):
```tsx
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
Replace with:
```tsx
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
  Image,
} from "lucide-react";
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalAssets.tsx src/App.tsx src/pages/portal/PortalLayout.tsx
npm run dev
```
Manually: log in to the portal as (or view-as) a client with at least one asset and one project plan. Confirm the new "Assets" nav item appears and navigates to `/portal/assets`. Confirm assets render grouped under the correct plan name, the Drive-link input pre-fills if already set (from Task 2's manual test) and Save persists it (reload the page to confirm it's not just local state). Confirm toggling "In use" off/on persists (reload to confirm) and that the corresponding admin ClientDetail Assets tab (Task 2) shows the dimmed badge/state after a refresh. Confirm the `isViewingAsAdmin` read-only guard: while viewing-as-admin, the Switch and Save button are disabled (matching the existing read-only pattern used elsewhere in the portal, e.g. `PortalMessages.tsx`'s `sendMessage` guard).

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalAssets.tsx src/App.tsx src/pages/portal/PortalLayout.tsx
git commit -m "$(cat <<'EOF'
Add client-facing Assets tab with in_use toggle + Drive link field

New /portal/assets page, grouped by project plan (mirroring
PortalProjects.tsx's multi-plan pattern for clients like Irving with
two businesses under one login). Clients can toggle each asset's
in_use flag and save a per-plan Google Drive folder link — no upload/
delete/edit of label or content, that stays admin-only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
