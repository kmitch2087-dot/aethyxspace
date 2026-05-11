
# Admin Dashboard v2 + Project/Task System + Claude Integration

## 1. Dashboard restructure (`/admin`)

New tab layout (replaces single-page Dashboard):

- **Overview** (default) — KPI cards (existing) + Traffic Sources + Social/Sharing block + **Project Task Ticker** (see §3) + **Edge Function widgets** (see §2).
- **Assistant** — moves `<AdminAssistant />` here (its own tab, full-height chat).
- **Social / Sharing** — keep existing content.
- **Analytics** — site analytics block (page views, top pages, referrers) sourced from `traffic_clicks` + a new lightweight `page_views` table (anon insert from a `<PageViewTracker />` already implicit in router) — initially shows what we have; expandable later.

## 2. Edge Function widgets

A grid of clickable cards, one per deployed edge function (auto-discovered from `supabase/functions/*`). Each widget shows:

- Function name + short description (from a small static map in `src/lib/edgeFunctionsMeta.ts` so we control copy).
- Status dot (last invocation success/error) and last-run timestamp.
- Click → opens a drawer with: description, recent invocations, last 20 log lines (via a new `edge-fn-stats` edge function that calls Supabase Management API), and a **"Open in backend"** button.

Curated descriptions for all current functions: `ai-chat`, `create-admin-invoice`, `create-client`, `create-consultation-payment`, `create-invoice-payment-intent`, `create-service-payment`, `dispatch-doc-event`, `document-actions`, `handle-email-suppression`, `handle-email-unsubscribe`, `invoice-actions`, `merge-client-profiles`, `notify-portal-activation`, `preview-transactional-email`, `process-document-schedules`, `process-email-queue`, `provision-client-portal`, `send-consultation-invoice`, `send-transactional-email`, `sitemap`, `stripe-sync`, `stripe-webhook`, `submit-waiting-list`, `sync-stripe-customer`, `upload-review-photo`.

## 3. Projects + Tasks (clients ↔ admin)

`client_projects` already exists. Extend with:

- `project_tasks` — `id`, `project_id`, `client_profile_id`, `title`, `description`, `assignee` (`admin` | `client`), `status` (`todo` | `in_progress` | `blocked` | `done`), `priority` (`low|med|high`), `due_date`, `completed_at`, `created_by` (`admin` | `client` | `claude`), `source` (`manual|claude|portal`), timestamps.
- `project_updates` — `id`, `project_id`, `kind` (`status_change|note|claude_update|deploy`), `summary`, `payload jsonb`, `created_at`.
- Extend `client_projects` with `repo_url`, `dns_provider`, `hosting_provider`, `live_url`, `staging_url`, `current_phase`, `progress_pct`.

RLS: admin all; clients see rows where `client_profile_id` belongs to them (read for projects/updates, read+update-own-status for `project_tasks` where `assignee='client'`).

### Admin UI
- New **`/admin/projects`** page (and detail `/admin/projects/:id`): list, create, edit projects; kanban of tasks; updates timeline; quick fields for repo/DNS/hosting.
- `ClientDetail.tsx` gains a Projects tab + Tasks-for-client tab where admin can "Request from client" (creates `project_tasks` with `assignee='client'`).

### Client Portal UI
- New **`/portal/projects`** route — read-only timeline of project evolution + live status/progress + repo/live links if shared.
- New **`/portal/tasks`** route — client's open requests from admin (upload media, send copy, paste credentials into a secure note field, etc.) with mark-complete + comment.

### Project Task Ticker (dashboard)
Single ticker with three filter chips:
1. **Mine** — `project_tasks.assignee='admin'` and not done.
2. **Waiting on client** — `project_tasks.assignee='client'` and not done.
3. **Activity** — last 20 `project_updates` (incl. Claude-pushed updates).

Live updates via Supabase Realtime on `project_tasks` and `project_updates`.

## 4. Claude integration (Both API + MCP)

### A. REST endpoint — `claude-project-api` edge function
Single endpoint, token-auth via header `X-Claude-Token` (new secret `CLAUDE_API_TOKEN`). Verb in body:

```
POST /functions/v1/claude-project-api
{ "action": "list_projects" | "get_project" | "update_project" |
            "add_task" | "update_task" | "complete_task" |
            "add_update" | "list_open_tasks",
  "params": { ... } }
```

Returns JSON. All writes recorded with `created_by='claude'` and emit a `project_updates` row so the ticker shows them live.

### B. MCP server — `claude-mcp` edge function
Built with `mcp-lite` (Streamable HTTP). Exposes tools:
`list_projects`, `get_project`, `update_project_status`, `set_project_phase`,
`add_task`, `complete_task`, `list_open_tasks`, `add_project_update`,
`set_repo_url`, `set_dns`, `set_hosting`.
Authenticated via the same `CLAUDE_API_TOKEN` (header at MCP transport level).

User adds it to Claude Desktop / claude.ai with the function URL + token. From then on, while you work with Claude, you can say "mark Aethyx project as in review and add a task to compress hero video" and the ticker updates instantly.

### C. Optional GitHub link
`repo_url` on a project can be a GitHub URL. (No GitHub OAuth in v1 — Claude pushes commits directly via its own GitHub access; we just store the link and surface it to the client.)

## 5. Files to add / change (technical)

### New
- DB migration: `project_tasks`, `project_updates`, extend `client_projects` (+RLS, realtime publication).
- Edge functions: `claude-project-api`, `claude-mcp`, `edge-fn-stats`.
- Pages: `src/pages/admin/Projects.tsx`, `src/pages/admin/ProjectDetail.tsx`, `src/pages/portal/PortalProjects.tsx`, `src/pages/portal/PortalTasks.tsx`.
- Components: `src/components/admin/ProjectTaskTicker.tsx`, `src/components/admin/EdgeFunctionsGrid.tsx`, `src/components/admin/EdgeFunctionDrawer.tsx`, `src/lib/edgeFunctionsMeta.ts`.

### Edited
- `src/pages/admin/Dashboard.tsx` — split into tabs (Overview / Assistant / Social / Analytics), wire ticker + widgets.
- `src/pages/admin/AdminLayout.tsx` — add **Projects** sidebar item.
- `src/App.tsx` — register new admin + portal routes.
- `src/pages/admin/ClientDetail.tsx` — Projects + Client Tasks tabs.
- `src/pages/portal/PortalLayout.tsx` — sidebar links: Projects, Tasks.

## 6. Out of scope (v1)
- Per-user GitHub OAuth (user's Claude already has repo access).
- Time tracking / billing on tasks.
- Editing edge function code from the widget — link to backend instead.

## 7. New secret needed
- `CLAUDE_API_TOKEN` — random 32-byte token. I'll request it after migration approval so both the REST endpoint and MCP server share the same auth.
