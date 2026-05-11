## Why your upload disappeared

The document was actually saved — to storage and to `client_documents`. The problem is *who it got attached to*.

When a client is created from the admin, we generate a temporary `user_id` for the profile (a placeholder) until the invite is accepted. As soon as the client follows the portal invite, `provision-client-portal` swaps that placeholder for the real auth user ID. Your upload happened in the small window between those two states — the file row was tagged with the **old placeholder ID**, but the Documents tab now queries with the **new** user ID, so it doesn't show.

`client_documents`, `client_messages`, `client_agreements`, and `client_intakes` are all linked to clients by indirect keys (auth user ID, or email). That's brittle. The real anchor should be the **client profile itself** (`client_profiles.id`) — that ID never changes.

Stripe customer IDs are great for invoices/payments (and we already use them there), but they aren't created for documents, agreements, intakes, or messages, so they can't be the universal join key. The profile ID can.

## What this plan does

1. **Make `client_profile_id` the universal link** on every client-scoped table.
2. **Backfill** existing rows so nothing gets orphaned (including the doc you just uploaded).
3. **Read/write** through `client_profile_id` everywhere so future sync gaps can't happen.
4. Keep `stripe_customer_id` / `stripe_customer_ids` as a secondary identifier, used to auto-attach Stripe-originated invoices (already working) and to surface duplicate-suspect profiles.

---

## Database changes

Add a nullable `client_profile_id uuid` column to:
- `client_documents`
- `client_messages`
- `client_agreements`
- `client_intakes`

Backfill rules:
- `client_documents` / `client_messages`: copy `client_profiles.id` where `client_profiles.user_id = row.user_id`. Also catch the orphaned doc by matching against `client_profiles` whose stored placeholder is still the old user_id. As a last resort, leave unmatched rows `NULL` for manual review.
- `client_agreements`: match on `lower(client_email) = lower(client_profiles.email)`.
- `client_intakes`: match on `lower(email) = lower(client_profiles.email)` (also use `linked_user_id` if set).

Add an index on each new `client_profile_id` column.

RLS:
- Keep the existing admin-manage-all policies.
- Add "users can view their own" policies based on `client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())` so the portal pages keep working.

No schema-breaking changes — `user_id` and `client_email` columns stay so existing portal queries continue to function during transition.

## Code changes

`src/pages/admin/ClientDetail.tsx`
- Reads: query documents/messages/agreements/intakes by `client_profile_id = profile.id` first; fall back to email/user_id only when `client_profile_id` is null (handles legacy rows).
- Document upload: insert with `client_profile_id: profile.id` AND `user_id: profile.user_id` so both keys are present.
- Storage path: switch from `${profile.user_id}/...` to `${profile.id}/...` so files stay under a stable folder even if the auth user changes.

`supabase/functions/create-client/index.ts`
- When creating the temporary profile, store the placeholder `user_id` exactly as today, but also set `client_profile_id` on any seeded rows (none today, but documented for future inserts).

`supabase/functions/provision-client-portal/index.ts`
- After linking the real auth user, also update `client_documents.user_id` and `client_messages.user_id` for any rows whose `client_profile_id` matches — keeps the portal queries working transparently.

`supabase/functions/stripe-webhook/index.ts` and `sync-stripe-customer/index.ts`
- Already attach invoices via `client_profile_id`; no change needed besides verifying.

Portal pages (`PortalDocuments`, `PortalMessages`, `PortalAgreements`)
- Switch their fetches to use `client_profile_id` (resolved from the user's profile) as the primary filter, with a fallback to the legacy keys.

## What you'll see after this ships

- The Scotty's Adventures PDF will appear under that client's Documents tab automatically (backfill handles it).
- Any future document, message, agreement, or intake stays attached to the right client even if the auth user changes, the email is updated, or the portal invite is accepted later.
- The Clients list keeps using exact-email matching for auto-merge (your existing rule), and Stripe customer IDs continue to flag mismatches on invoices.

## Out of scope (call out if you want it)

- A "merge two profiles" admin UI (the `merge-client-profiles` function exists; we could expose a button on the duplicate badge).
- Surfacing a "Needs profile link" queue for any backfill rows that couldn't be matched automatically.
