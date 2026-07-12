-- The public application form requires the tax-acknowledgment checkbox before
-- submitting and never sends w9_uploaded_at/a custom applied_at, but none of that was
-- enforced at the RLS layer — a direct API call bypassing the form could submit
-- tax_ack=false, a pre-set w9_uploaded_at, or a backdated/future applied_at to
-- manipulate the admin's pending-applicant sort order. Admin review is manual either
-- way (low severity), but tightening this is cheap and closes the gap properly.
DROP POLICY IF EXISTS "Anyone can apply to bounty program" ON bounty_applicants;
CREATE POLICY "Anyone can apply to bounty program" ON bounty_applicants FOR INSERT
TO anon, authenticated
WITH CHECK (
  full_name IS NOT NULL AND email IS NOT NULL
  AND length(full_name) <= 200 AND length(email) <= 320
  AND (phone IS NULL OR length(phone) <= 50)
  AND (relationship_note IS NULL OR length(relationship_note) <= 2000)
  AND status = 'pending'
  AND w9_file_path IS NULL
  AND code IS NULL
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
  AND tax_ack = true
  AND w9_uploaded_at IS NULL
  AND applied_at >= now() - interval '5 minutes'
  AND applied_at <= now() + interval '5 minutes'
);
