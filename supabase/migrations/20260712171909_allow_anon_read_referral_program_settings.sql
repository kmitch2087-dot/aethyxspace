-- The public /bounty page displays program terms (reward amounts, eligibility notes)
-- to logged-out visitors, but the 2026-07-12 RLS cleanup left the read policy
-- authenticated-only, so anon visitors saw no reward numbers at all. These values are
-- public by design on that page.
DROP POLICY IF EXISTS "rps_authenticated_read" ON public.referral_program_settings;
CREATE POLICY "rps_public_read" ON public.referral_program_settings FOR SELECT
TO anon, authenticated
USING (true);
