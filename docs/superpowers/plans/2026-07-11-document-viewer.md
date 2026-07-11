# Shared DocumentViewer + Assign-to-Slot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace four duplicated inline image/PDF viewer implementations with one shared `DocumentViewer` component, extend inline viewing to the two generic document lists that currently open a new tab, fix a latent wrong-bucket bug those lists have for admin-shared files, and add an admin "Assign to Slot" action that copies a generic document into a project's document slot by reusing the existing upload pipeline unchanged.

**Architecture:** A new pure-rendering `DocumentViewer.tsx` component (backed by a small pure `isImageFile` helper with a real unit test) replaces the duplicated image/iframe branches in `PortalDocuments.tsx` (×2), `ClientDetail.tsx`'s slot viewer, and `AgreementDocument.tsx`'s ID-photo viewer. Two more tasks extend the same component to the generic document lists in `ClientDetail.tsx` and `PortalDocuments.tsx`, fixing a bucket-selection bug along the way. A final task adds the "Assign to Slot" action, which downloads a document's bytes and hands them to the existing `handleSlotUpload` function — no new upload/side-effect logic.

**Tech Stack:** Vite + React + TypeScript, Supabase (Postgres + Storage), Vitest, shadcn/ui, Tailwind.

## Global Constraints

- Path alias `@/` resolves to `src/`.
- Tables not in generated types use `(supabase as any).from("table_name")`.
- This codebase has no test coverage for Supabase-backed pages/components — don't write component tests mocking supabase-js. `isImageFile` (Task 1) is a pure function with no Supabase dependency and gets a real Vitest unit test; every other task verifies via `npm run dev`, `tsc --noEmit`, lint, and — where an authenticated session isn't available — direct Supabase MCP `execute_sql`/storage checks, matching this session's established pattern.
- Commit after every task, signed with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`.
- Do not touch Stripe, billing, or the deposit/checkout flow.
- Do not touch admin's global `Documents.tsx` library page (the "My Files"/"Client Files" tabs) — out of scope.
- Do not add Section 5's actual Google-Ads slot definitions — only read the generic `usesDocumentSlots` flag that will pick them up later.
- Do not modify `handleSlotUpload`, `updateProjectPhaseForSlot`, or `checkAndTriggerAgreement`'s internals — reuse them exactly as they exist.

---

### Task 1: `DocumentViewer.tsx` component (+ `isImageFile` helper with a real test)

**Files:**
- Create: `src/lib/isImageFile.ts`
- Create: `src/lib/isImageFile.test.ts`
- Create: `src/components/DocumentViewer.tsx`

**Interfaces:**
- Produces: `isImageFile(fileName: string): boolean` and `<DocumentViewer url={string|null} fileName={string} loading?={boolean} downloadUrl?={string} />` — consumed by Tasks 2-5.

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/isImageFile.test.ts
import { describe, it, expect } from "vitest";
import { isImageFile } from "./isImageFile";

describe("isImageFile", () => {
  it("returns true for common image extensions", () => {
    expect(isImageFile("photo.jpg")).toBe(true);
    expect(isImageFile("photo.JPEG")).toBe(true);
    expect(isImageFile("logo.png")).toBe(true);
    expect(isImageFile("icon.svg")).toBe(true);
    expect(isImageFile("scan.webp")).toBe(true);
    expect(isImageFile("photo.avif")).toBe(true);
    expect(isImageFile("animation.gif")).toBe(true);
  });

  it("returns false for non-image extensions", () => {
    expect(isImageFile("contract.pdf")).toBe(false);
    expect(isImageFile("notes.docx")).toBe(false);
    expect(isImageFile("noextension")).toBe(false);
  });

  it("handles paths with directories, not just bare filenames", () => {
    expect(isImageFile("47560dcc/id/1234_license.png")).toBe(true);
    expect(isImageFile("47560dcc/id/1234_license.pdf")).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/isImageFile.test.ts`
Expected: FAIL — `Cannot find module './isImageFile'`.

- [ ] **Step 3: Write the implementation**

```typescript
// src/lib/isImageFile.ts
const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "svg", "avif"]);

export function isImageFile(fileName: string): boolean {
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  return IMAGE_EXTENSIONS.has(ext);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/isImageFile.test.ts`
Expected: PASS — all 3 test cases green.

- [ ] **Step 5: Write `DocumentViewer.tsx`**

