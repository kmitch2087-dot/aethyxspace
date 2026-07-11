# Admin Dashboard Redesign + Client Messaging Inbox

## Context

Three related requests:

1. **AI assistant should be a bubble, not an inline panel.** `AdminAssistant` (`src/components/AdminAssistant.tsx`) is rendered as a full inline `<Card>` directly in `Dashboard.tsx` (line 122), with a fixed 72-unit-tall chat window — it dominates the top of the admin landing page. The public site already has the right pattern for this: `PublicConcierge` (`src/components/PublicConcierge.tsx`) is a floating bottom-right bubble that expands into a panel on click, rendered globally in `App.tsx` but explicitly hidden on `/admin`/`/portal` routes. `AdminAssistant` should become the same shape — a floating bubble, not an inline dashboard block.
2. **Dashboard landing page should show more relevant info.** Once the assistant is no longer occupying the top of the page, that space (and the page generally) should surface what an admin actually needs at a glance — most of which doesn't exist as a widget today.
3. **No way to message clients internally.** Investigated: `client_messages` (`id, user_id, message, created_at` — no sender/direction column at all) is currently client→admin only. `PortalMessages.tsx` lets a client write in; `ClientDetail.tsx`'s Messages tab (`src/pages/admin/ClientDetail.tsx:3116-3123`) is read-only — no input box, no send button, and even if one were added, there is no schema-level way to tell an admin-authored message apart from a client-authored one once both are stored under the client's own `user_id` (required for the client's own RLS-scoped SELECT to ever show it). This needs both a schema change and new UI — plus, per "I need an inbox," a consolidated cross-client view, not just fixing the existing per-client tab in isolation.

## 1. AI Assistant → floating bubble

`AdminAssistant` is restructured to match `PublicConcierge`'s shape exactly (floating button bottom-right, expands to a panel, same open/close/animate behavior) — reusing the same `useAiChat("admin", ...)` hook it already uses, just changing the container/trigger, not the chat logic itself. Rendered once, globally, in `AdminLayout.tsx` (so it's available from every admin page, not just the Dashboard) rather than embedded inline in `Dashboard.tsx`. The inline `<AdminAssistant />` block is removed from `Dashboard.tsx` entirely.

## 2. Dashboard landing page — what actually goes there

Existing stat cards (Blog Posts, Inquiries, Reviews, Agreements, Revenue) and the Traffic Sources section stay — they're reasonable, just no longer competing with a giant chat panel for the top of the page. New content added to fill the freed space and round out what's "more important and relevant":

- **Unread messages card** — count of unread client messages across all clients (ties into the new Inbox below), links to `/admin/inbox`.
- **Pending invoices card** — count + total $ of unpaid `client_invoices` (a real, currently-missing "what do I need to chase" signal) — note: the existing "Revenue"/"pending payments" stat reads from `financial_records`, a manually-entered table, not live `client_invoices`/Stripe data, so this is a genuinely new, more accurate signal, not a duplicate.
- **Pending intake reviews card** — count of `client_intakes` with `status = 'new'`.
- **Pending bounty applicants card** — count of `bounty_applicants` with `status = 'pending'` (from the just-shipped Bounty Program).
- **Pending add-on requests card** — count of `client_add_ons` with `status = 'requested'` (already tracked as a nav badge elsewhere — surfacing it here too for at-a-glance visibility).

These become a new "Needs Attention" section at the top of the Overview tab (above the existing stat cards), each card linking directly to the relevant admin page/filtered view. The existing "Agreements" stat card is flagged as reading from the **legacy** `client_agreements` table (a separate, pre-payment Google-Forms-based system, confirmed still untouched from earlier session work) rather than the current `client_agreement_records` table this app's real agreement-signing flow uses — out of scope to fix here (not what was asked), but worth a follow-up ticket since it's likely showing a stale/irrelevant count today.

## 3. Client Messaging Inbox (two-way)

**Schema**:
```sql
ALTER TABLE client_messages ADD COLUMN sender text NOT NULL DEFAULT 'client';
ALTER TABLE client_messages ADD COLUMN client_profile_id uuid REFERENCES client_profiles(id) ON DELETE CASCADE;
```
- `sender: 'client' | 'admin'` — the missing direction column. Defaults `'client'` so every existing row (all client-authored, since there was no admin-send path before now) is correctly classified with zero backfill ambiguity.
- `client_profile_id` — every existing portal/admin messaging query already resolves this via a join through `user_id`; adding it directly avoids that indirection for the new Inbox's cross-client list view. Backfilled from `client_profiles.user_id = client_messages.user_id` for all existing rows (unambiguous, one profile per user_id).
- Admin-authored rows are still inserted with `user_id` = the **client's** user_id (not the admin's) — required for `PortalMessages.tsx`'s existing client-side RLS-scoped SELECT (`auth.uid() = user_id`) to see them at all. `sender = 'admin'` is what lets the client UI (and the new admin Inbox) tell the two apart.
- New RLS: the existing "Admins can manage client_messages" policy needs verifying it's actually `has_role`-scoped (not a blanket permissive policy) before this ships — confirm during planning.

**Admin UI**:
- New page `src/pages/admin/Inbox.tsx` (route `/admin/inbox`, new `AdminLayout.tsx` nav item) — a real inbox: left column lists every client with an active thread (most-recent-message-first, unread count badge per client), right column shows the selected client's full thread with a send box at the bottom (mirrors `PortalMessages.tsx`'s existing send-box pattern).
- `ClientDetail.tsx`'s Messages tab gets the same send-box treatment added directly (so admin can reply from within a client's own detail page too, not only from the Inbox) — both surfaces read/write the same `client_messages` rows.
- "Unread" tracked via the same `client_portal_seen_at`-style mechanism already established for the client-side portal badges, mirrored for the admin side (e.g. a small `admin_message_seen_at` table or a reused generic pattern — exact shape decided during planning).

## Explicitly out of scope

- Real-time push notifications for new messages (e.g. websockets/toasts the moment a client sends something) — this is a page-load-refresh inbox, not a live chat.
- Rich text / attachments in messages — plain text only, matching the existing `PortalMessages.tsx` behavior.
- Fixing the legacy `client_agreements`-vs-`client_agreement_records` dashboard stat mismatch — flagged, not fixed, in this pass.
- Any change to `PublicConcierge`/the public-site AI assistant — only the admin-side one changes shape.
