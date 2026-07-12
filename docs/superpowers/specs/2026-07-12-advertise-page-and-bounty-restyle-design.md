# Advertise Page + Traffic Tracking + Bounty Restyle — Design

Date: 2026-07-12
Status: Approved by Kristin (in-session)

## Goal

1. A public `/advertise` page selling ad space to partners, showing **real first-party
   traffic stats that update in real time**.
2. Restyle `/bounty` to match the Home page's visual language and make it more captivating.
3. (Follow-on, separate deliverable) a sales/UI/UX audit of the public site.

## Piece 1 — First-party traffic tracking (prerequisite)

The site has no page-view tracking today; the only traffic signal is the self-reported
`traffic_clicks` buttons on Home. The Advertise page needs real data.

### Schema

**`page_views`** (new table)
- `id uuid pk default gen_random_uuid()`
- `path text not null` (capped at 300 chars via RLS check)
- `referrer text` (capped at 500)
- `session_id uuid not null` (random per browser session, stored in `sessionStorage`)
- `device text` (`mobile` | `desktop`)
- `created_at timestamptz default now()`

RLS: enabled. Anon/authenticated may **INSERT only** (with length caps and a
`created_at` within ±5 min guard, matching the `bounty_applicants` pattern). No SELECT
policy — raw rows are never client-readable (privacy).

**`get_traffic_stats()`** — `SECURITY DEFINER` RPC, `GRANT EXECUTE TO anon`.
Returns a single JSON object of aggregates only:
- `views_today`, `views_7d`, `views_30d`
- `unique_visitors_30d` (distinct `session_id`)
- `top_pages` (top 5 paths by views, last 30 days)
- `sources` (breakdown from existing `traffic_clicks`, last 30 days)
- `total_views` (all time)

**`advertiser_inquiries`** (new table)
- `id`, `company_name`, `contact_name`, `email`, `phone`, `website_url`, `message`,
  `status text default 'new'`, `created_at`
- RLS: anon INSERT with length caps; admin (`has_role(auth.uid(),'admin')`) SELECT/UPDATE.

Migration applied remotely via `apply_migration` AND committed locally with the exact
14-digit version name Supabase assigns (per the 2026-07-12 migration-naming lesson).

### Client tracking

`src/hooks/usePageTracking.ts` — on every route change (react-router `useLocation`):
- Skip `/admin*` and `/portal*` (public traffic only — that's what partners are buying).
- Session id: `sessionStorage["aethyx_sid"]`, random UUID, created on first view.
- Fire-and-forget insert; failures are swallowed (tracking must never break the site).
- Path-filter logic extracted as a pure `shouldTrackPath()` util with a unit test.

Wired once in `App.tsx` inside the router.

## Piece 2 — `/advertise` page

`src/pages/Advertise.tsx`, route in `App.tsx`, "Advertise" link added to Footer.

Visual language mirrors Home: ghost wordmark hero ("PARTNER"), tracked-out uppercase
kickers, `font-display` black headlines with `text-outline` accent line, `border-t
border-border/20` sections, rounded-full CTAs.

Sections, in order:
1. **Hero** — kicker "Partner with Aethyx", headline "Put your brand in front of / an audience that builds." + one-line pitch + CTA scrolling to the inquiry form.
2. **Live stats band** — animated count-up tiles (views today / last 30 days / unique
   visitors / all-time) with a pulsing "LIVE" dot. Polls `get_traffic_stats()` every 30 s.
   Top pages + traffic-source breakdown shown beneath as smaller bars. All numbers are
   genuine first-party data starting from launch day — honest, and grows daily.
3. **Why advertise** — 3 cards (engaged audience of founders/business owners, premium
   design context, transparent real-time numbers).
4. **Placements** — Homepage feature, Sponsored blog post, Partner spotlight. Custom
   pricing ("inquire"), consistent with Aethyx's custom-pricing positioning.
5. **Inquiry form** — company, name, email, phone (opt), website (opt), message →
   `advertiser_inquiries`. Success state matches Bounty's "Application received" card.

**Admin visibility:** a compact "Advertising inquiries" section added to
`/admin/inquiries` (list + status flip new → contacted → closed) so leads are never lost.

## Piece 3 — Bounty restyle (display-only)

Same data flow, form fields, validation, and insert — zero schema/logic changes.
New presentation in the Home language:
- Full-height hero with ghost "BOUNTY" wordmark, kicker "Earn with Aethyx", giant
  display headline ("Know someone who needs / a serious website?"), reward headline
  numbers pulled from `referral_program_settings` as before.
- Reward tiers as a "how it works" 3-step + hover-glow cards styled like Home's
  services grid (icon chip, `bg-card/40`, `hover:border-primary/50`).
- Eligibility notes and the application form inside a bordered glass section with the
  rounded-full submit CTA.

## Testing

- Unit test for `shouldTrackPath()`.
- `npm run build` + `npm run test` green before each push.
- Manual: RPC returns sane JSON (live SQL check); anon cannot SELECT `page_views`
  (advisor check via `get_advisors` after migration).

## Out of scope

- Payment/checkout for ad slots, ad-serving itself, analytics dashboards in admin,
  bot filtering beyond the trivial, historical backfill (no data exists).
