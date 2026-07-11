# AI Asset Scraping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin trigger a scrape of a client's website that stages candidate images/text as review items (never touching the client's live assets directly), then approve/reject each into the real `client_assets` table.

**Architecture:** Two new admin-only tables hold scrape jobs and their extracted candidate items. A new edge function (`scrape-client-assets`) does the actual work synchronously: validates the URL (basic SSRF guard), fetches and regex-parses the page (no headless browser), downloads up to 10 images into the existing `client-assets` bucket under a `_scrapes/{scrapeId}/` prefix, and calls the existing Gemini integration (reusing `GEMINI_API_KEY`) to suggest labeled/categorized text blurbs. `ClientDetail.tsx`'s Assets tab gets a "Scrape from URL" trigger and a review panel that promotes approved items into real `client_assets` rows using the exact same insert shape the existing manual-add flows already use.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + RLS + Storage + Edge Functions/Deno), Google Gemini (existing integration), shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not in generated types use `(supabase as any).from("table_name")` until types are regenerated.
- No unit tests expected for the UI tasks (Supabase-backed admin page, matching this codebase's established convention). The edge function has no existing test harness in this repo either — verify it via direct invocation (`supabase functions invoke` or an HTTP call via the Supabase MCP-adjacent tooling) against a real, safe test URL, not via a new test framework.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch Stripe, billing, or the deposit/checkout flow.
- Do not implement color extraction or multi-page crawling — explicitly out of scope for this pass.
- Reuse `GEMINI_API_KEY` (already configured) — do not introduce a new Anthropic key/secret.
- The edge function must never insert directly into `client_assets` — only into the two new staging tables. Only the admin UI's explicit approve action (Task 4) writes to `client_assets`.

---

### Task 1: Migration — staging tables

**Files:**
- Create: `supabase/migrations/20260711_client_asset_scrapes.sql`

**Interfaces:**
- Produces: `client_asset_scrapes` (`id, client_profile_id, source_url, status, error_message, created_at, completed_at`), `client_asset_scrape_items` (`id, scrape_id, kind, suggested_category, suggested_label, content, source_url, status, created_at`), both admin-only via `has_role`. Tasks 2-4 depend on these existing.

- [ ] **Step 1: Write the migration file**

```sql
CREATE TABLE client_asset_scrapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE client_asset_scrape_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_id uuid NOT NULL REFERENCES client_asset_scrapes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  suggested_category text NOT NULL DEFAULT 'other',
  suggested_label text NOT NULL,
  content text,
  source_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_asset_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_asset_scrape_items ENABLE ROW LEVEL SECURITY;

-- Admin-only, correctly scoped via has_role — never a blanket USING(true).
CREATE POLICY "cas_admin_all" ON client_asset_scrapes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "casi_admin_all" ON client_asset_scrape_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "client_asset_scrapes"` and the SQL body above.

- [ ] **Step 3: Verify**

Run via Supabase MCP `execute_sql`:

```sql
select table_name, column_name from information_schema.columns
where table_name in ('client_asset_scrapes', 'client_asset_scrape_items')
order by table_name, ordinal_position;

select tablename, policyname, cmd from pg_policies
where tablename in ('client_asset_scrapes', 'client_asset_scrape_items');
```

Expected: both tables' full column lists match the schema above; exactly one policy per table, both `FOR ALL`, both referencing `has_role(auth.uid(), 'admin'::app_role)`.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_client_asset_scrapes.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add staging tables for AI-assisted asset scraping

client_asset_scrapes tracks scrape jobs; client_asset_scrape_items
holds extracted candidates pending admin review. Both admin-only via
has_role — nothing here is client-visible or promoted into real
client_assets rows automatically.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Edge function `scrape-client-assets`

**Files:**
- Create: `supabase/functions/scrape-client-assets/index.ts`

**Interfaces:**
- Consumes: `client_asset_scrapes`/`client_asset_scrape_items` (Task 1), the existing `_shared/admin-cors.ts` helper, the `client-assets` storage bucket, `GEMINI_API_KEY`.
- Produces: the function's HTTP contract (`POST { clientProfileId, url } → { ok: true, scrapeId, imageCount, textCount }` or `{ ok: false, error }`) — consumed by Task 3.

- [ ] **Step 1: Write the edge function**

```typescript
// supabase/functions/scrape-client-assets/index.ts
// Admin-only: scrape a client's website URL, stage extracted images/text as
// pending client_asset_scrape_items for review — never writes to client_assets directly.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const MAX_IMAGES = 10;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS = 8000;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

// Basic SSRF guard: block obvious private/loopback/link-local hosts. Not exhaustive
// (doesn't resolve DNS to catch a hostname that resolves to a private IP), but blocks
// the straightforward cases of someone pointing this at internal infrastructure directly.
function isPrivateOrLoopback(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = parseInt(ipv4[1]);
    const b = parseInt(ipv4[2]);
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
    if (a === 127) return true;
  }
  return false;
}

function stripTagsToText(html: string): string {
  let s = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  s = s.replace(/\s+/g, " ").trim();
  return s.slice(0, MAX_TEXT_CHARS);
}

function extractImages(html: string, baseUrl: string): string[] {
  const urls = new Set<string>();
  const re = /<img[^>]+src=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) && urls.size < MAX_IMAGES * 3) {
    try {
      urls.add(new URL(m[1], baseUrl).toString());
    } catch {
      // ignore invalid/relative-without-base src values
    }
  }
  return Array.from(urls).slice(0, MAX_IMAGES);
}

function extractOgTags(html: string): Record<string, string> {
  const tags: Record<string, string> = {};
  const re1 = /<meta[^>]+(?:property|name)=["']og:(title|description|image)["'][^>]+content=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(html))) tags[m[1]] = m[2];
  const re2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:(title|description|image)["']/gi;
  while ((m = re2.exec(html))) tags[m[2]] = m[1];
  return tags;
}

Deno.serve(async (req: Request) => {
  const cors = getCors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    if (!userData.user) return json({ error: "Auth required" }, 401, cors);
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403, cors);

    const body = await req.json();
    const clientProfileId = String(body.clientProfileId || "");
    const sourceUrl = String(body.url || "");
    if (!clientProfileId || !sourceUrl) return json({ error: "clientProfileId and url required" }, 400, cors);

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(sourceUrl);
    } catch {
      return json({ error: "Invalid URL" }, 400, cors);
    }
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return json({ error: "URL must be http or https" }, 400, cors);
    }
    if (isPrivateOrLoopback(parsedUrl.hostname)) {
      return json({ error: "URL not allowed" }, 400, cors);
    }

    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({ client_profile_id: clientProfileId, source_url: sourceUrl, status: "running" })
      .select("id")
      .single();
    if (scrapeInsertErr || !scrapeRow) {
      return json({ error: "Could not start scrape" }, 500, cors);
    }
    const scrapeId = scrapeRow.id;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let pageResp: Response;
      try {
        pageResp = await fetch(parsedUrl.toString(), { signal: controller.signal, redirect: "follow" });
      } finally {
        clearTimeout(timeout);
      }
      if (!pageResp.ok) throw new Error(`Fetch failed: ${pageResp.status}`);
      const html = await pageResp.text();

      const imageUrls = extractImages(html, parsedUrl.toString());
      const ogTags = extractOgTags(html);
      const visibleText = stripTagsToText(html);

      let imageCount = 0;
      for (let i = 0; i < imageUrls.length; i++) {
        try {
          const imgResp = await fetch(imageUrls[i]);
          if (!imgResp.ok) continue;
          const blob = await imgResp.blob();
          if (blob.size === 0 || blob.size > MAX_IMAGE_BYTES) continue;
          const ext = (imageUrls[i].split(".").pop() || "png").split("?")[0].slice(0, 5);
          const storagePath = `_scrapes/${scrapeId}/${i}.${ext}`;
          const { error: upErr } = await admin.storage.from("client-assets").upload(storagePath, blob);
          if (upErr) continue;
          const isLikelyLogo = i === 0 || imageUrls[i] === ogTags.image;
          await admin.from("client_asset_scrape_items").insert({
            scrape_id: scrapeId,
            kind: "image",
            suggested_category: isLikelyLogo ? "logo" : "other",
            suggested_label: isLikelyLogo ? "Logo (scraped)" : `Image ${i + 1} (scraped)`,
            content: storagePath,
            source_url: imageUrls[i],
            status: "pending",
          });
          imageCount++;
        } catch {
          // skip this one image, keep going with the rest
        }
      }

      let textCount = 0;
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (GEMINI_API_KEY && visibleText.length > 40) {
        const prompt = `You are helping tag brand content scraped from a client's website for a design agency. Given the extracted page text and any OpenGraph metadata below, identify up to 5 distinct, meaningful brand-relevant blurbs (e.g. a tagline, mission statement, brand voice sample, "about" copy). For each, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].

OpenGraph title: ${ogTags.title || "(none)"}
OpenGraph description: ${ogTags.description || "(none)"}

Page text:
${visibleText}`;

        try {
          const geminiResp = await fetch(
            "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({
                model: "gemini-2.5-flash",
                messages: [{ role: "user", content: prompt }],
                stream: false,
              }),
            },
          );
          if (geminiResp.ok) {
            const geminiJson = await geminiResp.json();
            const text = geminiJson?.choices?.[0]?.message?.content || "";
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
            const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "other"]);
            for (const item of items) {
              if (!item?.content || typeof item.content !== "string") continue;
              const category = validCategories.has(item.category) ? item.category : "other";
              await admin.from("client_asset_scrape_items").insert({
                scrape_id: scrapeId,
                kind: "text",
                suggested_category: category,
                suggested_label: String(item.label || "Scraped content").slice(0, 200),
                content: String(item.content).slice(0, 5000),
                status: "pending",
              });
              textCount++;
            }
          }
        } catch (err) {
          console.warn("Gemini extraction failed, continuing without text items:", err);
        }
      }

      await admin
        .from("client_asset_scrapes")
        .update({ status: "complete", completed_at: new Date().toISOString() })
        .eq("id", scrapeId);
      return json({ ok: true, scrapeId, imageCount, textCount }, 200, cors);
    } catch (err) {
      await admin
        .from("client_asset_scrapes")
        .update({
          status: "failed",
          error_message: err instanceof Error ? err.message : "Unknown error",
          completed_at: new Date().toISOString(),
        })
        .eq("id", scrapeId);
      return json({ ok: false, error: "Scrape failed", scrapeId }, 500, cors);
    }
  } catch (err) {
    console.error("[scrape-client-assets]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
```

- [ ] **Step 2: Deploy the function**

Use the Supabase MCP `deploy_edge_function` tool for `scrape-client-assets`.

- [ ] **Step 3: Verify with a real invocation**

Use the Supabase MCP `execute_sql` tool to find a real admin user's id (`select user_id from user_roles where role = 'admin' limit 1`), and a real client profile id to test against (pick one you're comfortable running a real scrape for — this will actually fetch a live URL and write real staging rows, which is expected and fine to leave in place for Task 4 to review against).

