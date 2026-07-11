# Scrape Keywords + Business Info Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin optionally steer the existing single-page website scrape with keywords/phrases, extract richer business information (contact info, hours, staff names/positions) alongside the existing brand-voice-style blurbs, and make scrapes project-scoped so approved items land in whichever business the scrape was actually run for.

**Architecture:** `client_asset_scrapes` gains two nullable columns (`keywords`, `plan_id`) set at scrape-trigger time. The edge function's Gemini prompt is restructured to explicitly enumerate categories to look for (raising the item cap from 5 to 10) and optionally appends a "prioritize" instruction when keywords are given. Three new `AssetCategory` values (`contact_info`, `hours`, `staff`) are added end-to-end (type, badge colors, manual-add dropdown, Gemini's allowlist). Approval uses the scrape's own recorded `plan_id` (fetched alongside pending items) rather than whatever project tab happens to be selected at review time.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + Edge Functions/Deno), Google Gemini (`gemini-2.5-flash`, existing integration), shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Still one page fetch per scrape — no crawling, no following links beyond the existing single-redirect-hop SSRF-guarded behavior already in place.
- Keywords never change which images get selected — only the Gemini text-extraction prompt.
- `keywords` and `plan_id` on `client_asset_scrapes` are both nullable — do not make either required.
- Do not add a new AI provider/secret — reuses the existing `GEMINI_API_KEY`.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — `keywords` + `plan_id` on `client_asset_scrapes`

**Files:**
- Create: `supabase/migrations/20260711_scrape_keywords_and_plan.sql`

**Interfaces:**
- Produces: `client_asset_scrapes.keywords`, `client_asset_scrapes.plan_id` — consumed by Tasks 2 and 4.

- [ ] **Step 1: Write the migration**

```sql
-- Scrape enhancements: optional keywords to steer extraction, and project-scoping
-- so a scrape's approved items land in whichever business it was actually run for
-- (not whatever project tab happens to be selected later at review time).
ALTER TABLE client_asset_scrapes ADD COLUMN keywords text;
ALTER TABLE client_asset_scrapes ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "scrape_keywords_and_plan"`.

- [ ] **Step 3: Verify**

```sql
SELECT column_name, is_nullable, data_type FROM information_schema.columns
WHERE table_name = 'client_asset_scrapes' AND column_name IN ('keywords', 'plan_id');
```
Expected: both columns present, both `is_nullable = YES`, `keywords` is `text`, `plan_id` is `uuid`.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_scrape_keywords_and_plan.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add keywords and plan_id columns to client_asset_scrapes

Both nullable. keywords lets an admin steer the scrape's Gemini text
extraction; plan_id records which business/project the scrape was
run for, so approval can use the scrape's own recorded project
instead of whatever tab happens to be selected later.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Edge function — keywords steering + richer extraction categories

**Files:**
- Modify: `supabase/functions/scrape-client-assets/index.ts`

**Interfaces:**
- Consumes: `client_asset_scrapes.keywords`/`.plan_id` (Task 1).
- Produces: request body now accepts `keywords`/`planId`; response shape unchanged (`{ ok, scrapeId, imageCount, textCount, geminiError }`) — consumed by Task 4.

- [ ] **Step 1: Accept and persist `keywords`/`planId`**

Current (the body-parsing block):
```ts
    const body = await req.json();
    const clientProfileId = String(body.clientProfileId || "");
    const sourceUrl = String(body.url || "");
    if (!clientProfileId || !sourceUrl) return json({ error: "clientProfileId and url required" }, 400, cors);
```
Replace with:
```ts
    const body = await req.json();
    const clientProfileId = String(body.clientProfileId || "");
    const sourceUrl = String(body.url || "");
    const keywords = body.keywords ? String(body.keywords).trim().slice(0, 500) : null;
    const planId = body.planId ? String(body.planId) : null;
    if (!clientProfileId || !sourceUrl) return json({ error: "clientProfileId and url required" }, 400, cors);
```

Current (the scrape-row insert):
```ts
    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({ client_profile_id: clientProfileId, source_url: sourceUrl, status: "running" })
      .select("id")
      .single();
```
Replace with:
```ts
    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({ client_profile_id: clientProfileId, source_url: sourceUrl, status: "running", keywords, plan_id: planId })
      .select("id")
      .single();
```

