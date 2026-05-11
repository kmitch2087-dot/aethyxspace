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
- Full typed schema: `src/integrations/supabase/types.ts` (auto-generated — do not edit)
- Migrations: `supabase/migrations/` (UUID-named files)
- Edge functions: `supabase/functions/` — one directory per function (Deno, deployed to Supabase)

Key tables: `user_roles`, `client_profiles`, `client_invoices`, `client_agreements`, `client_documents`, `client_intakes`, `client_projects`, `blog_posts`, `admin_documents`, `admin_media`, `contact_submissions`, `reviews`, `email_queue`.

## Planned work (`.lovable/plan.md`)

An admin v2 plan is in progress that adds: project/task management (`project_tasks`, `project_updates` tables), Claude integration via a `claude-project-api` edge function and MCP server (`claude-mcp`), edge function dashboard widgets, and new routes `/admin/projects`, `/portal/projects`, `/portal/tasks`. A `CLAUDE_API_TOKEN` secret is needed for the edge functions.

## Path alias

`@/` resolves to `src/`. Used throughout — always prefer `@/` imports over relative paths.

## UI components

shadcn/ui components live in `src/components/ui/`. Add new shadcn components via `npx shadcn-ui@latest add <component>`. Styling uses Tailwind CSS with the config at `tailwind.config.ts`.

## Testing

Tests use Vitest + jsdom + `@testing-library/react`. Setup file: `src/test/setup.ts`. Test files follow `*.test.ts` / `*.test.tsx` naming beside the source they test.
