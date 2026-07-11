# Scrape Enhancements: Keywords/Phrases + Business Info Extraction

## Context

Second of four sequenced pieces from the multi-business initiative (first — project-scoped `client_assets` via `plan_id` — already shipped). Two approved decisions from earlier discussion:

- **Keywords/phrases**: a new optional field in the existing "Scrape from URL" dialog. Blank = today's exact behavior (generic brand-blurb extraction). When filled, steers the same single-page Gemini extraction toward the given topics — still one page fetch, no crawling (an earlier alternative — actually crawling multiple pages to search for the keywords — was explicitly declined in favor of keeping this single-page).
- **Richer extraction**: the scrape should also pull business contact information, hours, practitioner/employee names and positions, and "any relevant information" — not just brand-voice-style blurbs.

Now that assets are project-scoped (`client_assets.plan_id`, shipped), scrapes should be too — a scrape is inherently "for this business," and its keywords/results should stick with whichever project it was actually run for, not whatever project tab happens to be selected later when an admin gets around to reviewing pending items.

## 1. Schema

```sql
ALTER TABLE client_asset_scrapes ADD COLUMN keywords text;
ALTER TABLE client_asset_scrapes ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;
```

Both nullable — `keywords` because it's optional, `plan_id` for the same reason `client_assets.plan_id` is nullable (a scrape triggered before this migration, or for a client with no plan selected, has no project to attribute to).

`client_asset_scrape_items` is unchanged — items don't need their own `plan_id`; they inherit it from their parent scrape at approval time (see below).

## 2. New `AssetCategory` values

The existing category enum (`brand_voice | tagline | motto | mission | values | logo | guideline | font | other`) has nothing suited to contact info, hours, or staff — everything would land in the `other` catch-all, which defeats the point of being able to browse/filter for "what are this client's hours" later. Adding three new categories:

- `contact_info` — phone numbers, email addresses, physical addresses
- `hours` — business/operating hours
- `staff` — practitioner/employee names and their positions/titles/roles

Each gets its own badge color in `assetCategoryInfo()`, matching the existing style, and appears in the "Add Text Asset" manual-entry dropdown too (so admin can add these by hand, not just via scrape). `other` remains the catch-all for anything genuinely useful that doesn't fit the above.

No DB migration needed for this — `client_assets.category` is a plain `text` column with no CHECK constraint; this is a TypeScript-level (and Gemini-prompt-level) change only.

## 3. Edge function (`scrape-client-assets`) changes

- Accepts two new optional request fields: `keywords: string | null`, `planId: string | null`.
- Persists both on the `client_asset_scrapes` insert (at job-creation time, before the fetch even happens).
- The Gemini prompt is restructured to explicitly enumerate what to look for, one line per category, and raises the item cap from 5 to 10 given the richer ask:
  - brand identity (brand_voice, tagline, motto, mission, values) — unchanged from today
  - `contact_info` — phone/email/address
  - `hours` — operating hours
  - `staff` — names + positions/titles (one item per person, or grouped if clearly listed together)
  - `other` — anything else genuinely useful
  - Explicit instruction: skip categories with no real content on the page — don't invent or guess.
  - When `keywords` is non-blank, append a line: "Prioritize content related to: {keywords}."
- `validCategories` (the server-side allowlist Gemini's output is checked against before insert) gains the three new values.

## 4. Admin UI (`ClientDetail.tsx`)

- "Scrape from URL" dialog gets a new optional field: "Keywords / phrases to focus on" (free text, comma-separated, e.g. `pricing, class schedule, teacher bios`), placed under the URL field.
- The scrape request sends `keywords` (trimmed, or `null` if blank) and `planId: plan?.id ?? null` (the currently-selected project at trigger time).
- **Approval uses the scrape's own `plan_id`, not whatever's currently selected**: `fetchPendingScrapeItems` is extended to also select `plan_id` on the scrape query and attach it to each item it returns (items don't have their own `plan_id` column; this is done in application code by joining scrape→items). `approveScrapeItem` tags the new `client_assets` row with `item.scrape_plan_id ?? plan?.id ?? null` — prefer the scrape's own recorded project, fall back to whatever's currently selected only if the scrape predates this feature (no `plan_id` recorded).

## Explicitly out of scope

- Multi-page crawling — still one page per scrape.
- Keyword-based image filtering — images are still picked by the existing heuristic (first image / OG-image = likely logo), keywords don't change that.
- Structured fields for contact info/hours/staff (e.g., a dedicated `phone`/`email`/`hours` column on `client_assets`) — these land as regular text assets with the new categories, same shape as every other text asset, browsable/editable the same way.
- Retroactively re-running old scrapes to backfill `plan_id`/`keywords` on historical `client_asset_scrapes` rows — new column stays NULL for anything scraped before this ships.