- [ ] **Step 2: Restructure the Gemini prompt for richer categories + optional keyword steering**

Current:
```ts
        const prompt = `You are helping tag brand content scraped from a client's website for a design agency. Given the extracted page text and any OpenGraph metadata below, identify up to 5 distinct, meaningful brand-relevant blurbs (e.g. a tagline, mission statement, brand voice sample, "about" copy). For each, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].

OpenGraph title: ${ogTags.title || "(none)"}
OpenGraph description: ${ogTags.description || "(none)"}

Page text:
${visibleText}`;
```
Replace with:
```ts
        const keywordLine = keywords ? `\nPrioritize content related to: ${keywords}.\n` : "";
        const prompt = `You are helping tag brand and business content scraped from a client's website for a design agency. Given the extracted page text and any OpenGraph metadata below, identify meaningful, distinct pieces of information in these categories:
- brand_voice, tagline, motto, mission, values: brand identity content
- contact_info: phone numbers, email addresses, physical addresses
- hours: business/operating hours
- staff: practitioner/employee names and their positions/titles/roles (one item per person, or grouped if clearly listed together)
- other: any other genuinely useful business information not covered above

Extract up to 10 distinct items total. Skip categories with no real content on the page — do not invent or guess.
${keywordLine}
For each item, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, contact_info, hours, staff, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].

OpenGraph title: ${ogTags.title || "(none)"}
OpenGraph description: ${ogTags.description || "(none)"}

Page text:
${visibleText}`;
```

- [ ] **Step 3: Expand `validCategories`**

Current:
```ts
              const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "other"]);
```
Replace with:
```ts
              const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "contact_info", "hours", "staff", "other"]);
```

- [ ] **Step 4: Deploy and verify**

Deploy via the Supabase MCP `deploy_edge_function` tool (same `verify_jwt: true` and full repo-relative path convention used in prior deploys of this function — check `list_edge_functions` for the current version/settings before deploying to match them). Confirm via `list_edge_functions` that the version incremented.

No live end-to-end test is expected to be possible in this environment (no admin JWT, consistent with every prior task touching this function this session) — verify by careful reading of the prompt-construction logic and the `keywords`/`planId` plumbing instead, and note the limitation in the report.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/scrape-client-assets/index.ts
git commit -m "$(cat <<'EOF'
Add keyword steering and richer business-info extraction to scrapes

