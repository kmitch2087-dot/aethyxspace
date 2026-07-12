# Client-facing Assets Tab + Google Drive Folder Link

## Context

Third piece of the multi-business initiative (project-scoped assets and scraping enhancements with keywords/business-info extraction are already shipped). Clients currently have no way to see the brand assets (logos, files, text) Kristin has uploaded or scraped for their project, and no way to share a Google Drive folder of their own materials back to her. Irving Munoz's case — two separate businesses (Scotty's Adventures, Limitless Barbershop) under one portal login, tracked as two separate `client_project_plans` rows — is the reason every piece of this design is scoped per-plan rather than per-client.

`client_assets` already exists (`id, client_profile_id, plan_id, type, category, label, content, file_url, file_name, file_size, sort_order, bg_color`), already RLS-readable by the owning client (`ca_client_own`, SELECT only), and already grouped by `plan_id` in the admin's `ClientDetail.tsx` Assets tab (`planAssets`/`unassignedAssets`). This spec adds the client-facing half of that same view, plus a small new field.

## 1. What clients can do

View their own project's assets and toggle a per-asset "in use" flag. No upload, no delete, no edit of label/content from this tab — those remain admin-only actions in `ClientDetail.tsx`. Keeps this page a lightweight companion to the existing admin asset management, not a duplicate of it.

The "in use" toggle is a pure signal for Kristin — it sets `client_assets.in_use` (new column, default `true` so nothing existing looks newly excluded) and is displayed back to her as a dimmed/badged state in the admin Assets tab. No other feature (scraping, document generation, or anything else) reads this flag in this pass — keeping the toggle's contract simple and not coupling it to the not-yet-designed document-intelligence piece.

## 2. Google Drive folder link

`client_project_plans` gets a new nullable `drive_folder_url text` column — one link per project plan, not per client, so a two-business client like Irving can share a different folder for each. Editable by the client from the new Assets page (a labeled input + Save button near the top of each plan's asset section, pre-filled if already set). Displayed to Kristin as a clickable link in the corresponding plan's section of `ClientDetail.tsx`'s existing Assets tab — no separate admin page, no dashboard notification (kept out of scope to avoid coupling this to the just-shipped Dashboard "Needs Attention" work).

## 3. Schema changes

```sql
ALTER TABLE client_assets ADD COLUMN in_use boolean NOT NULL DEFAULT true;
ALTER TABLE client_project_plans ADD COLUMN drive_folder_url text;
```

Two new client-facing RLS policies are needed (currently clients only have `SELECT` on both tables):

```sql
CREATE POLICY "ca_client_update" ON client_assets FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "cpp_client_update" ON client_project_plans FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));
```

**Known, accepted tradeoff** (same pattern already live and accepted elsewhere in this app, e.g. `client_project_tasks`'s `cpt_client_update` policy): Postgres RLS `UPDATE` policies can't be scoped to individual columns. These two policies technically let an authenticated client rewrite any column on their own `client_assets`/`client_project_plans` rows via a crafted direct API call — not just `in_use`/`drive_folder_url`. The app's own UI (`PortalAssets.tsx`) will only ever send `{ in_use }` or `{ drive_folder_url }` in its update calls, so this isn't exploitable through the actual product surface. Not a new risk class introduced by this feature; consistent with the existing accepted pattern.

## 4. New page: `src/pages/portal/PortalAssets.tsx`

Route `/portal/assets`, new nav item added to `PortalLayout.tsx`'s existing nav list. Follows `PortalProjects.tsx`'s established pattern for multi-plan clients: fetch all of the client's `client_project_plans` rows, render one section per plan (heading = `project_name`), each section showing:
- The Drive folder link field (input + Save, pre-filled if `drive_folder_url` is already set).
- That plan's assets (`client_assets` where `plan_id` matches), each row showing the existing label/thumbnail/file info (reusing the same lightweight display conventions `ClientDetail.tsx` already uses for assets — thumbnail for file-type/image assets, text preview for text-type assets) plus an "In use" toggle switch.

Assets with `plan_id: null` (single-project / pre-multi-business clients, or anything not yet assigned to a specific plan) render in one ungrouped section rendered first, labeled generically (e.g. "Project Assets") when the client has only one plan — matching how a single-plan client currently sees everything else in the portal without any "which project" framing.

## 5. Admin-side additions to `ClientDetail.tsx`

Two small, additive changes to the existing Assets tab, no restructuring:
- Assets where `in_use === false` get a dimmed treatment + a small "Not in use" badge (matching the existing badge conventions already used elsewhere in this file).
- Each plan's asset section header gets the Drive folder link rendered as a clickable link (icon + "View Drive folder") when `drive_folder_url` is set on that plan; nothing shown when it isn't.

## Explicitly out of scope

- Uploading, deleting, or editing asset label/content from the client portal — admin-only, unchanged.
- The `in_use` flag driving any other feature's behavior (scraping, future document intelligence) — pure display signal only, in this pass.
- A dashboard notification/"Needs Attention" entry for newly-submitted Drive links.
- Validating that `drive_folder_url` is actually a real/reachable Google Drive URL — free-text field, same trust level as other client-submitted text fields in this app.
- Reassigning an existing asset from one project plan to a different one (tracked separately in the backlog as its own known gap, not part of this feature).
