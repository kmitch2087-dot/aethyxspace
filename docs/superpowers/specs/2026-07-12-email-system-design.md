# Branded Email System — Logo, Sent Log, Compose

## Context

Three related asks bundled into one spec since they're all about the branded outbound email experience Kristin already likes the look of:

1. Add the Aethyx logo to outgoing emails.
2. A "Sent" folder logging outbound emails, collapsing mass sends (same email to many clients) into one thread.
3. A general-purpose "compose a branded email to a client" feature from the admin dashboard, not just automated system emails triggered by specific actions.

Bundled as one spec because the Sent log's "collapse mass emails" requirement and the Compose feature's "send to multiple clients" capability are the same mechanism (a shared `batch_id`), and the logo touches every template both existing and new.

Research confirmed: `send-transactional-email` (`supabase/functions/send-transactional-email/index.ts`) is the synchronous send path used by all UI-triggered emails, backed by a shared template registry (`supabase/functions/_shared/transactional-email-templates/registry.ts`, 17 `.tsx` template files, no shared header/footer component). Every send is logged to `email_send_log` (`created_at, template_name, recipient_email, status, metadata jsonb`), but `metadata` is declared and never populated by either send path — no batch/campaign grouping exists today. The admin Inbox (`src/pages/admin/Inbox.tsx`, shipped earlier this session) is a completely separate system built for two-way `client_messages` portal messaging; it has no tabs today and no awareness of `email_send_log` at all. No stable public URL for the Aethyx logo exists — the only copy is a Vite-bundled asset whose path changes every rebuild.

## 1. Logo in email templates

Copy the logo PNG into `public/aethyx-logo.png` — Vite serves files from `public/` at a fixed, un-hashed path (`https://aethyx.space/aethyx-logo.png`), unlike the existing `src/assets/` copy whose bundled path changes every deploy. Add a small `<Img src="https://aethyx.space/aethyx-logo.png" width="140" alt="Aethyx" />` above the existing `<Heading>` in each of the 17 template files, matching each template's existing minimal, text-forward style — no other layout change, no shared-wrapper refactor (mechanical, isolated edits to preserve "I like the way they look now").

## 2. Sent tab on the Inbox page

`Inbox.tsx` gains a two-tab header: **Messages** (existing, unchanged) and **Sent** (new). The Sent tab queries `email_send_log` ordered by `created_at DESC`, grouping rows by `metadata->>'batch_id'` where present:
- A row with a `batch_id` shared by other rows collapses into one thread entry: template display name (from the registry), subject/preview if available, "Sent to N clients", most recent timestamp. Expanding it lists every individual recipient with their own `status` (sent/failed/bounced/etc., using the existing check-constrained column).
- A row with no `batch_id` (every existing automated email — invoices, fee-waived, portal-invite, document-share, etc.) renders as its own single entry, exactly as it already happens today (all of these are inherently single-recipient anyway) — no retrofitting needed for old rows, no backfill migration.

This requires `send-transactional-email` to accept an optional `metadata` object in its request body and persist it into `email_send_log.metadata` (currently accepted structurally but never populated by any caller) — a small, additive change to the function, not a breaking one (existing callers that don't pass `metadata` continue to work identically, with `metadata` staying null exactly as it does today).

## 3. Compose branded email

**New template**: `admin-compose` added to the registry — same branded wrapper/logo as every other template, rendering an admin-authored subject + free-form message body (no structured `templateData` fields beyond `firstName`, `subject`, `message`).

**Two entry points, one underlying dialog/logic:**
- **Inbox page**: a "Compose email" button opens a dialog with a client checkbox multi-select (same pattern as `Documents.tsx`'s Share/Email action — `actionClientIds`-style), a subject field, and a message textarea. Sends to every checked client.
- **ClientDetail page**: the same "Compose email" action, pre-filled to just that one client (the checkbox list is skipped entirely — this entry point is always single-recipient).

**Sending logic**: for N recipients, generate one `batch_id` (a UUID) client-side before sending; call `send-transactional-email` once per recipient with `templateName: "admin-compose"`, that recipient's email, and `metadata: { batch_id }`. A single-recipient send (either compose entry point with exactly one client) still gets a `batch_id` for consistency, even though it'll never visually collapse with anything else in the Sent tab.

## Explicitly out of scope

- Rich text / attachments in the compose message — plain text only, matching every other template's convention in this app.
- Scheduling a compose send for later — that's `Documents.tsx`'s existing separate "Schedule send" feature for admin-uploaded documents, unrelated to this ad-hoc client-communication feature.
- Retroactively grouping/backfilling `batch_id` onto historical `email_send_log` rows sent before this feature existed — they simply render as individual entries, which is already correct since none of them were ever true "mass sends" needing collapse (each existing template is inherently one-recipient-triggered-by-one-event).
- A shared header/footer wrapper component refactor across the 17 existing templates — logo is added as a small, mechanical per-file edit to avoid restructuring templates Kristin already likes.
- Read receipts, open tracking, or any analytics beyond the existing `status` lifecycle (sent/failed/bounced/etc.) `email_send_log` already tracks.