```tsx
import { Loader2 } from "lucide-react";
import { isImageFile } from "@/lib/isImageFile";

interface DocumentViewerProps {
  url: string | null;
  fileName: string;
  loading?: boolean;
  downloadUrl?: string;
}

const DocumentViewer = ({ url, fileName, loading, downloadUrl }: DocumentViewerProps) => {
  if (loading || !url) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      {isImageFile(fileName) ? (
        <img src={url} alt={fileName} className="w-full max-h-[600px] object-contain rounded" />
      ) : (
        <iframe src={url} title={fileName} className="w-full h-[70vh] border-0 rounded" />
      )}
      <div className="pt-3">
        <a
          href={downloadUrl || url}
          download={fileName}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary underline"
        >
          Download
        </a>
      </div>
    </div>
  );
};

export default DocumentViewer;
```

- [ ] **Step 6: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/lib/isImageFile.ts src/components/DocumentViewer.tsx
npx vitest run src/lib/isImageFile.test.ts
```
Expected: all clean. `DocumentViewer` isn't consumed by any page yet (Tasks 2-5 do that), so there's nothing to click-test — a clean compile is sufficient here.

- [ ] **Step 7: Commit**

```bash
git add src/lib/isImageFile.ts src/lib/isImageFile.test.ts src/components/DocumentViewer.tsx
git commit -m "$(cat <<'EOF'
Add shared DocumentViewer component and isImageFile helper

Extracted from three near-identical image/iframe branches already
duplicated across PortalDocuments.tsx and ClientDetail.tsx, plus a
fourth in AgreementDocument.tsx's ID viewer — Tasks 2-3 replace all
four call sites with this one component.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Replace the three slot-viewer duplicates

**Files:**
- Modify: `src/pages/portal/PortalDocuments.tsx` (agreement-slot viewer ~lines 232-252, standard-slot viewer ~lines 301-340)
- Modify: `src/pages/admin/ClientDetail.tsx` (slot viewer ~lines 1453-1483)

**Interfaces:**
- Consumes: `DocumentViewer` (Task 1).
- Produces: nothing consumed by later tasks (each replacement is self-contained).

- [ ] **Step 1: Import `DocumentViewer` in `PortalDocuments.tsx`**

Add near the other `@/components` imports:

```typescript
import DocumentViewer from "@/components/DocumentViewer";
```

- [ ] **Step 2: Replace the agreement-slot viewer block**

