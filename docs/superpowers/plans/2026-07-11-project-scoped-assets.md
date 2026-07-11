# Project-Scoped Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let `client_assets` (logos, brand voice, taglines, brand files) belong to a specific project/business (`client_project_plans` row) instead of one shared pool per client login — the foundation a client running multiple distinct businesses under one portal login (confirmed: Irving Munoz, "Website Project" + "Limitless Barbershop - Google Ads Management") actually needs.

**Architecture:** A single nullable `plan_id` column on `client_assets`, backfilled automatically for every client with exactly one project plan (unambiguous), left `NULL` for the one client with multiple plans (Irving — reassigned manually via the new UI, not guessed). `ClientDetail.tsx`'s Assets tab becomes scoped to whichever project plan is currently selected, reusing the exact same `plan` variable the Documents tab already uses. Assets with no plan yet show in a small "Unassigned" section with a one-click reassign action.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS), shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- `plan_id` is nullable — do not make it `NOT NULL` (breaks the intentional "unassigned, needs manual reassignment" state for Irving's existing assets).
- No RLS changes needed — `ca_admin` (`has_role`-gated) and `ca_client_own` (client-own-profile-scoped) both already correctly scope by `client_profile_id`, unaffected by an additional nullable sibling column.
- Do not touch `client_document_slots` — it already handles multi-project-type via namespaced `slot_type` keys, a separate, already-shipped mechanism from a prior branch. This plan is `client_assets` only.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — `plan_id` column + backfill

**Files:**
- Create: `supabase/migrations/20260711_client_assets_plan_id.sql`

**Interfaces:**
- Produces: `client_assets.plan_id` column — consumed by Task 2.

- [ ] **Step 1: Write the migration**

```sql
-- Assets (logos, brand voice, taglines, brand files) become scoped to a specific
-- project/business instead of one shared pool per client login — needed for any
-- client running multiple distinct businesses under one portal login (confirmed:
-- Irving Munoz has both a Website Project and a separate Limitless Barbershop
-- Google Ads project).
ALTER TABLE client_assets ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;

-- Backfill: only for clients with exactly one project plan, where the assignment
-- is unambiguous. Clients with multiple plans (as of this migration: only Irving
-- Munoz) are deliberately left NULL rather than guessed at — reassigned manually
-- via the new "Unassigned" section in ClientDetail.tsx's Assets tab.
UPDATE client_assets ca
SET plan_id = (
  SELECT id FROM client_project_plans cpp
  WHERE cpp.client_profile_id = ca.client_profile_id
)
WHERE ca.client_profile_id IN (
  SELECT client_profile_id FROM client_project_plans
  GROUP BY client_profile_id
  HAVING count(*) = 1
);
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "client_assets_plan_id"`.

- [ ] **Step 3: Verify**

Run via Supabase MCP `execute_sql`:
```sql
SELECT column_name, is_nullable, data_type FROM information_schema.columns
WHERE table_name = 'client_assets' AND column_name = 'plan_id';

-- Confirm single-plan clients got backfilled, multi-plan client (Irving) did not
SELECT ca.client_profile_id, count(*) AS total_assets,
  count(*) FILTER (WHERE ca.plan_id IS NOT NULL) AS assigned,
  count(*) FILTER (WHERE ca.plan_id IS NULL) AS unassigned
FROM client_assets ca
GROUP BY ca.client_profile_id;
```
Expected: `plan_id` exists, nullable, `uuid`. For Carvalho Wellness (`ff3e0ce6-7de9-4825-894a-6d09a0383459`) and Pournogravy (`47560dcc-d95b-4824-a2bd-c8456c646ec4`), `unassigned` should be 0 (fully backfilled). For Irving Munoz (`dfc292ae-50ed-408e-aa53-5a162cbcddf9`), if he has any existing assets, `assigned` should be 0 and `unassigned` should equal his total (correctly left alone). If Irving has zero assets today, he simply won't appear in this query's results — that's fine, not an error.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_client_assets_plan_id.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add plan_id to client_assets for multi-business scoping