Accepts optional keywords/planId in the request, persists both on the
scrape row. Gemini prompt now explicitly asks for contact info, hours,
and staff names/positions alongside the existing brand-voice-style
blurbs (cap raised 5 -> 10 items), and appends a "prioritize" line
when keywords are given. Still one page fetch, no crawling — keywords
only steer what Gemini looks for on the same page.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `ClientDetail.tsx` — new `AssetCategory` values

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` — the `AssetCategory` type (line 133), `assetCategoryInfo()` (lines 226-239), the "Add Text Asset" category dropdown (lines 3358-3365)

**Interfaces:**
- Produces: `contact_info`/`hours`/`staff` as valid `AssetCategory` values, each with a badge color — consumed by Task 4 (scraped items using these categories need somewhere sensible to render) and by the manual "Add Text Asset" flow.

- [ ] **Step 1: Extend the `AssetCategory` type**

Current (line 133):
```tsx
type AssetCategory = "brand_voice" | "tagline" | "motto" | "mission" | "values" | "logo" | "guideline" | "font" | "other";
```
Replace with:
```tsx
type AssetCategory = "brand_voice" | "tagline" | "motto" | "mission" | "values" | "contact_info" | "hours" | "staff" | "logo" | "guideline" | "font" | "other";
```

- [ ] **Step 2: Add badge colors in `assetCategoryInfo()`**

Current (lines 226-239):
```tsx
function assetCategoryInfo(category: AssetCategory): { classes: string; label: string } {
  const map: Record<AssetCategory, { classes: string; label: string }> = {
    brand_voice: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Brand Voice" },
    tagline: { classes: "bg-purple-100 text-purple-700 border-purple-200", label: "Tagline" },
    motto: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Motto" },
    mission: { classes: "bg-green-100 text-green-700 border-green-200", label: "Mission" },
    values: { classes: "bg-orange-100 text-orange-700 border-orange-200", label: "Values" },
    logo: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Logo" },
    guideline: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Guidelines" },
    font: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Font" },
    other: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Other" },
  };
  return map[category] ?? map.other;
}
```
Replace with (three new entries added after `values`, colors chosen distinct from existing ones — pink for contact info, amber for hours, indigo for staff):
```tsx
function assetCategoryInfo(category: AssetCategory): { classes: string; label: string } {
  const map: Record<AssetCategory, { classes: string; label: string }> = {
    brand_voice: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Brand Voice" },
    tagline: { classes: "bg-purple-100 text-purple-700 border-purple-200", label: "Tagline" },
    motto: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Motto" },
    mission: { classes: "bg-green-100 text-green-700 border-green-200", label: "Mission" },
    values: { classes: "bg-orange-100 text-orange-700 border-orange-200", label: "Values" },
    contact_info: { classes: "bg-pink-100 text-pink-700 border-pink-200", label: "Contact Info" },
    hours: { classes: "bg-amber-100 text-amber-700 border-amber-200", label: "Hours" },
    staff: { classes: "bg-indigo-100 text-indigo-700 border-indigo-200", label: "Staff" },
    logo: { classes: "bg-teal-100 text-teal-700 border-teal-200", label: "Logo" },
    guideline: { classes: "bg-blue-100 text-blue-700 border-blue-200", label: "Guidelines" },
    font: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Font" },
    other: { classes: "bg-gray-100 text-gray-600 border-gray-200", label: "Other" },
  };
  return map[category] ?? map.other;
}
```

- [ ] **Step 3: Add the three categories to the manual "Add Text Asset" dropdown**

Current (lines 3358-3365):
```tsx
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="brand_voice">Brand Voice</SelectItem>
                  <SelectItem value="tagline">Tagline</SelectItem>
                  <SelectItem value="motto">Motto</SelectItem>
                  <SelectItem value="mission">Mission Statement</SelectItem>
                  <SelectItem value="values">Brand Values</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
```
Replace with:
```tsx
                <SelectContent style={lightVars} className="bg-white text-black">
                  <SelectItem value="brand_voice">Brand Voice</SelectItem>
                  <SelectItem value="tagline">Tagline</SelectItem>
                  <SelectItem value="motto">Motto</SelectItem>
                  <SelectItem value="mission">Mission Statement</SelectItem>
                  <SelectItem value="values">Brand Values</SelectItem>
                  <SelectItem value="contact_info">Contact Info</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
```
Expected: clean (no other code references the closed `AssetCategory` union in a way that would break from adding new members — verify by checking there's no exhaustiveness-checking `switch` over `AssetCategory` elsewhere in the file that would now warn about missing cases; if one exists, add the three new cases there too and note it in the report).

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add contact_info, hours, staff asset categories

New AssetCategory values with their own badge colors, available in
the manual "Add Text Asset" dropdown. No DB migration needed —
client_assets.category is a plain text column with no CHECK
constraint, this is a TypeScript/UI-level change only.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `ClientDetail.tsx` — keywords field + project-scoped scrape approval

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` — scrape state (line 337), `fetchPendingScrapeItems` (lines 861-900), `handleScrape` (lines 902-925), `approveScrapeItem` (search for this function — its two `client_assets` insert sites), the "Scrape from URL" dialog (lines 3322-3345)

**Interfaces:**
- Consumes: `client_asset_scrapes.keywords`/`.plan_id` (Task 1), the edge function's new `keywords`/`planId` request fields (Task 2), the new `AssetCategory` values (Task 3, for correct rendering — no code change needed there, just confirms Task 3 landed first).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add keywords state**

Near the existing scrape state (line 337, `const [scrapeUrl, setScrapeUrl] = useState("");`), add:
```tsx
  const [scrapeKeywords, setScrapeKeywords] = useState("");
```

- [ ] **Step 2: Send `keywords`/`planId` in the scrape request**

