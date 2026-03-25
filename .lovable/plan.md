

## Fix: RLS Policy Always True

The warning flags two INSERT policies using `WITH CHECK (true)` on:
- **waiting_list** — anonymous inserts from the waiting list form
- **review_submissions** — anonymous inserts from the review form

Both are public-facing forms that don't require authentication, so we can't restrict by `auth.uid()`. Instead, we'll replace the blanket `true` with column-level validation constraints that ensure only well-formed rows can be inserted.

### Changes (single database migration)

**1. Replace `waiting_list` INSERT policy:**
- Drop current policy
- Create new policy requiring: `name IS NOT NULL AND email IS NOT NULL AND update_frequency IS NOT NULL AND length(email) <= 320 AND length(name) <= 200`

**2. Replace `review_submissions` INSERT policy:**
- Drop current policy  
- Create new policy requiring: `name IS NOT NULL AND city IS NOT NULL AND state IS NOT NULL AND review_text IS NOT NULL AND length(review_text) <= 2000 AND length(name) <= 200 AND status = 'pending'`

This satisfies the linter by replacing `true` with meaningful validation while still allowing anonymous submissions.