Nullable FK to client_project_plans, ON DELETE SET NULL. Backfilled
automatically for every client with exactly one project plan
(unambiguous); left NULL for clients with multiple plans (only Irving
Munoz today) rather than guessed at — reassigned manually via the
admin UI once it ships.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: `ClientDetail.tsx` — scope the Assets tab by selected plan

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` — `ClientAsset` interface (line 135), `handleLogoUpload` (lines 1375-1410), `addTextAsset` (lines 796-819), `uploadFileAsset` (lines 821-856), `approveScrapeItem` (lines 926-970), the `textAssets`/`fileAssets` derivation (lines 1422-1423), and the Assets tab render (starting line 1977)

**Interfaces:**
- Consumes: `client_assets.plan_id` (Task 1), the existing `plan` variable (line 349: `allPlans.find((p) => p.id === selectedPlanId) || allPlans[0] || null`).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add `plan_id` to the `ClientAsset` interface**

Current (lines 135-147):
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
}
```
Add `plan_id: string | null;` after `bg_color`:
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

- [ ] **Step 2: Tag new text/file assets with the currently-selected plan**

`addTextAsset` (lines 796-819), the insert call (lines 800-807):
```tsx
    const { error } = await (supabase as any).from("client_assets").insert({
      client_profile_id: profile.id,
      type: "text",
      category: textAssetCategory,
      label: textAssetLabel.trim(),
      content: textAssetContent.trim(),
      sort_order: assets.filter((a) => a.type === "text").length,
    });
```
Add `plan_id: plan?.id ?? null,` after `client_profile_id: profile.id,`:
```tsx
    const { error } = await (supabase as any).from("client_assets").insert({
      client_profile_id: profile.id,
      plan_id: plan?.id ?? null,
      type: "text",
      category: textAssetCategory,
      label: textAssetLabel.trim(),
      content: textAssetContent.trim(),
      sort_order: assets.filter((a) => a.type === "text").length,
    });
```

`uploadFileAsset` (lines 821-856), the insert call (lines 835-844) — same change, add `plan_id: plan?.id ?? null,` after `client_profile_id: profile.id,`:
```tsx
    const { error: insErr } = await (supabase as any).from("client_assets").insert({
      client_profile_id: profile.id,
      plan_id: plan?.id ?? null,
      type: "file",
      category: fileAssetCategory,
      label: fileAssetLabel.trim(),
      file_name: storagePath,
      file_url: urlData?.signedUrl || "",
      file_size: fileAssetFile.size,
      sort_order: assets.filter((a) => a.type === "file").length,
    });
```

- [ ] **Step 3: Tag approved scrape items with the currently-selected plan**

`approveScrapeItem` (lines 926-970) has two insert call sites — the text branch (lines 931-938) and the file branch (lines 949-957). Add `plan_id: plan?.id ?? null,` after `client_profile_id: profile.id,` in both:

Text branch, current:
```tsx
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "text",
        category: item.suggested_category,
        label: item.suggested_label,
        content: item.content,
        sort_order: assets.filter((a) => a.type === "text").length,
      });
```
becomes:
```tsx
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        plan_id: plan?.id ?? null,
        type: "text",
        category: item.suggested_category,
        label: item.suggested_label,
        content: item.content,
        sort_order: assets.filter((a) => a.type === "text").length,
      });
```

File branch, current:
```tsx
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "file",
        category: item.suggested_category,
        label: item.suggested_label,
        file_name: item.content,
        file_url: urlData?.signedUrl || "",
        sort_order: assets.filter((a) => a.type === "file").length,
      });
```
becomes:
```tsx
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        plan_id: plan?.id ?? null,
        type: "file",
        category: item.suggested_category,
        label: item.suggested_label,
        file_name: item.content,
        file_url: urlData?.signedUrl || "",
        sort_order: assets.filter((a) => a.type === "file").length,
      });
```