Current (`src/pages/portal/PortalDocuments.tsx`, inside the `isAgreement` branch's expanded section):

```tsx
                    {/* Expanded — show the uploaded proposal PDF */}
                    {isExpanded && slot.storage_path && (
                      <div className="border-t border-white/10">
                        {signedUrl ? (
                          /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(slot.file_name || '') ? (
                            <img src={signedUrl} alt={slot.file_name} className="w-full max-h-[600px] object-contain bg-black/30" />
                          ) : (
                            <iframe src={signedUrl} title={slot.file_name} className="w-full h-[600px] border-0" />
                          )
                        ) : (
                          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-white/40" /></div>
                        )}
                        {signedUrl && (
                          <div className="p-4 flex gap-2">
                            <a href={signedUrl} download={slot.file_name} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white underline">
                              <Download className="h-3 w-3" /> Download
                            </a>
                          </div>
                        )}
                      </div>
                    )}
```

Replace with:

```tsx
                    {/* Expanded — show the uploaded proposal PDF */}
                    {isExpanded && slot.storage_path && (
                      <div className="border-t border-white/10 p-4">
                        <DocumentViewer url={signedUrl || null} fileName={slot.file_name || ""} />
                      </div>
                    )}
```

(`DocumentViewer` renders its own download link — the separate `<Download>` icon block here is no longer needed. `Download` may become an unused import after this and the next step; check at the end of Step 3 before removing it.)

- [ ] **Step 3: Replace the standard-slot viewer block**

Current (`src/pages/portal/PortalDocuments.tsx`, the non-agreement slot branch):

```tsx
                  {/* Embedded viewer for uploaded slots */}
                  {isExpanded && slot.status === "uploaded" && (
                    <div className="border-t border-white/10 p-4 bg-white/5">
                      {!signedUrl ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="h-5 w-5 animate-spin text-white/50" />
                        </div>
                      ) : (
                        <>
                          {/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(slot.file_name || "") ? (
                            <img
                              src={signedUrl}
                              alt={label}
                              className="max-w-full rounded-lg mb-3"
                            />
                          ) : (
                            <iframe
                              src={signedUrl}
                              title={label}
                              className="w-full h-[600px] border-0 rounded-lg mb-3"
                            />
                          )}
                          <a
                            href={signedUrl}
                            download={slot.file_name || label}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-white/20 text-white/70 hover:text-white"
                            >
                              <Download className="h-3.5 w-3.5 mr-1" /> Download
                            </Button>
                          </a>
                        </>
                      )}
                    </div>
                  )}
```

Replace with:

```tsx
                  {/* Embedded viewer for uploaded slots */}
                  {isExpanded && slot.status === "uploaded" && (
                    <div className="border-t border-white/10 p-4 bg-white/5">
                      <DocumentViewer url={signedUrl || null} fileName={slot.file_name || label} />
                    </div>
                  )}
```

- [ ] **Step 4: Check whether `Download` and `Button` are still used elsewhere in `PortalDocuments.tsx`**

`Download` is still used by the generic shared-documents list further down this same file (`handleDownload` button) — keep the import. `Button` is likewise still used elsewhere in the file — keep it. Run `npx eslint src/pages/portal/PortalDocuments.tsx` after Steps 2-3 to confirm no unused-import warnings before moving on; if either import genuinely becomes unused, remove it, but based on the rest of the file's content neither should.

- [ ] **Step 5: Replace `ClientDetail.tsx`'s slot viewer block**

Add the import near the other `@/components` imports in `src/pages/admin/ClientDetail.tsx`:

```typescript
import DocumentViewer from "@/components/DocumentViewer";
```

Current block (`src/pages/admin/ClientDetail.tsx`, the `expandedSlot && (() => {...})()` IIFE):

```tsx
            {expandedSlot && (() => {
              const slot = docSlots.find((s) => s.slot_type === expandedSlot);
              const hasFile = ['uploaded', 'awaiting_signature', 'completed'].includes(slot?.status || '');
              if (!slot || !hasFile) return null;
              const url = slotSignedUrls[expandedSlot];
              const isImage = /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(slot.file_name || '');
              return (
                <div className="border-t border-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-muted/30">
                    <span className="text-sm font-medium">{SLOT_LABELS[expandedSlot]}</span>
                    <div className="flex gap-3">
                      {url && (
                        <a href={url} download={slot.file_name} className="text-xs text-primary underline">
                          Download
                        </a>
                      )}
                      <button onClick={() => setExpandedSlot(null)} className="text-xs text-muted-foreground hover:text-black">
                        Close
                      </button>
                    </div>
                  </div>
                  {url ? (
                    isImage
                      ? <img src={url} alt={slot.file_name} className="max-w-full" />
                      : <iframe src={url} title={slot.file_name} className="w-full h-[700px] border-0" />
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">Loading document...</div>
                  )}
                </div>
              );
            })()}
```

Replace with:

```tsx
            {expandedSlot && (() => {
              const slot = docSlots.find((s) => s.slot_type === expandedSlot);
              const hasFile = ['uploaded', 'awaiting_signature', 'completed'].includes(slot?.status || '');
              if (!slot || !hasFile) return null;
              const url = slotSignedUrls[expandedSlot];
              return (
                <div className="border-t border-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 bg-muted/30">
                    <span className="text-sm font-medium">{SLOT_LABELS[expandedSlot]}</span>
                    <button onClick={() => setExpandedSlot(null)} className="text-xs text-muted-foreground hover:text-black">
                      Close
                    </button>
                  </div>
                  <div className="p-4">
                    <DocumentViewer url={url || null} fileName={slot.file_name || ""} />
                  </div>
                </div>
              );
            })()}
```

(The header's own "Download" link is dropped since `DocumentViewer` renders its own; the "Close" button stays in the header, outside the component, since closing is this page's own expand/collapse concern, not the viewer's.)

- [ ] **Step 6: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalDocuments.tsx src/pages/admin/ClientDetail.tsx
npm run dev
```
Expected: clean compile. This page requires an authenticated session to click-test in a browser — if unavailable, confirm via `npm run dev`'s HMR log that both files transform with no errors, and note the limitation in your report (same as prior tasks this session).

- [ ] **Step 7: Commit**

```bash
git add src/pages/portal/PortalDocuments.tsx src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Replace duplicated slot-document viewers with shared DocumentViewer

Two near-identical implementations in PortalDocuments.tsx and one in
ClientDetail.tsx all did the same image-vs-iframe branching by hand.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Replace `AgreementDocument.tsx`'s ID-photo viewer

**Files:**
- Modify: `src/components/AgreementDocument.tsx` (ID viewer dialog, ~lines 871-888)

**Interfaces:**
- Consumes: `DocumentViewer` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Import `DocumentViewer`**

Add near the other `@/` imports in `src/components/AgreementDocument.tsx`:

```typescript
import DocumentViewer from "@/components/DocumentViewer";
```

- [ ] **Step 2: Replace the dialog content**

Current (`src/components/AgreementDocument.tsx:871-888`):

```tsx
      <Dialog open={viewIdOpen} onOpenChange={(open) => { setViewIdOpen(open); if (!open) setViewIdUrl(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Photo ID</DialogTitle>
          </DialogHeader>
          {viewIdLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : viewIdUrl ? (
            record.id_document_path?.toLowerCase().endsWith(".pdf") ? (
              <iframe src={viewIdUrl} className="w-full h-[70vh] border-0" title="Client ID document" />
            ) : (
              <img src={viewIdUrl} alt="Client ID document" className="w-full h-auto rounded" />
            )
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
```

Replace with:

```tsx
      <Dialog open={viewIdOpen} onOpenChange={(open) => { setViewIdOpen(open); if (!open) setViewIdUrl(null) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Client Photo ID</DialogTitle>
          </DialogHeader>
          <DocumentViewer
            url={viewIdUrl}
            fileName={record.id_document_path ?? ""}
            loading={viewIdLoading}
          />
        </DialogContent>
      </Dialog>
    </div>
```

- [ ] **Step 3: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/components/AgreementDocument.tsx
```
Expected: clean. This component's callers (`ClientDetail.tsx`, `PortalAgreements.tsx`) already work end-to-end per the prior agreement-signing plan — no new integration to verify here, just that this one dialog's content still renders the same way through the new component.

- [ ] **Step 4: Commit**

```bash
git add src/components/AgreementDocument.tsx
git commit -m "$(cat <<'EOF'
Swap AgreementDocument's ID-photo viewer to shared DocumentViewer

This was explicitly built as a narrow stand-in until a general-
purpose viewer existed — it now exists.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `ClientDetail.tsx` — fix bucket bug, extend inline viewing to the generic docs grid

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (`DocRow` interface ~line 77, `fetchSignedUrls` ~lines 381-392, docs grid ~lines 1507-1563)

**Interfaces:**
- Consumes: `DocumentViewer` (Task 1).
- Produces: the corrected `fetchSignedUrls` behavior and a `parent_admin_doc_id`-aware `DocRow` — consumed by Task 6 (Assign to Slot), which downloads a document's bytes using the same bucket-selection logic.

- [ ] **Step 1: Add `parent_admin_doc_id` to `DocRow`**

Current (`src/pages/admin/ClientDetail.tsx:77`):

```typescript
interface DocRow { id: string; title: string; file_url: string; created_at: string; }
```

Change to:

```typescript
interface DocRow { id: string; title: string; file_url: string; created_at: string; parent_admin_doc_id: string | null; }
```

- [ ] **Step 2: Fix `fetchSignedUrls` to use the correct bucket per row**

Current (`src/pages/admin/ClientDetail.tsx:381-392`) only ever queries the `client-documents` bucket, silently failing to produce a signed URL for any row that was actually shared from the admin library (stored in `admin-documents`):

```typescript
  const fetchSignedUrls = async (rows: DocRow[]) => {
    if (!rows.length) { setDocUrls({}); return; }
    const { data: signed } = await supabase.storage
      .from("client-documents")
      .createSignedUrls(rows.map((d) => d.file_url), 3600);
    const map: Record<string, string> = {};
    (signed || []).forEach((item) => {
      const doc = rows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    setDocUrls(map);
  };
```

Replace with a version that splits rows by bucket first — matching the same `parent_admin_doc_id` check `PortalDocuments.tsx`'s `handleDownload` already uses for this exact distinction:

```typescript
  const fetchSignedUrls = async (rows: DocRow[]) => {
    if (!rows.length) { setDocUrls({}); return; }
    const clientBucketRows = rows.filter((d) => !d.parent_admin_doc_id);
    const adminBucketRows = rows.filter((d) => d.parent_admin_doc_id);
    const map: Record<string, string> = {};
    const [clientSigned, adminSigned] = await Promise.all([
      clientBucketRows.length
        ? supabase.storage.from("client-documents").createSignedUrls(clientBucketRows.map((d) => d.file_url), 3600)
        : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
      adminBucketRows.length
        ? supabase.storage.from("admin-documents").createSignedUrls(adminBucketRows.map((d) => d.file_url), 3600)
        : Promise.resolve({ data: [] as { path: string | null; signedUrl: string }[] }),
    ]);
    (clientSigned.data || []).forEach((item) => {
      const doc = clientBucketRows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    (adminSigned.data || []).forEach((item) => {
      const doc = adminBucketRows.find((d) => d.file_url === item.path);
      if (doc && item.signedUrl) map[doc.id] = item.signedUrl;
    });
    setDocUrls(map);
  };
```

- [ ] **Step 3: Add a viewer dialog and wire the docs grid's click to open it instead of a new tab**

Add new state near the other docs-grid state (alongside `editingDocId`/`editingDocTitle`):

```typescript
  const [viewingDoc, setViewingDoc] = useState<DocRow | null>(null);
```

Current click handler in the docs grid (`src/pages/admin/ClientDetail.tsx`, inside `docs.map((d) => {...})`):

```tsx
                    <button
                      className="w-full text-left focus:outline-none"
                      onClick={() => signedUrl && editingDocId !== d.id && window.open(signedUrl, "_blank")}
                      disabled={!signedUrl || editingDocId === d.id}
                    >
```

Change the `onClick` to open the new viewer dialog instead of a new tab:

```tsx
                    <button
                      className="w-full text-left focus:outline-none"
                      onClick={() => signedUrl && editingDocId !== d.id && setViewingDoc(d)}
                      disabled={!signedUrl || editingDocId === d.id}
                    >
```

Add the dialog itself near the other per-doc dialogs in this file (e.g. alongside the "Upload Document" dialog):

```tsx
      <Dialog open={!!viewingDoc} onOpenChange={(open) => !open && setViewingDoc(null)}>
        <DialogContent className="sm:max-w-2xl bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">{viewingDoc?.title}</DialogTitle></DialogHeader>
          {viewingDoc && (
            <DocumentViewer url={docUrls[viewingDoc.id] || null} fileName={viewingDoc.file_url} />
          )}
        </DialogContent>
      </Dialog>
```

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
```

Since this page requires an authenticated admin session, verify the bucket fix at the data layer instead: using the Supabase MCP `execute_sql` tool, find a real `client_documents` row with `parent_admin_doc_id` set for some client (`select id, file_url, parent_admin_doc_id from client_documents where parent_admin_doc_id is not null limit 1`), and confirm the file actually exists in the `admin-documents` bucket at that path (not `client-documents`) — this proves the bug was real and that routing that row through `createSignedUrls` against `admin-documents` (as the fixed code now does) is the correct fix, whereas the old code would have queried `client-documents` and gotten no match.

- [ ] **Step 5: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Fix wrong-bucket signed URLs and add inline viewing for admin docs grid

fetchSignedUrls only ever queried the client-documents bucket, so any
document shared from the admin library (stored in admin-documents)
silently got no signed URL and couldn't be opened. Split the fetch by
parent_admin_doc_id like PortalDocuments.tsx's handleDownload already
does, and open documents in an inline viewer instead of a new tab.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `PortalDocuments.tsx` — extend inline viewing to the generic shared-documents list

**Files:**
- Modify: `src/pages/portal/PortalDocuments.tsx` (generic documents list, ~lines 356-376)

**Interfaces:**
- Consumes: `DocumentViewer` (Task 1).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add viewer state and a signed-URL fetch reusing the existing bucket logic**

`handleDownload` (`src/pages/portal/PortalDocuments.tsx:103-119`) already derives the correct bucket per-row:

```typescript
  const handleDownload = async (doc: any) => {
    setDownloadingId(doc.id);
    try {
      let path: string = doc.file_url;
      const marker = "/client-documents/";
      const idx = path.indexOf(marker);
      if (idx !== -1) path = path.substring(idx + marker.length);
      // If parent_admin_doc_id exists, signed url is from admin-documents
      const bucket = doc.parent_admin_doc_id ? "admin-documents" : "client-documents";
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
      if (error || !data?.signedUrl) {
        toast({ title: "Unable to open document", variant: "destructive" });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally { setDownloadingId(null); }
  };
```

Add new state near the other document-list state (alongside `thread`/`newMsg`):

```typescript
  const [viewingDoc, setViewingDoc] = useState<any>(null);
  const [viewingDocUrl, setViewingDocUrl] = useState<string | null>(null);
```

Add a new function right after `handleDownload`, reusing its exact path/bucket derivation:

```typescript
  const handleView = async (doc: any) => {
    setViewingDoc(doc);
    setViewingDocUrl(null);
    let path: string = doc.file_url;
    const marker = "/client-documents/";
    const idx = path.indexOf(marker);
    if (idx !== -1) path = path.substring(idx + marker.length);
    const bucket = doc.parent_admin_doc_id ? "admin-documents" : "client-documents";
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Unable to open document", variant: "destructive" });
      setViewingDoc(null);
      return;
    }
    setViewingDocUrl(data.signedUrl);
  };
```

- [ ] **Step 2: Wire the list to open the viewer instead of downloading on click**

Current (`src/pages/portal/PortalDocuments.tsx:356-376`):

```tsx
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <button onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), "MMM d, yyyy")} • Uploaded by {doc.uploaded_by}
                </p>
                {doc.note && <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">"{doc.note}"</p>}
              </button>
              <Button variant="ghost" size="sm" onClick={() => openThread(doc)} title="Message about this document">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id}>
                {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>
```

Change the title button's click to open the viewer, keeping the explicit download icon button as-is for a direct download:

```tsx
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-4 rounded-lg border border-border/30 bg-card hover:border-primary/30 transition-colors">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <button onClick={() => handleView(doc)} className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium truncate">{doc.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(doc.created_at), "MMM d, yyyy")} • Uploaded by {doc.uploaded_by}
                </p>
                {doc.note && <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">"{doc.note}"</p>}
              </button>
              <Button variant="ghost" size="sm" onClick={() => openThread(doc)} title="Message about this document">
                <MessageSquare className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => handleDownload(doc)} disabled={downloadingId === doc.id}>
                {downloadingId === doc.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              </Button>
            </div>
          ))}
        </div>

        <Dialog open={!!viewingDoc} onOpenChange={(open) => { if (!open) { setViewingDoc(null); setViewingDocUrl(null); } }}>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>{viewingDoc?.title}</DialogTitle></DialogHeader>
            {viewingDoc && (
              <DocumentViewer url={viewingDocUrl} fileName={viewingDoc.title} />
            )}
          </DialogContent>
        </Dialog>
