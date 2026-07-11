# Shared DocumentViewer + Assign-to-Slot

## Context

This is Section 3 of a larger multi-section spec ("Bounty Program, Dashboard UX, and
Multi-Project-Type Document Flows" — full doc at
`docs/superpowers/specs/2026-07-11-bounty-dashboard-project-types.md`), being done one
section at a time. Section 4 (agreement signing) already shipped. Sections 1, 2, 5, 6, 7, 8
remain, tracked in memory.

Reading the current repo before writing this spec revealed the section is smaller than
originally assumed:

- **An inline embedded viewer already exists — duplicated three times.** `PortalDocuments.tsx`
  has one implementation for standard document slots and a second, separate but
  near-identical implementation just for the agreement slot's special-cased rendering.
  `ClientDetail.tsx` (admin) has a third, independent implementation of the same
  image-vs-iframe branching logic for its own slot viewer. All three do: image extension
  check → `<img>`, otherwise → `<iframe>`, plus a download link, expanding in place within
  the page (not a modal) — which already satisfies the "no navigate away, tabs/nav still
  visible" requirement. The actual gap is the duplication, not the behavior.
- **Two generic document lists still open a new tab instead of viewing inline:**
  `PortalDocuments.tsx`'s "shared documents" section (the client's view of admin-shared
  files, distinct from the project-slot list above it) calls `window.open(signedUrl, "_blank")`
  on download. `ClientDetail.tsx`'s admin-side generic per-client `docs` grid (also distinct
  from its slot list) does the same on thumbnail click.
- **`AgreementDocument.tsx`'s ID-photo viewer** (built in the previous session's agreement-signing
  work) is a fourth, narrow, single-purpose inline viewer, explicitly built as a stand-in
  until a general-purpose component existed. That component is what this spec builds.
- **`handleSlotUpload(slotType: string, file: File)`** (`ClientDetail.tsx:1113-1140`) already
  does everything a slot-fill needs: uploads to `client-slot-docs`, upserts the
  `client_document_slots` row, and — via `updateProjectPhaseForSlot` (:1054-1092) and
  `checkAndTriggerAgreement` (:1094-1111) — updates the linked project phase and checks
  whether the agreement slot should auto-transition to `in_preparation`. It takes a plain
  `File` object; nothing about its internals assumes the file came from a browser
  `<input type="file">` versus being constructed in memory.
- **`SLOT_TYPES`** (`ClientDetail.tsx:195`, a flat 5-item array: `site_audit`,
  `market_research`, `service_tier`, `plan`, `agreement`) is hardcoded — only the
  `website_build` project type has slots today (`usesDocumentSlots: true` in
  `src/lib/projectTemplates.ts`; `google_ads` has `usesDocumentSlots: false` and no slot
  definitions at all). Section 5 (not yet built) is expected to add a Google-Ads slot set
  to `projectTemplates.ts` later.
- **Two extension-checking implementations already disagree slightly**: the three slot
  viewers use the regex `/\.(png|jpg|jpeg|gif|webp|svg)$/i`; `ClientDetail.tsx`'s generic
  grid uses a `Set` (`IMAGE_EXTS`, `ClientDetail.tsx:215`) that additionally includes
  `avif`. The shared component should have one canonical definition, not require every
  caller to pass its own `isImage` boolean.

Decided during brainstorming: "Assign to Slot" lives only in `ClientDetail.tsx` (not
duplicated into the separate admin `Documents.tsx` library page), and this section replaces
all three existing slot-viewer duplicates with the new shared component rather than leaving
them in place alongside it.

Out of scope: admin's global `Documents.tsx` library page (the "My Files" / "Client Files"
tabs) — not touched at all by this section. Section 5's actual Google-Ads slot definitions —
this section only makes the slot-picker generic enough to pick them up later, it doesn't add
them.

## 1. `src/components/DocumentViewer.tsx` (new)

A pure rendering component — it does not fetch signed URLs itself, since every existing
caller already has its own signed-URL-fetching logic scoped to a different storage bucket
(`client-slot-docs`, `client-documents`, `admin-documents`). It only standardizes *how* a
resolved URL gets displayed.

```typescript
interface DocumentViewerProps {
  url: string | null;       // signed URL, or null while still loading
  fileName: string;         // used for extension detection and the download filename
  loading?: boolean;        // shows a spinner instead of content
  downloadUrl?: string;     // defaults to `url` if omitted — some callers may want a
                             // longer-lived download link than the inline preview URL
}
```