- [ ] **Step 4: Fix `handleLogoUpload` to be plan-scoped**

This is a real bug this task must fix, not just a nice-to-have: today, `handleLogoUpload` (lines 1375-1410) finds "the existing logo" via `assets.find((a) => a.category === 'logo' && a.type === 'file')` with no plan scoping at all — for a client with multiple businesses (Irving), replacing one business's logo would find and delete whichever logo happens to be first in the array, potentially destroying a *different* business's logo.

Current (lines 1375-1410):
```tsx
  const handleLogoUpload = async (file: File) => {
    if (!profile) return;
    setLogoUploading(true);
    const existingLogo = assets.find((a) => a.category === 'logo' && a.type === 'file');
    if (existingLogo) {
      if (existingLogo.file_name) {
        await supabase.storage.from('client-assets').remove([existingLogo.file_name]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_assets').delete().eq('id', existingLogo.id);
    }
    const storagePath = `${profile.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('client-assets').upload(storagePath, file);
    if (upErr) {
      setLogoUploading(false);
      toast({ title: 'Logo upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: urlData } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_assets').insert({
      client_profile_id: profile.id,
      type: 'file',
      category: 'logo',
      label: 'Primary Logo',
      file_name: storagePath,
      file_url: urlData?.signedUrl || '',
      file_size: file.size,
      sort_order: 0,
    });
    setLogoUploading(false);
    toast({ title: 'Logo uploaded' });
    fetchAll();
```
Replace with:
```tsx
  const handleLogoUpload = async (file: File) => {
    if (!profile) return;
    setLogoUploading(true);
    const existingLogo = assets.find((a) => a.category === 'logo' && a.type === 'file' && a.plan_id === (plan?.id ?? null));
    if (existingLogo) {
      if (existingLogo.file_name) {
        await supabase.storage.from('client-assets').remove([existingLogo.file_name]);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('client_assets').delete().eq('id', existingLogo.id);
    }
    const storagePath = `${profile.id}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage.from('client-assets').upload(storagePath, file);
    if (upErr) {
      setLogoUploading(false);
      toast({ title: 'Logo upload failed', description: upErr.message, variant: 'destructive' });
      return;
    }
    const { data: urlData } = await supabase.storage
      .from('client-assets')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('client_assets').insert({
      client_profile_id: profile.id,
      plan_id: plan?.id ?? null,
      type: 'file',
      category: 'logo',
      label: 'Primary Logo',
      file_name: storagePath,
      file_url: urlData?.signedUrl || '',
      file_size: file.size,
      sort_order: 0,
    });
    setLogoUploading(false);
    toast({ title: 'Logo uploaded' });
    fetchAll();
```

- [ ] **Step 5: Add plan-scoped derivations and an `assignAssetToPlan` handler**

Current (lines 1422-1423):
```tsx
  const textAssets = assets.filter((a) => a.type === "text");
  const fileAssets = assets.filter((a) => a.type === "file");
```
Replace with:
```tsx
  const planAssets = assets.filter((a) => a.plan_id === (plan?.id ?? null));
  const unassignedAssets = assets.filter((a) => a.plan_id === null);
  const textAssets = planAssets.filter((a) => a.type === "text");
  const fileAssets = planAssets.filter((a) => a.type === "file");
```

Add a new handler near `deleteAsset`/`saveAssetLabel` (after `saveAssetBgColor`, or any convenient spot alongside the other asset handlers):
```tsx
  const assignAssetToPlan = async (asset: ClientAsset) => {
    if (!plan) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from("client_assets").update({ plan_id: plan.id }).eq("id", asset.id);
    if (error) {
      toast({ title: "Failed to assign", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Assigned to ${plan.project_name}` });
    fetchAll();
  };
```

- [ ] **Step 6: Update the Primary Logo lookup to be plan-scoped**

Current (line 1984):
```tsx
              const logoAsset = assets.find((a) => a.category === 'logo' && a.type === 'file');
```
Replace with:
```tsx
              const logoAsset = planAssets.find((a) => a.category === 'logo' && a.type === 'file');
```

- [ ] **Step 7: Disable Add/Scrape actions and render the "Unassigned" section when there's no selected plan**

Add a guard right after the `TabsContent value="assets"` opening tag (line 1977), before the Primary Logo `<div>` (line 1978), rendering an explanatory message in place of the whole tab body when `!plan`:
```tsx
        <TabsContent value="assets" className="mt-4 space-y-6">
          {!plan ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              This client has no project yet — assets are scoped to a project, so create one first (Plan tab).
            </p>
          ) : (
            <>
```
This means the rest of the existing Assets tab JSX (Primary Logo through the closing of File Assets) needs to be wrapped inside this new `<>...</>` fragment. The tab's closing tag is at line 2310 (confirmed: `</TabsContent>`, immediately followed by a blank line and the next tab's `{/* PLAN */}` comment) — insert `</>` on its own line immediately before that `</TabsContent>`, i.e. between the existing closing `</div>` at line 2309 and the `</TabsContent>` at line 2310:
```tsx
          </div>
            </>
          )}
        </TabsContent>
```

Disable the "Add Text Asset" button (line 2105-2107) and "Upload File" button (line 2146-2148) when there's no plan is now redundant given the whole tab body is hidden without a plan — no additional per-button disabling needed there. But the "Scrape from URL" button and the two dialogs it opens are triggered from inside this same now-conditionally-rendered block, so no additional guard is needed there either — the `!plan` branch above already prevents reaching any of these buttons.

Add the "Unassigned" section — insert it as the first thing inside the `<>` fragment (i.e., right after the opening `<>`, before the `{/* Primary Logo */}` comment), so it's visible regardless of which plan is selected:
```tsx
              {unassignedAssets.length > 0 && (
                <div className="border border-amber-300 bg-amber-50 rounded-xl p-4">
                  <h3 className="font-display text-sm tracking-wider text-amber-800 mb-3">
                    Unassigned Assets ({unassignedAssets.length})
                  </h3>
                  <p className="text-xs text-amber-700 mb-3">
                    These assets aren't linked to a specific project yet — assign each to the project it belongs to.
                  </p>
                  <div className="space-y-2">
                    {unassignedAssets.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between gap-3 bg-white rounded-lg px-3 py-2 border border-amber-200">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{asset.label}</p>
                          <p className="text-xs text-muted-foreground">{assetCategoryInfo(asset.category).label} · {asset.type}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => assignAssetToPlan(asset)}>
                          Assign to {plan.project_name}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Primary Logo */}
```

- [ ] **Step 8: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Manually test against:
1. Carvalho Wellness or Pournogravy (single-plan clients) — confirm the Assets tab shows exactly the same assets as before this change (fully backfilled, nothing appears unassigned), and adding a new text/file asset correctly tags it with that one plan's id.
2. Irving Munoz (multi-plan client) — confirm the Assets tab shows only assets belonging to whichever plan is currently selected via the plan-switcher, confirm any pre-existing assets of his show in the "Unassigned" section (if he has any) with a working "Assign to {project name}" button, and confirm uploading a new logo/asset while "Limitless Barbershop" is selected does not affect/delete anything tagged to "Website Project" (and vice versa).
3. A client with zero project plans, if one exists, or by temporarily testing the `!plan` branch — confirm the Assets tab shows the explanatory message instead of erroring.

- [ ] **Step 9: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Scope the admin Assets tab to the currently-selected project

Text/file assets, scrape-approved items, and the Primary Logo now
belong to whichever project plan is selected (reusing the same plan
variable the Documents tab already uses), instead of one shared pool
per client login. Fixes a real bug along the way: handleLogoUpload's
"find the existing logo to replace" lookup had no plan scoping at all,
so replacing one business's logo could delete a different business's
logo for a client running multiple businesses. Assets with no plan
yet (existing multi-plan clients' pre-existing rows) show in a new
"Unassigned" section with a one-click reassign action.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