```

- [ ] **Step 3: Import `DocumentViewer`**

Add near the other `@/components` imports:

```typescript
import DocumentViewer from "@/components/DocumentViewer";
```

- [ ] **Step 4: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/portal/PortalDocuments.tsx
```

This page requires an authenticated client (portal) session — if unavailable, confirm the fix's logic is sound by reading it against real data: use the Supabase MCP `execute_sql` tool to find a `client_documents` row with `parent_admin_doc_id` set, confirm the file exists in `admin-documents` at that path (same check as Task 4), and confirm `handleView`'s bucket derivation would resolve it correctly.

- [ ] **Step 5: Commit**

```bash
git add src/pages/portal/PortalDocuments.tsx
git commit -m "$(cat <<'EOF'
Add inline viewing to client portal's shared-documents list

Previously every document opened in a new tab via handleDownload;
clicking a document's title now opens it inline via DocumentViewer,
reusing handleDownload's existing per-row bucket derivation. The
explicit download button is unchanged.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: "Assign to Slot" admin action

**Files:**
- Modify: `src/pages/admin/ClientDetail.tsx` (docs grid hover actions ~lines 1545-1560, new dialog)

**Interfaces:**
- Consumes: `handleSlotUpload(slotType: string, file: File)` (existing, unchanged), `fetchSignedUrls`'s bucket-aware pattern (Task 4), `allPlans`/`getProjectTypeTemplate` (existing).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add state for the assign dialog**

Add near `viewingDoc` (Task 4):

```typescript
  const [assignSlotDoc, setAssignSlotDoc] = useState<DocRow | null>(null);
  const [assignSlotType, setAssignSlotType] = useState<string>("");
  const [assigningSlot, setAssigningSlot] = useState(false);
