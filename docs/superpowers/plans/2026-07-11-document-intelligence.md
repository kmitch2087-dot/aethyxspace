# Document Intelligence (Extraction Phase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Kristin extract structured business info (contact details, hours, staff, brand voice, etc.) from an uploaded PDF — either a client's own upload or Kristin's own document library — into the same reviewable suggestion queue the AI Asset Scraping feature already built for scraped websites.

**Architecture:** Extend the existing `client_asset_scrapes`/`client_asset_scrape_items` review-queue tables with a document-sourced path alongside the existing URL-sourced one. A new edge function (`extract-document-assets`) fetches the target PDF from Storage and sends it to Gemini's native `generateContent` endpoint (file-capable, unlike the OpenAI-compat shim `scrape-client-assets` uses for text). Two separate trigger UIs: an inline button on `ClientDetail.tsx`'s document grid (client is already known), and a new action mode on `Documents.tsx`'s global library (requires picking a target client, reusing that page's existing share/email/schedule dialog pattern).

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + Storage + Edge Functions/Deno), Gemini API (`generateContent` REST endpoint), shadcn/ui.

## Global Constraints

- PDF files only, this pass — no other file type gets an "Extract info" action.
- Manual trigger only — no automatic extraction on upload.
- Extraction never writes directly to `client_assets` — it only ever creates `pending`-status `client_asset_scrape_items`, exactly like the existing URL-scraping flow. Approval into a real `client_assets` row remains the existing `approveScrapeItem` flow in `ClientDetail.tsx`, unchanged.
- A `client_asset_scrapes` row is either URL-sourced or document-sourced, never both, never neither — enforced by a DB check constraint.
- Files over 15MB are rejected with a clear error in `client_asset_scrapes.error_message`, not sent to Gemini.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.

---

### Task 1: Migration — polymorphic document source on `client_asset_scrapes`

**Files:**
- Create: `supabase/migrations/20260711_document_intelligence.sql`

**Interfaces:**
- Produces: `client_asset_scrapes.source_document_id` (nullable uuid), `client_asset_scrapes.source_document_type` (nullable text, `'client_documents' | 'admin_documents'`), `source_url` now nullable, plus a check constraint enforcing exactly one source is set — consumed by Tasks 2, 3, 4.

- [ ] **Step 1: Write the migration**

```sql
-- Document intelligence: extend the existing scrape review-queue tables (built for
-- URL scraping) with a second, document-sourced path. A row is either URL-sourced
-- (existing behavior, source_url set) or document-sourced (new, source_document_id +
-- source_document_type set) — never both, never neither.
ALTER TABLE client_asset_scrapes ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_id uuid;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_type text;
ALTER TABLE client_asset_scrapes ADD CONSTRAINT client_asset_scrapes_source_check
  CHECK (
    (source_url IS NOT NULL AND source_document_id IS NULL AND source_document_type IS NULL)
    OR (source_url IS NULL AND source_document_id IS NOT NULL AND source_document_type IN ('client_documents', 'admin_documents'))
  );
```

- [ ] **Step 2: Apply the migration**

Use the Supabase MCP `apply_migration` tool with `name: "document_intelligence"`.

- [ ] **Step 3: Verify**

```sql
SELECT column_name, is_nullable FROM information_schema.columns
WHERE table_name = 'client_asset_scrapes'
AND column_name IN ('source_url', 'source_document_id', 'source_document_type');

SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
WHERE conrelid = 'client_asset_scrapes'::regclass AND conname = 'client_asset_scrapes_source_check';
```
Expected: `source_url` now `is_nullable: YES` (was `NO`), the two new columns nullable, and the check constraint definition present matching the SQL above.

Also confirm existing rows are unaffected:
```sql
SELECT count(*) FROM client_asset_scrapes WHERE source_url IS NULL;
```
Expected: `0` — every existing row was URL-sourced and still satisfies the constraint's first branch.

- [ ] **Step 4: Regenerate TypeScript types**

Use the Supabase MCP `generate_typescript_types` tool, overwrite `src/integrations/supabase/types.ts`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260711_document_intelligence.sql src/integrations/supabase/types.ts
git commit -m "$(cat <<'EOF'
Add polymorphic document source to client_asset_scrapes

