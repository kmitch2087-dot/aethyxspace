# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev          # Start dev server at localhost:8080
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run tests once (vitest)
npm run test:watch   # Run tests in watch mode
```

Run a single test file: `npx vitest run src/path/to/file.test.ts`

## Architecture

This is a **Vite + React + TypeScript** SPA for **Aethyx** — a digital marketing/creative agency. It has three distinct areas:

### Public site (`/`)
Marketing pages: Home, Services, Portfolio, About, Contact, Blog, MedSpa, Intake form. All use `<Navbar>` / `<Footer>` and the `<GlobalBackground>` / `<GoldOrbsBackground>` visual layer rendered globally in `App.tsx`.

### Admin portal (`/admin/*`)
Protected by `<AdminRoute>` — redirects to `/admin/login` unless `useAuth().isAdmin` is true. Admin role is resolved by querying the `user_roles` table in Supabase. Layout in `src/pages/admin/AdminLayout.tsx`. Features: Dashboard, Blog manager, Inquiries, Clients + ClientDetail, Invoices, Agreements, Documents, Media, Intake form manager, Financials, Reviews.

### Client portal (`/portal/*`)
Protected by `<ClientRoute>` — any authenticated Supabase user (non-admin) lands here. Features: Overview, Messages, Documents, Agreements, Payments, Intake.

## Auth

`src/hooks/useAuth.tsx` provides `AuthProvider` (wraps the whole app). It exposes `{ user, session, isAdmin, loading, adminChecked }`. Always wait for both `loading === false` AND `adminChecked === true` before acting on `isAdmin` in admin-gated code — the admin check is async and fires separately from session hydration.

## Supabase

- Client: `src/integrations/supabase/client.ts` — import as `import { supabase } from "@/integrations/supabase/client"`
- Full typed schema: `src/integrations/supabase/types.ts` (auto-generated — do not edit). Tables missing from generated types are accessed via `(supabase as any).from("table")`.
- Migrations: `supabase/migrations/` — **naming rule**: after calling `apply_migration`, check `list_migrations` for the version Supabase actually assigned and name the local file exactly `<version>_<name>.sql` in the same turn. Do not approximate timestamps.
- Edge functions: `supabase/functions/` — one directory per function (Deno). Deploy via `supabase functions deploy <name> --project-ref jsdjcizqwwmtuhfnkvqq` (CLI is authenticated; `--no-verify-jwt` only for functions doing their own auth: `stripe-webhook`, `capture-expense-emails`). Shared CORS helper: `_shared/admin-cors.ts`.

Key tables: `user_roles`, `client_profiles`, `client_invoices`, `client_agreement_records` (in-app signing; `document_path` renders an uploaded PDF as the agreement body, `down_payment_invoice_id` links the auto-created invoice-on-sign; `client_agreements` is a separate legacy system), `client_documents` (`shared_with_client` gates client visibility — admin uploads from ClientDetail default to hidden), `client_document_slots`, `client_intakes`, `client_project_plans`/`_phases`/`_updates`/`_tasks`, `client_assets`, `client_messages`, `client_portal_seen_at`, `blog_posts`, `admin_documents`, `admin_media`, `contact_submissions`, `reviews`, `email_queue`/`email_send_log`, `financial_records` (income + expenses), `expense_email_senders`/`expense_email_seen` (Gmail receipt capture), `referrals`/`referral_links`, `bounty_applicants`, `app_private_config` (service-role-only key/value; holds the Gmail-scoped Google refresh token).

## Scheduled jobs (pg_cron)

- `stripe-sync-worker` — every minute, drives the managed Stripe integration.
- `capture-expense-emails-daily` — 11:15 UTC daily, scans Gmail for subscription receipts → `financial_records` expenses. Bearer secret lives in Vault (`expense_capture_secret`) mirrored as edge secret `EXPENSE_CAPTURE_SECRET`.

## Remaining planned work (`.lovable/plan.md`)

Most of the admin v2 plan has shipped (projects/tasks/portal routes/messaging/financials). Still open from it: Claude integration via a `claude-project-api` edge function and MCP server (`claude-mcp`, needs a `CLAUDE_API_TOKEN` secret), and edge-function dashboard widgets.

## Path alias

`@/` resolves to `src/`. Used throughout — always prefer `@/` imports over relative paths.

## UI components

shadcn/ui components live in `src/components/ui/`. Add new shadcn components via `npx shadcn-ui@latest add <component>`. Styling uses Tailwind CSS with the config at `tailwind.config.ts`.

## Testing

Tests use Vitest + jsdom + `@testing-library/react`. Setup file: `src/test/setup.ts`. Test files follow `*.test.ts` / `*.test.tsx` naming beside the source they test.

## Active Client Project Tracking

**Read this section at the start of every session.**

Aethyx has active client projects stored in Supabase (`client_project_plans`, `client_project_phases`, `client_project_updates`, `client_project_tasks`). These are visible in the admin dashboard at `/admin/projects` and in each client's profile Plan tab.

### Session start checklist
1. Check if a `.aethyx` config file exists in the current working directory — if so, read it to identify which client project this session is for.
2. If no `.aethyx` file: ask "Which client project are we working on today?" at a natural point early in the session, or skip if the session is clearly unrelated to client work.
3. Keep the client project context in mind throughout the session.

### When to update project progress
- **Automatically at session end** — before ending any session where client work was done, run `/update-projects` to post an update.
- **On demand** — when asked to "update the project", "log progress", or similar.

### How to update
Use the Supabase MCP tools or the Supabase client to:
1. Find the relevant `client_project_plans` row (by client_profile_id or plan id from `.aethyx`).
2. Review what was accomplished this session (git log, conversation context, files changed).
3. Update relevant `client_project_phases` completion percentages (0–100).
4. Recalculate and save `client_project_plans.completion_percent` as the average of all phases.
5. Insert a row into `client_project_updates` with a plain-English summary of what was done. Set `is_client_visible: true` only if the update is meaningful and ready for the client to see.
6. Update `client_project_plans.status` if the project moved from one stage to another.

### Schedule tracking
Each plan has `start_date` and `target_date` (agreed timeline, pulled from the signed agreement). Compare:
- `expected_pct = elapsed_days / total_days * 100`
- If `completion_percent < expected_pct - 10` → flag "behind schedule" in the update
- If `completion_percent > expected_pct + 5` → note "ahead of schedule"

### `.aethyx` config format (in client project repos)
```json
{
  "client_id": "uuid",
  "client_name": "Client Name",
  "project_plan_id": "uuid",
  "project_name": "Project Name",
  "aethyx_supabase_project": "jsdjcizqwwmtuhfnkvqq"
}
```