Behavior: if `loading` (or `url` is null and `loading` isn't explicitly false), render a
centered spinner. Otherwise, check `fileName`'s extension against a canonical image set
(`jpg`, `jpeg`, `png`, `gif`, `webp`, `svg`, `avif` — the more complete of the two existing
definitions) and render `<img>` or `<iframe>` accordingly, plus a download link/button below.
No modal/dialog wrapper of its own — callers keep controlling their own expand/collapse or
dialog-open state exactly as they do today; this component only owns the "what does the
preview look like" part.

## 2. Replace the four existing inline-viewer implementations

- `PortalDocuments.tsx`'s standard-slot viewer block and its separate agreement-slot viewer
  block both become `<DocumentViewer url={signedUrl} fileName={slot.file_name} />` (or
  equivalent), inside their existing expand/collapse wrappers — no change to the
  expand/collapse state logic itself, only to what renders inside it.
- `ClientDetail.tsx`'s admin slot viewer (the `expandedSlot && (() => {...})()` block) becomes
  the same.
- `AgreementDocument.tsx`'s ID-photo `Dialog` content (image/iframe branch) becomes
  `<DocumentViewer url={viewIdUrl} fileName={record.id_document_path ?? ""} loading={viewIdLoading} />`
  — the surrounding `Dialog`/`viewIdOpen`/`handleViewId` logic from the agreement-signing
  work is unchanged, only the rendered content inside it changes.

## 3. Extend inline viewing to the two generic document lists

- `PortalDocuments.tsx`'s "shared documents" list: replace the `handleDownload` → `window.open`
  click behavior with an expand-in-place row (matching the existing slot list's UX pattern)
  using `DocumentViewer`, fetching a signed URL from the correct bucket (`admin-documents` if
  `parent_admin_doc_id` is set, `client-documents` otherwise — same bucket logic
  `handleDownload` already has) on first expand.
- `ClientDetail.tsx`'s generic per-client `docs` grid: replace the thumbnail's
  `window.open(signedUrl, "_blank")` click behavior with a `Dialog` containing
  `DocumentViewer`, reusing the signed URLs already fetched into `docUrls` for the grid
  thumbnails.
- A plain "Download" affordance (already present in both places) stays available
  independently of the inline view — this section adds inline viewing, it doesn't remove
  the ability to actually download the file.

## 4. "Assign to Slot" (`ClientDetail.tsx` only)

- New action (e.g. a button in the hover-action row already used for rename/delete) on each
  card in the generic `docs` grid.
- Visible only when the client has an active plan whose `project_type` resolves to
  `usesDocumentSlots: true` via `getProjectTypeTemplate` (`src/lib/projectTemplates.ts`) —
  today that means only when the client has a `website_build` plan. This reads the flag
  generically rather than hardcoding "website_build", so a future Google-Ads slot set
  (Section 5) becomes assignable here with no further change to this code.
- Opens a small dialog listing the current project type's slot types (today, the fixed 5:
  `site_audit`, `market_research`, `service_tier`, `plan`, `agreement`) with their labels.
- On confirm:
  1. Download the source document's bytes: `supabase.storage.from(bucket).download(path)`,
     where `bucket`/`path` are derived the same way `handleDownload` already derives them
     for this same `docs` array (`admin-documents` + stripped path if
     `parent_admin_doc_id` is set, otherwise `client-documents` + `file_url` directly — check
     the exact existing derivation in `handleDownload` before implementing, don't assume).
  2. Wrap the resulting `Blob` as a `File`: `new File([blob], originalFileName, { type: blob.type })`,
     preserving the original filename so `handleSlotUpload`'s own `${id}/${slotType}/${Date.now()}_${file.name}`
     path construction produces a sensible name.
  3. Call the **existing** `handleSlotUpload(slotType, file)` directly — no new upload,
     upsert, phase-completion, or agreement-check logic is written; all of it is reused
     as-is.
- The original `client_documents` row is left untouched — the file now exists in both the
  generic list and the slot (a copy, not a move). This avoids any question of whether
  removing it from the generic list would break something else that reads from it (e.g. the
  client's own portal view of admin-shared documents).

## Explicitly out of scope

- Admin's global `Documents.tsx` library page — no changes.
- Section 5's actual Google-Ads slot type/label definitions — only the generic
  `usesDocumentSlots` check that will pick them up later.
- Any change to `handleSlotUpload`, `updateProjectPhaseForSlot`, or
  `checkAndTriggerAgreement`'s internal logic — they're reused exactly as they exist today.