Current `handleScrape` (lines 902-925):
```tsx
  const handleScrape = async () => {
    if (!profile || !scrapeUrl.trim()) return;
    setScraping(true);
    const { data, error } = await supabase.functions.invoke("scrape-client-assets", {
      body: { clientProfileId: profile.id, url: scrapeUrl.trim() },
    });
    setScraping(false);
    if (error || !data?.ok) {
      toast({ title: "Scrape failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    if (data.textCount === 0 && data.geminiError) {
      toast({
        title: "Scrape partially complete",
        description: `Found ${data.imageCount} image(s), but text extraction failed: ${data.geminiError}`,
      });
    } else {
      toast({
        title: "Scrape complete",
        description: `Found ${data.imageCount} image(s) and ${data.textCount} text item(s) for review.`,
      });
    }
    setScrapeDialogOpen(false);
    setScrapeUrl("");
    fetchPendingScrapeItems();
  };
```
Replace with:
```tsx
  const handleScrape = async () => {
    if (!profile || !scrapeUrl.trim()) return;
    setScraping(true);
    const { data, error } = await supabase.functions.invoke("scrape-client-assets", {
      body: {
        clientProfileId: profile.id,
        url: scrapeUrl.trim(),
        keywords: scrapeKeywords.trim() || null,
        planId: plan?.id ?? null,
      },
    });
    setScraping(false);
    if (error || !data?.ok) {
      toast({ title: "Scrape failed", description: error?.message || data?.error, variant: "destructive" });
      return;
    }
    if (data.textCount === 0 && data.geminiError) {
      toast({
        title: "Scrape partially complete",
        description: `Found ${data.imageCount} image(s), but text extraction failed: ${data.geminiError}`,
      });
    } else {
      toast({
        title: "Scrape complete",
        description: `Found ${data.imageCount} image(s) and ${data.textCount} text item(s) for review.`,
      });
    }
    setScrapeDialogOpen(false);
    setScrapeUrl("");
    setScrapeKeywords("");
    fetchPendingScrapeItems();
  };
```

- [ ] **Step 3: Add the keywords field to the "Scrape from URL" dialog**

Current (lines 3322-3345):
```tsx
      {/* Scrape from URL */}
      <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Scrape from URL</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-black">Client website URL</Label>
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white text-black border-black/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extracts images and brand copy for your review — nothing goes live until you approve it below.
              </p>
            </div>
            <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()} className="w-full">
              {scraping && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {scraping ? "Scraping…" : "Scrape"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```
Replace with:
```tsx
      {/* Scrape from URL */}
      <Dialog open={scrapeDialogOpen} onOpenChange={setScrapeDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Scrape from URL</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-black">Client website URL</Label>
              <Input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com"
                className="bg-white text-black border-black/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Extracts images and brand copy for your review — nothing goes live until you approve it below.
              </p>
            </div>
            <div>
              <Label className="text-black">Keywords / phrases to focus on <span className="text-black/40 text-xs">(optional)</span></Label>
              <Input
                value={scrapeKeywords}
                onChange={(e) => setScrapeKeywords(e.target.value)}
                placeholder="pricing, class schedule, teacher bios"
                className="bg-white text-black border-black/20"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank to auto-extract everything relevant. Still scans the same page — doesn't search other pages.
              </p>
            </div>
            <Button onClick={handleScrape} disabled={scraping || !scrapeUrl.trim()} className="w-full">
              {scraping && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {scraping ? "Scraping…" : "Scrape"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 4: Attach the scrape's `plan_id` to each pending item**

Current `fetchPendingScrapeItems` (lines 861-900):
```tsx
  const fetchPendingScrapeItems = async () => {
    if (!id) return;
    setScrapeItemsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scrapes } = await (supabase as any)
      .from("client_asset_scrapes")
      .select("id")
      .eq("client_profile_id", id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrapeIds = (scrapes || []).map((s: any) => s.id);
    if (!scrapeIds.length) {
      setPendingScrapeItems([]);
      setScrapeItemsLoading(false);
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
      .from("client_asset_scrape_items")
      .select("*")
      .in("scrape_id", scrapeIds)
      .eq("status", "pending")
      .order("created_at");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (items || []) as any[];
    setPendingScrapeItems(rows);
    setScrapeItemsLoading(false);

    const imageItems = rows.filter((r) => r.kind === "image");
    if (imageItems.length) {
      const { data: signed } = await supabase.storage
        .from("client-assets")
        .createSignedUrls(imageItems.map((r) => r.content), 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        const match = imageItems.find((r) => r.content === s.path);
        if (match && s.signedUrl) map[match.id] = s.signedUrl;
      });
      setScrapeItemUrls(map);
    }
  };
