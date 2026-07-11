# AI Asset Scraping → Auto-Populate Assets

## Context

This is Section 6 of the larger multi-section spec
(`docs/superpowers/specs/2026-07-11-bounty-dashboard-project-types.md`), done one section at a
time. Sections 2, 3, and 4 already shipped. This section is explicitly called out in the
original spec as an isolated workstream with no dependency on the others.

Reading the current repo before writing this spec found one consequential correction to the
original spec's assumption:

- **The original spec assumed Claude/Anthropic for summarization.** This app's only existing AI
  integration (`supabase/functions/ai-chat/index.ts`) actually calls **Google Gemini**
  (`gemini-2.5-flash`, via the OpenAI-compatible endpoint) using an already-configured
  `GEMINI_API_KEY` secret. There is no Anthropic key anywhere in this project. Decided during
  brainstorming: reuse Gemini rather than add a second AI provider and a new secret.
- **`client_assets`** (not `admin_media`, which the original spec offered as an alternate
  target) is clearly the right destination — it's already the client-specific brand asset
  table (`type: 'text' | 'file'`, `category` one of `brand_voice | tagline | motto | mission |
  values | logo | guideline | font | other`, used throughout `ClientDetail.tsx`'s existing
  Assets tab). `admin_media` is a separate, general admin media library, not client-scoped.
- **No `client_assets` category exists for "brand colors."** Decided during brainstorming:
  skip color extraction for this version rather than inventing a new category/storage shape
  for a nice-to-have — easy to add later if wanted.
- Admin-only role-check pattern already established in `supabase/functions/document-actions/index.ts`
  (verify JWT → look up `user_roles` for `role = 'admin'` → 403 otherwise) — this section's
  edge function follows the same pattern.

Out of scope: multi-page crawling (single page per scrape only), color extraction, any change
to the existing manual asset-upload flow in `ClientDetail.tsx` (this section adds a new,
separate entry point that ultimately writes to the same `client_assets` table via the same
kind of insert, not a replacement for manual upload).

## 1. Two new staging tables

Deliberately separate from `client_assets` — nothing here is client-visible or "real" until an
admin explicitly approves it, matching the original spec's explicit requirement that a review
step gates anything reaching a client-facing area.

```sql
CREATE TABLE client_asset_scrapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending | running | complete | failed
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE client_asset_scrape_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_id uuid NOT NULL REFERENCES client_asset_scrapes(id) ON DELETE CASCADE,
  kind text NOT NULL, -- 'image' | 'text'
  suggested_category text NOT NULL DEFAULT 'other',
  suggested_label text NOT NULL,
  content text, -- text value for kind='text'; storage path (in client-assets bucket) for kind='image'
  source_url text, -- original external image URL, for kind='image', kept for reference/debugging
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: admin-only on both tables, via the existing `has_role(auth.uid(), 'admin'::app_role)`
pattern — never a blanket `USING(true)`, avoiding the systemic RLS gap already flagged multiple
times this project. No client-facing policy at all; clients never see staged/unapproved
content.

## 2. New edge function `scrape-client-assets`

- **Auth**: same bearer-token → `user_roles` admin check as `document-actions`. 403 if not
  admin.
- **Input**: `{ clientProfileId: string, url: string }`.
- **URL validation / basic SSRF hardening**: reject anything that isn't `http`/`https`;
  resolve the hostname and reject private/loopback/link-local IP ranges (`127.0.0.0/8`,
  `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, etc.) before
  fetching — this is a server-side fetch of an admin-supplied URL, and while the caller is
  trusted, guarding against it being pointed at internal infrastructure is cheap and standard
  practice.
- **Fetch**: single page only (no crawling/following links). Reasonable timeout (e.g. 10s) and
  a capped response size.
- **Parse**: extract `<img src>` values (resolved against the page's base URL for relative
  paths), OpenGraph meta tags (`og:title`, `og:description`, `og:image`), and visible text
  (strip `<script>`/`<style>` content, collapse whitespace, cap length before sending
  anywhere).
- **Images**: download up to 10 (arbitrary but reasonable cap — avoids downloading every
  tracking pixel/icon on a page) into `client-assets` storage under
  `_scrapes/{scrapeId}/{n}.{ext}`, inserting one `client_asset_scrape_items` row per image
  (`kind: 'image'`, `suggested_category: 'logo'` for the first/largest or an OG-image match,
  `'other'` otherwise).
- **Text**: send the extracted text + OG data to Gemini (same model/endpoint as `ai-chat`,
  reusing `GEMINI_API_KEY`) with a prompt asking it to identify distinct brand-relevant blurbs
  (tagline, mission statement, brand voice notes, etc.) and suggest a `category` (constrained
  to the existing `AssetCategory` values) and short `label` for each. Insert one
  `client_asset_scrape_items` row per suggested blurb (`kind: 'text'`).
- **Status**: `client_asset_scrapes.status` set to `running` at start, `complete` or `failed`
  (`error_message` populated) at the end. The whole operation runs synchronously within one
  request/response — no background job/polling needed at this scale (single page, ≤10
  images, one Gemini call).

## 3. Admin UI (`ClientDetail.tsx`'s Assets tab)

- **"Scrape from URL" button** → a dialog asking for the URL → calls the edge function,
  shows a loading state for the duration of the (synchronous) request, then surfaces the
  result.
- **Review panel**: lists this client's `pending` `client_asset_scrape_items` (most recent
  scrape, or all pending across scrapes — simplest: just show all `pending` items for this
  client regardless of which scrape they came from). Each item shows its content/thumbnail,
  suggested category/label (editable before approving — admin can correct a bad guess), and
  Approve/Reject actions.
  - **Approve**: inserts a real `client_assets` row using the item's (possibly edited)
    category/label/content — for `kind: 'text'`, `type: 'text'` with `content`; for
    `kind: 'image'`, `type: 'file'` with `file_url` pointing at the already-downloaded
    `_scrapes/...` storage path (left in place, not moved — the existing asset-serving code
    already fetches by storage path regardless of which folder it's under). Then marks the
    staging item `status: 'approved'`.
  - **Reject**: marks the staging item `status: 'rejected'` — kept for audit, not deleted;
    hidden from the default pending view.

## Explicitly out of scope

- Multi-page crawling — one page per scrape job.
- Brand color extraction — no category to hold it yet; revisit later if wanted.
- Any change to the existing manual "add asset" flow already in `ClientDetail.tsx` — this is
  a new, additive entry point that happens to write to the same table on approval.
- A background job queue for long-running scrapes — the synchronous single-request model is
  sufficient at this scale (single page, capped image count, one Gemini call).
