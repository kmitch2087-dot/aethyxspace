# Claude Project API — Edge Function

One Supabase edge function (`claude-project-api`) that handles all 4 routes via internal path routing. Bearer-token auth, Zod validation, writes to existing tables (`project_tasks`, `project_updates`, `client_projects`).

## 1. Secret

Add `CLAUDE_API_TOKEN` (random 32-byte hex). Single shared token in `Authorization: Bearer <token>` header. All 4 routes check it via shared middleware before doing anything else.

## 2. File layout

```text
supabase/functions/claude-project-api/
  index.ts          // Hono app with all routes + auth middleware
```

`supabase/config.toml` — add `[functions.claude-project-api] verify_jwt = false` (we do our own bearer check; Claude Desktop won't have a Supabase JWT).

## 3. Routes

Base URL: `https://<project>.functions.supabase.co/claude-project-api`

| Method | Path | Body | Effect |
|---|---|---|---|
| POST | `/api/tasks/create` | `project_id`, `title`, `description?`, `assignee?` (admin\|client), `priority?` (low\|med\|high), `due_date?`, `client_profile_id?` | Insert into `project_tasks` with `created_by='claude'`, `source='claude'`. Also inserts a `project_updates` row (`kind='claude_update'`, summary `"Claude added task: {title}"`). |
| PATCH | `/api/tasks/update` | `task_id`, any of `title`, `description`, `status` (todo\|in_progress\|blocked\|done), `priority`, `assignee`, `due_date` | Update row. If `status='done'` set `completed_at=now()`. Insert matching `project_updates` row. |
| POST | `/api/updates/create` | `project_id`, `summary`, `kind?` (note\|status_change\|claude_update\|deploy, default `claude_update`), `payload?` (jsonb) | Insert into `project_updates` with `created_by='claude'`. |
| PATCH | `/api/projects/update` | `project_id`, any of `name`, `status`, `notes`, `current_phase`, `progress_pct` (0-100), `repo_url`, `dns_provider`, `hosting_provider`, `live_url`, `staging_url`, `lovable_url` | Update `client_projects`. Insert `project_updates` summarizing what changed. |

All responses: `{ ok: true, data }` or `{ ok: false, error }` with proper status codes (400 validation, 401 auth, 404 not-found, 500 server).

## 4. Auth middleware

```ts
app.use("*", async (c, next) => {
  const auth = c.req.header("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const expected = Deno.env.get("CLAUDE_API_TOKEN");
  if (!expected || !token || token !== expected) {
    return c.json({ ok: false, error: "Unauthorized" }, 401);
  }
  await next();
});
```

Uses Supabase service-role client (bypasses RLS — safe because the bearer check gates everything, and Claude is acting as you/admin).

## 5. Validation

Zod schemas per route. Reject unknown fields. Length caps (title ≤ 200, description/summary ≤ 5000, URLs ≤ 1000, must start with `http`). Enum checks for status/priority/assignee/kind. `progress_pct` clamped to 0–100. `project_id`/`task_id` must be valid UUIDs and must exist (404 otherwise).

## 6. Auto-derived fields

- Every task/project mutation also writes a `project_updates` row so the dashboard ticker reflects Claude activity in realtime.
- `client_profile_id` for tasks/updates is auto-filled from the parent project if not provided, so client-portal RLS visibility just works.

## 7. This step ships only

- The edge function file
- `config.toml` entry
- `CLAUDE_API_TOKEN` secret prompt

Out of scope for this step: MCP server, dashboard tabs, ticker UI, project pages — all still in the larger plan, deferred until you confirm this API works with Claude Desktop.

## 8. Test after deploy

```bash
curl -X POST https://<ref>.functions.supabase.co/claude-project-api/api/tasks/create \
  -H "Authorization: Bearer $CLAUDE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"project_id":"<uuid>","title":"Test from curl"}'
```