```
Replace with (selects `plan_id` alongside `id` from the scrapes query, builds a scrapeId→planId map, and attaches `scrape_plan_id` onto each item):
```tsx
  const fetchPendingScrapeItems = async () => {
    if (!id) return;
    setScrapeItemsLoading(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scrapes } = await (supabase as any)
      .from("client_asset_scrapes")
      .select("id, plan_id")
      .eq("client_profile_id", id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scrapeRows = (scrapes || []) as any[];
    const scrapeIds = scrapeRows.map((s) => s.id);
    if (!scrapeIds.length) {
      setPendingScrapeItems([]);
      setScrapeItemsLoading(false);
      return;
    }
    const scrapePlanById: Record<string, string | null> = {};
    scrapeRows.forEach((s) => { scrapePlanById[s.id] = s.plan_id ?? null; });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
      .from("client_asset_scrape_items")
      .select("*")
      .in("scrape_id", scrapeIds)
      .eq("status", "pending")
      .order("created_at");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((items || []) as any[]).map((item) => ({
      ...item,
      scrape_plan_id: scrapePlanById[item.scrape_id] ?? null,
    }));
    setPendingScrapeItems(rows);
    setScrapeItemsLoading(false);

    const imageItems = rows.filter((r) => r.kind === "image");
    if (imageItems.length) {
      const { data: signed } = await supabase.storage
        .from("client-assets")
        .createSignedUrls(imageItems.map((r) => r.content), 3600);
      const map: Record<string, string> = {};
      (signed || []).forEach((s) => {
        const match = imageItems.find((r) => r.content === s.path);
        if (match && s.signedUrl) map[match.id] = s.signedUrl;
      });
      setScrapeItemUrls(map);
    }
  };
```

- [ ] **Step 5: Use the scrape's own `plan_id` when approving an item**

Find `approveScrapeItem` (search for `const approveScrapeItem`). Its parameter type needs `scrape_plan_id` added, and both of its `client_assets` insert calls need to prefer `item.scrape_plan_id` over the currently-selected `plan`:

Current signature:
```tsx
  const approveScrapeItem = async (item: { id: string; kind: string; suggested_category: string; suggested_label: string; content: string | null }) => {
```
Replace with:
```tsx
  const approveScrapeItem = async (item: { id: string; kind: string; suggested_category: string; suggested_label: string; content: string | null; scrape_plan_id: string | null }) => {
```

Both insert calls inside this function currently include `plan_id: plan?.id ?? null,` (added by the prior project-scoped-assets work) — change both to:
```tsx
        plan_id: item.scrape_plan_id ?? plan?.id ?? null,
```
(Search for both occurrences of `plan_id: plan?.id ?? null,` inside `approveScrapeItem` specifically — there are two, one in the text-item insert branch and one in the file-item insert branch — and replace each with the line above. Do not change any other `plan_id: plan?.id ?? null,` occurrence elsewhere in the file, such as in `addTextAsset`, `uploadFileAsset`, or `handleLogoUpload` — those correctly always use the currently-selected plan since they have no scrape to inherit from.)

- [ ] **Step 6: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Manually test: trigger a scrape with keywords filled in against a real client site, confirm the request includes `keywords`/`planId` (check via browser devtools network tab if possible, or trust the code trace if not). Confirm pending review items render with the new categories' badge colors when Gemini suggests `contact_info`/`hours`/`staff`. Confirm approving an item tags the resulting `client_assets` row with the scrape's own `plan_id` (verify via Supabase MCP `execute_sql` against a real test scrape) rather than whatever plan tab is currently selected — this is easiest to verify by triggering a scrape while Plan A is selected, switching to Plan B, then approving an item and confirming the resulting asset's `plan_id` matches Plan A, not Plan B.

- [ ] **Step 7: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add keywords field and project-scoped approval to the scrape UI

"Scrape from URL" dialog gets an optional keywords/phrases field,
sent alongside the currently-selected project's id. Pending review
items now carry their parent scrape's recorded plan_id, and approval
uses that instead of whichever project tab happens to be selected at
review time — so switching tabs between triggering a scrape and
reviewing its results can't misattribute the approved asset.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