```

- [ ] **Step 2: Add the "does this client have a slot-capable plan" check**

Near where `plan`/`allPlans` are already derived (after the existing `const plan = allPlans.find(...)` line), add:

```typescript
  const slotCapablePlan = allPlans.find((p) => getProjectTypeTemplate(p.project_type).usesDocumentSlots);
```

- [ ] **Step 3: Add the "Assign to Slot" hover-action button**

Current hover-action row in the docs grid (`src/pages/admin/ClientDetail.tsx`):

```tsx
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-blue-50 text-black/40 hover:text-blue-600"
                        onClick={(e) => { e.stopPropagation(); setEditingDocId(d.id); setEditingDocTitle(d.title); }}
                        title="Rename"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-red-50 text-black/40 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d); }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
```

Add a third button, only when the client has a slot-capable plan:

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
                      <button
                        className="p-1 rounded-full bg-white/80 hover:bg-red-50 text-black/40 hover:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDeleteDoc(d); }}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
```

Add `FolderInput` to the existing `lucide-react` import list at the top of the file.

- [ ] **Step 4: Add the assign handler and dialog**

Add a new function near `handleSlotUpload`:

```typescript
  const handleAssignToSlot = async () => {
    if (!assignSlotDoc || !assignSlotType) return;
    setAssigningSlot(true);
    try {
      let path: string = assignSlotDoc.file_url;
      const marker = "/client-documents/";
      const idx = path.indexOf(marker);
      if (idx !== -1) path = path.substring(idx + marker.length);
      const bucket = assignSlotDoc.parent_admin_doc_id ? "admin-documents" : "client-documents";
      const { data: blob, error: downloadError } = await supabase.storage.from(bucket).download(path);
      if (downloadError || !blob) {
        toast({ title: "Could not read source file", description: downloadError?.message, variant: "destructive" });
        return;
      }
      const originalName = assignSlotDoc.file_url.split("/").pop() || assignSlotDoc.title;
      const file = new File([blob], originalName, { type: blob.type });
      await handleSlotUpload(assignSlotType, file);
      setAssignSlotDoc(null);
      setAssignSlotType("");
    } finally {
      setAssigningSlot(false);
    }
  };
```

