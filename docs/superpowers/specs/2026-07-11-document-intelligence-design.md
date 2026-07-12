# Document Intelligence — Extraction & Auto-Fill (Phase A)

## Context

Fourth and final piece of the multi-business initiative. Clients and Kristin both upload documents (`client_documents`, `admin_documents`) that currently just sit there as files — a brand brief, an old marketing plan, a business description PDF — none of it gets parsed for the structured business information (contact info, hours, staff, brand voice, etc.) it likely contains.

This spec covers only the extraction/auto-fill half of "document intelligence." A second capability — generating brand-new derived documents (e.g. an auto-drafted project plan doc) from data already in the system — is explicitly deferred to its own future spec, since combining both in one pass was judged too large for a feature already flagged as the most novel/undefined item in the backlog.

The just-shipped **AI Asset Scraping** feature already solves the identical underlying problem for a different source: given unstructured text (a scraped webpage), call Gemini with an extraction prompt, produce categorized suggestions (`client_asset_scrape_items`, category ∈ `contact_info | hours | staff | brand_voice | tagline | motto | mission | values | ...`), and let Kristin review/approve each into a real `client_assets` row via the existing "Pending review" queue in `ClientDetail.tsx`. This spec reuses that entire pipeline — schema, review UI, approve/reject logic — swapping only the source (an uploaded file instead of a scraped URL) and the fetch mechanism (Supabase Storage instead of an HTTP `fetch()` of a webpage).

## 1. Trigger

Manual, per-document — matching the existing "Scrape from URL" button's UX rather than running automatically on every upload (avoids unexpected Gemini API costs and keeps Kristin in control of what gets processed, and when).

**`client_documents` (client-uploaded, from `ClientDetail.tsx`)**: a new "Extract info" button next to each document row. Clicking it kicks off extraction immediately — no dialog needed, since the client (and therefore the target `client_profile_id` for the resulting suggestions) is already unambiguous from the page you're on.

**`admin_documents` (Kristin's global document library, `src/pages/admin/Documents.tsx`, no client link at all)**: this table has no `client_profile_id`, so extracting from one of these documents needs an explicit target client. Reuses the existing `openAction(doc, mode)` / `actionDoc` / `actionClientIds` dialog-and-checkbox-list pattern already built for that page's "Share with client(s)" / "Email now" / "Schedule send" actions — adds a fourth mode, `"extract"`, using the same client-checkbox list UI but requiring exactly one client selected (not multiple, since a scrape's suggestions land in exactly one client's review queue).

## 2. Extraction method

The target document's file is fetched from its Supabase Storage bucket (`client-documents` or `admin-documents`, matching the bucket-selection logic `PortalDocuments.tsx` already uses: `doc.parent_admin_doc_id ? "admin-documents" : "client-documents"`), base64-encoded, and sent to Gemini's `generateContent` endpoint as inline file data (`inline_data: { mime_type: "application/pdf", data: <base64> }`) alongside the same extraction prompt/JSON-array response format `scrape-client-assets` already uses for text. Gemini reads the PDF's actual content natively — including scanned/image-based pages — which is a capability the existing HTML-text-scraping approach never needed and never had.

**Scope of file types, this pass**: PDF only. `client_documents`/`admin_documents` rows whose `file_name` doesn't end in `.pdf` are simply not offered the "Extract info" action (button hidden/disabled) — broadening to other formats (Word docs, images) is a natural future extension once this pipeline is proven, not part of this pass.

**Size guard**: skip files over 15MB (Gemini's inline-data practical limit for reliable synchronous calls) with a clear error surfaced in the scrape row's `error_message`, matching the existing pattern where `scrape-client-assets` surfaces `geminiError` reasons the same way.

## 3. Schema changes

Extend the existing review-queue tables rather than creating parallel ones:

```sql
ALTER TABLE client_asset_scrapes ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_id uuid;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_type text;
ALTER TABLE client_asset_scrapes ADD CONSTRAINT client_asset_scrapes_source_check
  CHECK (
    (source_url IS NOT NULL AND source_document_id IS NULL AND source_document_type IS NULL)
    OR (source_url IS NULL AND source_document_id IS NOT NULL AND source_document_type IN ('client_documents', 'admin_documents'))
  );
```

A `client_asset_scrapes` row is now either URL-sourced (existing behavior, unchanged) or document-sourced (new) — never both, never neither, enforced by the check constraint. `source_document_id` intentionally has no FK constraint since it can point into either of two different tables (`client_documents` or `admin_documents`) depending on `source_document_type` — a polymorphic reference, resolved in application code, not the database.

`client_asset_scrape_items` needs no schema change at all — it already just stores `scrape_id, kind, suggested_category, suggested_label, content, status`, agnostic to where the parent scrape's source came from.

## 4. New edge function: `extract-document-assets`

Mirrors `scrape-client-assets`'s structure closely: admin-auth check, create a `client_asset_scrapes` row (with `source_document_id`/`source_document_type` instead of `source_url`), fetch the file from Storage, call Gemini with the same extraction prompt (image-free variant of the current prompt — this pass has no "extract logo/photo" step the way URL-scraping does, since a business PDF isn't a source of downloadable brand images), insert `client_asset_scrape_items` rows, mark `client_asset_scrapes.status` complete/error. Reuses the existing `GEMINI_API_KEY` secret and the same admin-role check pattern already established for `scrape-client-assets`.

Takes `clientProfileId` explicitly in its request body in both cases (resolved automatically from the page context for `client_documents`, resolved from the admin's client-picker selection for `admin_documents`) — the function itself doesn't need to know or care which source table the caller used to arrive at that id.

**A technical divergence from `scrape-client-assets`, deliberate**: the URL-scraping function calls Gemini via its OpenAI-compatible chat-completions shim (`.../v1beta/openai/chat/completions`) with a plain text prompt — that endpoint isn't a reliable way to send PDF file content. This function instead calls Gemini's native `generateContent` endpoint (`.../v1beta/models/gemini-2.5-flash:generateContent`) with a `contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: "application/pdf", data: base64Data } }] }]` body — Gemini's documented, supported way to send file input. Same API key, same model, different endpoint shape because the payload is fundamentally different (file bytes, not scraped text).

## 5. Review UI — no changes needed

The existing "Pending review" queue in `ClientDetail.tsx`'s Assets tab already queries `client_asset_scrape_items` joined through `client_asset_scrapes` filtered by `client_profile_id`, with no assumption about how the parent scrape originated. Document-sourced suggestions appear in the exact same Approve/Reject queue, with the exact same category badges, as URL-scraped ones — zero UI changes required for review/approval itself.

One small addition: the queue's existing item cards currently don't show provenance (was this suggestion from a URL scrape or a document?) — add a small "from: <document title>" or "from: <source URL>" caption to each pending item for clarity, since Kristin will now have two different sources feeding the same queue.

## Explicitly out of scope

- Document *generation* (creating a new derived document, e.g. an auto-drafted project plan) — deferred to its own future spec.
- Non-PDF file types (Word docs, images, plain text) — PDF only this pass.
- Automatic/on-upload extraction — manual trigger only.
- Extracting from signed agreement PDFs (`client_agreement_records`) — explicitly excluded per the scoping discussion, since agreement data is already manually entered before the PDF exists, so there's little new information to gain.
- Any change to `scrape-client-assets` (the URL-scraping function) itself, beyond what the schema change requires it to remain compatible with (it continues setting `source_url`, never the two new columns).