Invoke the function directly via `curl` (you'll need a valid admin JWT — if you can't obtain one in this environment, note this as a limitation and instead verify the deployed function exists via the Supabase MCP `list_edge_functions` tool, plus a dry read of its logic against the plan's requirements):

```bash
curl -X POST "https://jsdjcizqwwmtuhfnkvqq.supabase.co/functions/v1/scrape-client-assets" \
  -H "Authorization: Bearer <ADMIN_JWT_IF_AVAILABLE>" \
  -H "Content-Type: application/json" \
  -d '{"clientProfileId": "<a real client_profile_id>", "url": "https://aethyx.space"}'
```

If a JWT isn't obtainable in this environment, verify via `execute_sql` instead: after attempting the call (which will fail auth), confirm the function is listed via `list_edge_functions`, and manually trace through the SSRF guard and extraction logic against a few real HTML samples (e.g. fetch `https://aethyx.space` yourself via `execute_sql`-adjacent tooling isn't applicable — instead, reason through the regexes against a small HTML snippet in your own scratch testing, e.g. Deno/Node one-liners, to confirm `extractImages`/`extractOgTags`/`stripTagsToText` behave as intended). Document whichever verification path you took and why.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/scrape-client-assets/index.ts
git commit -m "$(cat <<'EOF'
Add scrape-client-assets edge function