source_url is now nullable; new source_document_id/source_document_type
columns (nullable) let a scrape originate from an uploaded document
instead of a URL. A check constraint enforces exactly one source is
ever set. No existing rows are affected (all pre-existing rows are
URL-sourced and satisfy the constraint's first branch).

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Edge function — `extract-document-assets`

**Files:**
- Create: `supabase/functions/extract-document-assets/index.ts`

**Interfaces:**
- Consumes: `client_asset_scrapes.source_document_id`/`source_document_type` (Task 1).
- Produces: a deployed edge function accepting `{ clientProfileId: string, sourceDocumentId: string, sourceDocumentType: "client_documents" | "admin_documents", planId?: string | null }`, returning `{ ok: true, scrapeId: string, textCount: number, geminiError: string | null }` on success or `{ ok: false, error: string }` on failure — consumed by Tasks 3 and 4.

- [ ] **Step 1: Write the edge function**

```ts
// supabase/functions/extract-document-assets/index.ts
// Admin-only: extract structured business info from an uploaded PDF (client_documents
// or admin_documents), staging results as pending client_asset_scrape_items for review —
// mirrors scrape-client-assets' review-queue pattern, source is a document, not a URL.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { getCors } from "../_shared/admin-cors.ts";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 30_000;

function json(body: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

const EXTRACTION_PROMPT = `You are helping tag brand and business content found in a document uploaded to a design agency's client management system. Given the document's content, identify meaningful, distinct pieces of information in these categories:
- brand_voice, tagline, motto, mission, values: brand identity content
- contact_info: phone numbers, email addresses, physical addresses
- hours: business/operating hours
- staff: practitioner/employee names and their positions/titles/roles (one item per person, or grouped if clearly listed together)
- other: any other genuinely useful business information not covered above

Extract up to 10 distinct items total. Skip categories with no real content in the document — do not invent or guess.

For each item, suggest a category from exactly this list: brand_voice, tagline, motto, mission, values, contact_info, hours, staff, other. Respond with ONLY a JSON array, no other text, in this shape: [{"category": "...", "label": "...", "content": "..."}].`;

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
    const sourceDocumentId = String(body.sourceDocumentId || "");
    const sourceDocumentType = String(body.sourceDocumentType || "");
    const planId = body.planId ? String(body.planId) : null;
    if (!clientProfileId || !sourceDocumentId) {
      return json({ error: "clientProfileId and sourceDocumentId required" }, 400, cors);
    }
    if (sourceDocumentType !== "client_documents" && sourceDocumentType !== "admin_documents") {
      return json({ error: "sourceDocumentType must be client_documents or admin_documents" }, 400, cors);
    }

    // Resolve the document's storage path + a human-readable label from the right table.
    let storagePath: string | null = null;
    let bucket: string;
    let docLabel = "uploaded document";
    if (sourceDocumentType === "client_documents") {
      bucket = "client-documents";
      const { data: doc } = await admin.from("client_documents").select("title, file_url").eq("id", sourceDocumentId).maybeSingle();
      if (!doc) return json({ error: "Document not found" }, 404, cors);
      // client_documents.file_url isn't always a clean relative storage path — some rows
      // store a fuller path containing a "/client-documents/" marker (same defensive
      // stripping ClientDetail.tsx and PortalDocuments.tsx already apply before any
      // storage call on this column).
      storagePath = doc.file_url;
      if (storagePath) {
        const marker = "/client-documents/";
        const idx = storagePath.indexOf(marker);
        if (idx !== -1) storagePath = storagePath.substring(idx + marker.length);
      }
      docLabel = doc.title || docLabel;
    } else {
      bucket = "admin-documents";
      const { data: doc } = await admin.from("admin_documents").select("title, file_path").eq("id", sourceDocumentId).maybeSingle();
      if (!doc) return json({ error: "Document not found" }, 404, cors);
      storagePath = doc.file_path;
      docLabel = doc.title || docLabel;
    }
    if (!storagePath) return json({ error: "Document has no file" }, 400, cors);
    if (!storagePath.toLowerCase().endsWith(".pdf")) {
      return json({ error: "Only PDF files can be extracted from" }, 400, cors);
    }

    const { data: scrapeRow, error: scrapeInsertErr } = await admin
      .from("client_asset_scrapes")
      .insert({
        client_profile_id: clientProfileId,
        source_document_id: sourceDocumentId,
        source_document_type: sourceDocumentType,
        status: "running",
        plan_id: planId,
      })
      .select("id")
      .single();
    if (scrapeInsertErr || !scrapeRow) {
      return json({ error: "Could not start extraction" }, 500, cors);
    }
    const scrapeId = scrapeRow.id;

    try {
      const { data: fileBlob, error: dlErr } = await admin.storage.from(bucket).download(storagePath);
      if (dlErr || !fileBlob) throw new Error(`Could not download document: ${dlErr?.message || "unknown error"}`);
      if (fileBlob.size > MAX_FILE_BYTES) {
        throw new Error(`File too large (${(fileBlob.size / 1024 / 1024).toFixed(1)}MB, max 15MB)`);
      }
      const base64Data = arrayBufferToBase64(await fileBlob.arrayBuffer());

      let textCount = 0;
      let geminiError: string | null = null;
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      if (!GEMINI_API_KEY) {
        geminiError = "GEMINI_API_KEY is not configured";
      } else {
        try {
          const geminiController = new AbortController();
          const geminiTimeout = setTimeout(() => geminiController.abort(), GEMINI_TIMEOUT_MS);
          let geminiResp: Response;
          try {
            geminiResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    parts: [
                      { text: EXTRACTION_PROMPT },
                      { inline_data: { mime_type: "application/pdf", data: base64Data } },
                    ],
                  }],
                }),
                signal: geminiController.signal,
              },
            );
          } finally {
            clearTimeout(geminiTimeout);
          }
          if (!geminiResp.ok) {
            const bodyText = await geminiResp.text().catch(() => "");
            geminiError = `Gemini API returned ${geminiResp.status}: ${bodyText.slice(0, 300)}`;
            console.warn("[extract-document-assets] Gemini call failed:", geminiResp.status, bodyText.slice(0, 500));
          } else {
            const geminiJson = await geminiResp.json();
            const text = geminiJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            const jsonMatch = text.match(/\[[\s\S]*\]/);
            if (!jsonMatch) {
              geminiError = "Gemini response did not contain a parseable JSON array";
              console.warn("[extract-document-assets] Gemini response had no JSON array. Raw text:", text.slice(0, 500));
            } else {
              const items = JSON.parse(jsonMatch[0]);
              const validCategories = new Set(["brand_voice", "tagline", "motto", "mission", "values", "contact_info", "hours", "staff", "other"]);
              for (const item of items) {
                if (!item?.content || typeof item.content !== "string") continue;
                const category = validCategories.has(item.category) ? item.category : "other";
                await admin.from("client_asset_scrape_items").insert({
                  scrape_id: scrapeId,
                  kind: "text",
                  suggested_category: category,
                  suggested_label: String(item.label || `From ${docLabel}`).slice(0, 200),
                  content: String(item.content).slice(0, 5000),
                  status: "pending",
                });
                textCount++;
              }
              if (textCount === 0) {
                geminiError = "Gemini returned a valid response but suggested zero text items";
              }
            }
          }
        } catch (err) {
          geminiError = err instanceof Error ? err.message : "Gemini call threw an unexpected error";
          console.warn("[extract-document-assets] Gemini extraction failed:", err);
        }
      }

      await admin
        .from("client_asset_scrapes")
        .update({ status: "complete", completed_at: new Date().toISOString(), error_message: geminiError })
        .eq("id", scrapeId);
      return json({ ok: true, scrapeId, textCount, geminiError }, 200, cors);
    } catch (err) {
      await admin
        .from("client_asset_scrapes")
        .update({ status: "failed", error_message: err instanceof Error ? err.message : "Unknown error", completed_at: new Date().toISOString() })
        .eq("id", scrapeId);
      return json({ ok: false, error: "Extraction failed", scrapeId }, 500, cors);
    }
  } catch (err) {
    console.error("[extract-document-assets]", err);
    return json({ error: err instanceof Error ? err.message : "Unknown" }, 500, cors);
  }
});
```

- [ ] **Step 2: Deploy the edge function**

Use the Supabase MCP `deploy_edge_function` tool. Check `list_edge_functions` for `scrape-client-assets`'s `verify_jwt` setting first and match it for this new function (should be `true`, admin-only).

- [ ] **Step 3: Verify deployment**

Use `mcp__supabase__get_edge_function` to confirm the deployed source matches. Then do a live end-to-end test:
1. Find a real PDF-backed `client_documents` or `admin_documents` row via `execute_sql` (e.g. Irving Munoz's uploaded checklist/agreement PDFs from earlier session work, if still present — check with `SELECT id, title, file_url FROM client_documents WHERE file_url ILIKE '%.pdf' LIMIT 5;`).
2. You do NOT have a way to mint a real admin auth session in this environment (established constraint from earlier work in this project) — instead, verify the function's logic directly: manually insert a test `client_asset_scrapes` row via `execute_sql` matching the shape the function would create (`source_document_id`, `source_document_type`, `status: 'running'`), confirm the check constraint accepts it, then update it to `status: 'complete'` and insert a test `client_asset_scrape_items` row, confirm both succeed, then delete both test rows. This exercises the same schema paths the function's code uses without needing a live authenticated HTTP call.
3. Separately, confirm via `get_edge_function` that the function's deployed source correctly references `GEMINI_API_KEY` (same secret name `scrape-client-assets` already uses) and the native `generateContent` endpoint URL — a careful code read is the verification here, not a live Gemini call, to avoid an uncontrolled real API cost during a plan-verification step.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/extract-document-assets/index.ts
git commit -m "$(cat <<'EOF'
Add extract-document-assets edge function

Fetches a PDF from client-documents or admin-documents storage, sends
it to Gemini's native generateContent endpoint (file-capable, unlike
the OpenAI-compat chat-completions shim scrape-client-assets uses for
scraped text), and stages results as pending client_asset_scrape_items
using the same review-queue schema as URL-based scraping.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `ClientDetail.tsx` — "Extract info" trigger for client-uploaded documents

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx`

**Interfaces:**
- Consumes: `extract-document-assets` edge function (Task 2), request shape `{ clientProfileId, sourceDocumentId, sourceDocumentType: "client_documents", planId }`.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the extraction handler**

Add this function right after `handleScrape` (`src/pages/admin/ClientDetail.tsx`, immediately before `const approveScrapeItem = ...`):

```tsx
  const [extractingDocId, setExtractingDocId] = useState<string | null>(null);

  const extractDocumentInfo = async (doc: DocRow) => {
    if (!profile) return;
    setExtractingDocId(doc.id);
    const { data, error } = await supabase.functions.invoke("extract-document-assets", {
      body: {
        clientProfileId: profile.id,
        sourceDocumentId: doc.id,
        sourceDocumentType: "client_documents",
        planId: plan?.id ?? null,
      },
    });
    setExtractingDocId(null);
    if (error || !data?.ok) {
      toast({ title: "Extraction failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    if (data.textCount === 0 && data.geminiError) {
      toast({ title: "Extraction found nothing", description: data.geminiError });
    } else {
      toast({ title: "Extraction complete", description: `Found ${data.textCount} item(s) for review.` });
    }
    fetchPendingScrapeItems();
  };
```

Also add the new state declaration `const [extractingDocId, setExtractingDocId] = useState<string | null>(null);` — shown combined with the handler above since they're introduced together; place both right before `const extractDocumentInfo = ...` (i.e., the state line does not need its own separate location, it's part of this same insertion).

- [ ] **Step 2: Add the "Extract info" button to the document grid**

Current (`src/pages/admin/ClientDetail.tsx`, the hover-overlay icon row on each document card):
```tsx
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {slotCapablePlan && (
                        <button
                          className="p-1 rounded-full bg-white/80 hover:bg-teal-50 text-black/40 hover:text-teal-600"
                          onClick={(e) => { e.stopPropagation(); setAssignSlotDoc(d); setAssignSlotType(""); }}
                          title="Assign to project slot"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-blue-50 text-black/40 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); setEditingDocId(d.id); setEditingDocTitle(d.title); }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
```
Replace with:
```tsx
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {fileExt(d.file_url) === "pdf" && (
                        <button
                          className="p-1 rounded-full bg-white/80 hover:bg-purple-50 text-black/40 hover:text-purple-600 disabled:opacity-50"
                          onClick={(e) => { e.stopPropagation(); extractDocumentInfo(d); }}
                          disabled={extractingDocId === d.id}
                          title="Extract info with AI"
                        >
                          {extractingDocId === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      {slotCapablePlan && (
                        <button
                          className="p-1 rounded-full bg-white/80 hover:bg-teal-50 text-black/40 hover:text-teal-600"
                          onClick={(e) => { e.stopPropagation(); setAssignSlotDoc(d); setAssignSlotType(""); }}
                          title="Assign to project slot"
                        >
                          <FolderInput className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-blue-50 text-black/40 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); setEditingDocId(d.id); setEditingDocTitle(d.title); }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
```

(`fileExt` and `Sparkles`/`Loader2` are already used/imported elsewhere in this file — no new imports needed. `fileExt(d.file_url)` on a `null` `file_url` returns `""` per the existing helper, which safely fails the `=== "pdf"` check rather than throwing.)

- [ ] **Step 3: Add provenance to pending review items**

Current (`src/pages/admin/ClientDetail.tsx`, the `fetchPendingScrapeItems` function's scrape metadata fetch):
```tsx
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
```
Replace with:
```tsx
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: scrapes } = await (supabase as any)
      .from("client_asset_scrapes")
      .select("id, plan_id, source_url, source_document_type")
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
    const scrapeSourceById: Record<string, string> = {};
    scrapeRows.forEach((s) => {
      scrapePlanById[s.id] = s.plan_id ?? null;
      scrapeSourceById[s.id] = s.source_url
        ? s.source_url
        : s.source_document_type === "admin_documents"
        ? "an uploaded document (from your library)"
        : "an uploaded document";
    });
```

Current (right after, where `rows` is built from `items`):
```tsx
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((items || []) as any[]).map((item) => ({
      ...item,
      scrape_plan_id: scrapePlanById[item.scrape_id] ?? null,
    }));
```
Replace with:
```tsx
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = ((items || []) as any[]).map((item) => ({
      ...item,
      scrape_plan_id: scrapePlanById[item.scrape_id] ?? null,
      scrape_source: scrapeSourceById[item.scrape_id] ?? "unknown source",
    }));
```

Current (the pending-review item card's label section, inside `pendingScrapeItems.map`):
```tsx
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1">{assetCategoryInfo(item.suggested_category).label}</Badge>
                      <p className="text-sm font-medium truncate">{item.suggested_label}</p>
                    </div>
```
Replace with:
```tsx
                    <div className="flex-1 min-w-0">
                      <Badge variant="outline" className="text-xs mb-1">{assetCategoryInfo(item.suggested_category).label}</Badge>
                      <p className="text-sm font-medium truncate">{item.suggested_label}</p>
                      <p className="text-xs text-muted-foreground truncate" title={item.scrape_source}>from: {item.scrape_source}</p>
                    </div>
```

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
npm run dev
```
Confirm a PDF-backed document in the grid now shows a purple sparkle "Extract info with AI" button on hover, and a non-PDF document does not. Manually verify via `mcp__supabase__execute_sql`: insert a test `client_asset_scrapes` row with `source_document_type: 'client_documents'` and no `source_url`, insert a linked pending `client_asset_scrape_items` row, confirm `fetchPendingScrapeItems`'s query shape (re-derive it manually via SQL joining the two tables) would correctly resolve a "from: an uploaded document" caption, then delete both test rows.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add "Extract info" trigger for client-uploaded PDF documents

New purple sparkle button on PDF documents in the client's document
grid, calling extract-document-assets with this page's already-known
client_profile_id. Pending review items now show a "from: ..." caption
(source URL or a generic "uploaded document" label) so Kristin can
tell scrape-sourced and document-sourced suggestions apart in the
shared review queue.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `Documents.tsx` — "Extract info" action for the global admin library

**Files:**
- Modify: `src/pages/admin/Documents.tsx`

**Interfaces:**
- Consumes: `extract-document-assets` edge function (Task 2), request shape `{ clientProfileId, sourceDocumentId, sourceDocumentType: "admin_documents", planId: null }`.
- Produces: nothing consumed by later tasks — final task in this plan.

- [ ] **Step 1: Widen the `actionMode` type and add the dropdown item**

Current (`src/pages/admin/Documents.tsx`):
```tsx
  const [actionMode, setActionMode] = useState<"share" | "email" | "schedule" | null>(null);
```
Replace with:
```tsx
  const [actionMode, setActionMode] = useState<"share" | "email" | "schedule" | "extract" | null>(null);
```

(No separate `extracting` state is needed — the existing `actionBusy` state already wraps the entire `submitAction` call including the new `extract` branch below, and the dialog's submit button already reads generically as `{actionBusy ? "Working…" : "Confirm"}` with no per-mode text — confirmed by reading the file fresh, this button needs zero changes for the new mode.)

Current (the dropdown menu on each "My Files" row):
```tsx
                                <DropdownMenuItem onClick={() => openAction(doc, "share")}><Share2 className="h-4 w-4 mr-2" />Share with client(s)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "email")}><Mail className="h-4 w-4 mr-2" />Email now</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "schedule")}><Clock className="h-4 w-4 mr-2" />Schedule send</DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
```
Replace with:
```tsx
                                <DropdownMenuItem onClick={() => openAction(doc, "share")}><Share2 className="h-4 w-4 mr-2" />Share with client(s)</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "email")}><Mail className="h-4 w-4 mr-2" />Email now</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openAction(doc, "schedule")}><Clock className="h-4 w-4 mr-2" />Schedule send</DropdownMenuItem>
                                  {doc.file_name.toLowerCase().endsWith(".pdf") && (
                                    <DropdownMenuItem onClick={() => openAction(doc, "extract")}><Sparkles className="h-4 w-4 mr-2" />Extract info</DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => handleDelete(doc)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem>
```

Add `Sparkles` to the existing `lucide-react` import list:
```tsx
import { Upload, Download, Trash2, FileText, Search, MoreHorizontal, Share2, Mail, Clock, Users, Sparkles } from "lucide-react";
```

- [ ] **Step 2: Handle the "extract" mode in `submitAction`**

Current (`src/pages/admin/Documents.tsx`, `submitAction`):
```tsx
  const submitAction = async () => {
    if (!actionDoc || !actionMode) return;
    setActionBusy(true);
    try {
      if (actionMode === "share" || actionMode === "email") {
        if (actionClientIds.length === 0) {
          toast({ title: "Select at least one client", variant: "destructive" });
          setActionBusy(false); return;
        }
        const { error } = await supabase.functions.invoke("document-actions", {
          body: {
            action: actionMode === "share" ? "share" : "share_and_email",
            adminDocId: actionDoc.id,
            clientProfileIds: actionClientIds,
            subject: actionSubject,
            message: actionMessage,
          },
        });
        if (error) throw error;
        toast({ title: actionMode === "share" ? "Shared with client(s)" : "Emailed to client(s)" });
      } else {
```
Replace with:
```tsx
  const submitAction = async () => {
    if (!actionDoc || !actionMode) return;
    setActionBusy(true);
    try {
      if (actionMode === "extract") {
        if (actionClientIds.length !== 1) {
          toast({ title: "Select exactly one client", variant: "destructive" });
          setActionBusy(false); return;
        }
        const { data, error } = await supabase.functions.invoke("extract-document-assets", {
          body: {
            clientProfileId: actionClientIds[0],
            sourceDocumentId: actionDoc.id,
            sourceDocumentType: "admin_documents",
            planId: null,
          },
        });
        if (error || !data?.ok) throw new Error(data?.error || error?.message || "Extraction failed");
        if (data.textCount === 0 && data.geminiError) {
          toast({ title: "Extraction found nothing", description: data.geminiError });
        } else {
          toast({ title: "Extraction complete", description: `Found ${data.textCount} item(s) for review on that client's profile.` });
        }
      } else if (actionMode === "share" || actionMode === "email") {
        if (actionClientIds.length === 0) {
          toast({ title: "Select at least one client", variant: "destructive" });
          setActionBusy(false); return;
        }
        const { error } = await supabase.functions.invoke("document-actions", {
          body: {
            action: actionMode === "share" ? "share" : "share_and_email",
            adminDocId: actionDoc.id,
            clientProfileIds: actionClientIds,
            subject: actionSubject,
            message: actionMessage,
          },
        });
        if (error) throw error;
        toast({ title: actionMode === "share" ? "Shared with client(s)" : "Emailed to client(s)" });
      } else {
```

(The existing `else { // schedule ... }` branch and the function's closing `setActionDoc(null); setActionMode(null); fetchAll();`/`catch`/`finally` block are unchanged — this insertion only adds a new `if` branch ahead of the existing `share`/`email` branch, using `else if` for that branch as shown.)

- [ ] **Step 3: Update the dialog title and client-list section for "extract" mode**

Current (`src/pages/admin/Documents.tsx`, the action dialog's title):
```tsx
            <DialogTitle>
              {actionMode === "share" && "Share with clients"}
              {actionMode === "email" && "Email to clients"}
              {actionMode === "schedule" && "Schedule document send"}
            </DialogTitle>
```
Replace with:
```tsx
            <DialogTitle>
              {actionMode === "share" && "Share with clients"}
              {actionMode === "email" && "Email to clients"}
              {actionMode === "schedule" && "Schedule document send"}
              {actionMode === "extract" && "Extract info — choose a client"}
            </DialogTitle>
```

Current (the client checkbox list's visibility condition):
```tsx
              {(actionMode === "share" || actionMode === "email" || (actionMode === "schedule" && schedTargetType === "specific")) && (
                <div className="space-y-2">
                  <Label>Clients</Label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                    {clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={actionClientIds.includes(c.id)}
                          onChange={(e) => setActionClientIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((i) => i !== c.id))} />
                        {c.full_name} <span className="text-black/40">({c.email || "no email"})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
```
Replace with:
```tsx
              {(actionMode === "share" || actionMode === "email" || actionMode === "extract" || (actionMode === "schedule" && schedTargetType === "specific")) && (
                <div className="space-y-2">
                  <Label>{actionMode === "extract" ? "Client (pick one)" : "Clients"}</Label>
                  <div className="border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                    {clients.map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm">
                        <input
                          type={actionMode === "extract" ? "radio" : "checkbox"}
                          name={actionMode === "extract" ? "extract-client" : undefined}
                          checked={actionClientIds.includes(c.id)}
                          onChange={(e) => {
                            if (actionMode === "extract") {
                              setActionClientIds(e.target.checked ? [c.id] : []);
                            } else {
                              setActionClientIds((ids) => e.target.checked ? [...ids, c.id] : ids.filter((i) => i !== c.id));
                            }
                          }}
                        />
                        {c.full_name} <span className="text-black/40">({c.email || "no email"})</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
```

Note: the dialog's "Message" textarea (`<div className="space-y-2"><Label>Message ...</Label><Textarea ... /></div>`, just below the client-list block) has no mode gating at all today — it renders for every mode, including `schedule`, whether or not that mode's submit logic actually reads `actionMessage`. The `extract` branch in `submitAction` (Step 2) never reads `actionMessage` either, so it will render but sit inert for this mode — consistent with the existing pre-existing looseness for other modes, not a new gap introduced by this task. No change needed here.

The dialog's submit button (`<Button onClick={submitAction} disabled={actionBusy}>{actionBusy ? "Working…" : "Confirm"}</Button>`) is already mode-generic with no per-mode text — confirmed by reading the file fresh. It needs zero changes for the new `extract` mode.

- [ ] **Step 4: Verify**

```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/Documents.tsx
npm run dev
```
Confirm a PDF document in "My Files" now shows an "Extract info" dropdown item (non-PDF documents don't), clicking it opens the action dialog with a single-select (radio-button-style) client list, and selecting a client + submitting calls `extract-document-assets` with exactly that one client's id. Manually verify via `mcp__supabase__execute_sql` that selecting zero clients and submitting is rejected client-side (toast "Select exactly one client") without reaching the edge function — read the code path to confirm the guard runs before the `supabase.functions.invoke` call.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/Documents.tsx
git commit -m "$(cat <<'EOF'
Add "Extract info" action for the global admin document library

admin_documents has no client_profile_id, so extracting from one
requires picking a target client — reuses the existing Share/Email/
Schedule action dialog's client-list pattern, constrained to a single
selection (radio-style) since a scrape's results land in exactly one
client's review queue.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