Add the dialog near the other per-doc dialogs (e.g. next to the "Upload Document" dialog):

```tsx
      <Dialog open={!!assignSlotDoc} onOpenChange={(open) => !open && setAssignSlotDoc(null)}>
        <DialogContent className="sm:max-w-md bg-white text-black" style={lightVars}>
          <DialogHeader><DialogTitle className="text-black">Assign to Project Slot</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Copy "{assignSlotDoc?.title}" into one of this project's document slots.
            </p>
            <Select value={assignSlotType} onValueChange={setAssignSlotType}>
              <SelectTrigger className="bg-white text-black border-black/20">
                <SelectValue placeholder="Choose a slot…" />
              </SelectTrigger>
              <SelectContent style={lightVars} className="bg-white text-black">
                {SLOT_TYPES.map((slotType) => (
                  <SelectItem key={slotType} value={slotType}>{SLOT_LABELS[slotType]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleAssignToSlot}
              disabled={!assignSlotType || assigningSlot}
              className="w-full"
            >
              {assigningSlot && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 5: Verify**

Run:
```bash
npx tsc --noEmit -p .
npx eslint src/pages/admin/ClientDetail.tsx
```

Since this requires an authenticated admin session to click-test, verify the download/upload round-trip directly instead: using the Supabase MCP `execute_sql`/storage tools, pick a real `client_documents` row for a client who has a `website_build` plan, confirm you can `download` its file from the correct bucket (per Step 4's bucket logic), and confirm a file can be `upload`ed to `client-slot-docs` under the `${clientId}/${slotType}/...` path convention `handleSlotUpload` uses — then delete any test file/row you create so no test data is left in `client_document_slots` for a real client. Do not actually run this against a client's real, currently-empty slot unless you immediately revert it — prefer a slot that's already `na` or a client you're certain has no in-progress slot work, and confirm the before/after state before leaving it.

- [ ] **Step 6: Commit**

```bash
git add src/pages/admin/ClientDetail.tsx
git commit -m "$(cat <<'EOF'
Add "Assign to Slot" action for admin's generic document list

Downloads a document's bytes from whichever bucket it actually lives
in and hands them to the existing handleSlotUpload function — no new
upload, phase-completion, or agreement-check logic. Only shown when
the client has a plan whose project type has document slots at all,
so it becomes available for Google Ads plans automatically once
Section 5 adds slot definitions for that type.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```