Admin-only. Fetches a single page, extracts images/OpenGraph tags/
visible text via regex (no headless browser), downloads up to 10
images into client-assets storage under a _scrapes/{scrapeId}/
prefix, and asks Gemini to suggest labeled/categorized text blurbs.
Writes only to the new staging tables — never client_assets directly.
Basic SSRF guard rejects private/loopback/link-local hosts.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: "Scrape from URL" trigger (`ClientDetail.tsx`)

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (new state near the other Assets-tab state around line 322-330, new dialog near the existing "Add Text Asset"/"Upload File" dialogs, new button in the Assets tab)

**Interfaces:**
- Consumes: `scrape-client-assets` edge function (Task 2).
- Produces: nothing consumed by later tasks (Task 4 independently fetches pending items on its own mount/refresh, not from this task's state).

- [ ] **Step 1: Add state**

Near the other Assets-tab state (`assets`, `assetSignedUrls`, `textAssetCategory`, etc.), add:

```typescript
  const [scrapeDialogOpen, setScrapeDialogOpen] = useState(false);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
```

- [ ] **Step 2: Add the handler**

Near the other asset handlers (`addTextAsset`, `uploadFileAsset`), add:

```typescript
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
    toast({
      title: "Scrape complete",
      description: `Found ${data.imageCount} image(s) and ${data.textCount} text item(s) for review.`,
    });
    setScrapeDialogOpen(false);
    setScrapeUrl("");
    fetchPendingScrapeItems();
  };
```

(`fetchPendingScrapeItems` is added in Task 4 — this task's code references it but Task 4 must land for it to compile; that's fine since tasks in this plan are applied in order to the same branch.)

- [ ] **Step 3: Add the button and dialog**

Add a new section in the Assets tab, right after the "Primary Logo" block and before "Text Assets" (`src/pages/admin/ClientDetail.tsx`, immediately after the closing `</div>` of the Primary Logo section and before the `{/* Text Assets */}` comment):

```tsx
          {/* AI Asset Scraping */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base tracking-wider">Scrape Website</h3>
            <Button size="sm" variant="outline" onClick={() => setScrapeDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" /> Scrape from URL
            </Button>
          </div>
```

Add `Sparkles` to the existing `lucide-react` import list.

Add the dialog near the other Asset dialogs (e.g. right before the "Add Text Asset" dialog):

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

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
```
Expected: this will fail until Task 4 adds `fetchPendingScrapeItems` — that's expected for this step in isolation; a subagent implementing this task should note that dependency in its report rather than treating a `tsc` failure referencing the not-yet-defined function as a bug in this task's own code. If your environment requires this task to compile cleanly on its own before committing, add a temporary no-op `const fetchPendingScrapeItems = () => {};` placeholder above the handler and note in your report that Task 4 will replace it with the real implementation — do not skip verifying everything else compiles.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add "Scrape from URL" trigger to admin Assets tab

Calls the new scrape-client-assets edge function; results land as
pending review items (Task 4 adds the review UI), never directly in
client_assets.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Review panel — approve/reject staged items

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (fetch + state, render, promote-to-`client_assets` handlers)

**Interfaces:**
- Consumes: `client_asset_scrapes`/`client_asset_scrape_items` (Task 1), the placeholder `fetchPendingScrapeItems` reference from Task 3 (replaced here with the real implementation).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add state and the fetch function**

Near the other Assets-tab state, add:

```typescript
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [pendingScrapeItems, setPendingScrapeItems] = useState<any[]>([]);
  const [scrapeItemUrls, setScrapeItemUrls] = useState<Record<string, string>>({});
  const [scrapeItemsLoading, setScrapeItemsLoading] = useState(false);
  const [promotingItemId, setPromotingItemId] = useState<string | null>(null);
```

If Task 3 added a temporary placeholder `fetchPendingScrapeItems`, remove it and replace with the real implementation below (search for `fetchPendingScrapeItems` to find and replace it — do not leave two definitions):

```typescript
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

- [ ] **Step 2: Call it on mount**

Add `fetchPendingScrapeItems();` to the same `useEffect([id])` block that already calls `fetchAll()`/`fetchPlan()` on mount.

- [ ] **Step 3: Add approve/reject handlers**

```typescript
  const approveScrapeItem = async (item: { id: string; kind: string; suggested_category: string; suggested_label: string; content: string | null }) => {
    if (!profile) return;
    setPromotingItemId(item.id);
    if (item.kind === "text") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "text",
        category: item.suggested_category,
        label: item.suggested_label,
        content: item.content,
        sort_order: assets.filter((a) => a.type === "text").length,
      });
      if (error) {
        toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        setPromotingItemId(null);
        return;
      }
    } else {
      const { data: urlData } = await supabase.storage
        .from("client-assets")
        .createSignedUrl(item.content!, 60 * 60 * 24 * 7);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from("client_assets").insert({
        client_profile_id: profile.id,
        type: "file",
        category: item.suggested_category,
        label: item.suggested_label,
        file_name: item.content,
        file_url: urlData?.signedUrl || "",
        sort_order: assets.filter((a) => a.type === "file").length,
      });
      if (error) {
        toast({ title: "Failed to approve", description: error.message, variant: "destructive" });
        setPromotingItemId(null);
        return;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_asset_scrape_items").update({ status: "approved" }).eq("id", item.id);
    setPendingScrapeItems((prev) => prev.filter((i) => i.id !== item.id));
    setPromotingItemId(null);
    toast({ title: "Asset added" });
    fetchAll();
  };

  const rejectScrapeItem = async (itemId: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("client_asset_scrape_items").update({ status: "rejected" }).eq("id", itemId);
    setPendingScrapeItems((prev) => prev.filter((i) => i.id !== itemId));
  };
```

Note: `file_url` is a **freshly generated 7-day signed URL** created at approval time (matching exactly what `uploadFileAsset` already does for a manual upload) — not the raw `_scrapes/...` storage path reused as-is. `file_name` stores the storage path (matching this table's existing convention where `file_name` is a path, not a display name — `label` is the display name).

- [ ] **Step 4: Render the review panel**

Add this inside the "Scrape Website" section from Task 3, right after the button row, only when there are pending items:

```tsx
            {scrapeItemsLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : pendingScrapeItems.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Pending review ({pendingScrapeItems.length})</p>
                {pendingScrapeItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="pt-4 flex items-center gap-3">
                      {item.kind === "image" ? (
                        <div className="h-16 w-16 bg-black/5 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                          {scrapeItemUrls[item.id] ? (
                            <img src={scrapeItemUrls[item.id]} alt={item.suggested_label} className="max-h-full max-w-full object-contain" />
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-black/20" />
                          )}
                        </div>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-black/80 line-clamp-2">{item.content}</p>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <Badge variant="outline" className="text-xs mb-1">{assetCategoryInfo(item.suggested_category).label}</Badge>
                        <p className="text-sm font-medium truncate">{item.suggested_label}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={promotingItemId === item.id}
                          onClick={() => approveScrapeItem(item)}
                        >
                          {promotingItemId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Approve"}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => rejectScrapeItem(item.id)}>
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
```

- [ ] **Step 5: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Expected: clean compile (the Task 3 placeholder, if used, is now fully replaced — confirm no duplicate `fetchPendingScrapeItems` definitions remain).

Since this page requires an authenticated admin session, verify the promote-to-`client_assets` logic at the data layer: if Task 2's live invocation produced real pending `client_asset_scrape_items` rows, use the Supabase MCP `execute_sql` tool to simulate the approve insert (the exact `client_assets` insert shape from `approveScrapeItem` above) for one text item and one image item, confirm both rows appear correctly in `client_assets`, then decide with the user whether to keep them (real, useful data) or remove them (if they were just test scrapes) — do not silently delete real client data without checking first.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add review panel for scraped asset candidates

Admin can approve (promotes into a real client_assets row, exactly
matching the existing manual-add insert shape) or reject each staged
item. Nothing reaches client_assets without this explicit step.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
