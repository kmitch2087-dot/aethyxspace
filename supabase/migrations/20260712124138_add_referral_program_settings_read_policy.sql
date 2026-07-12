-- PortalReferrals.tsx reads referral_program_settings (reward amounts, commission rate,
-- eligibility notes) directly as an authenticated non-admin client to display the
-- program's terms on their own referral page. This table has no client_profile_id (it's
-- a singleton settings row, not per-client), so there's no ownership predicate to scope
-- to — every authenticated client legitimately needs read access to see the program terms.
-- Previously worked only via the just-removed public "true" policy; writes remain
-- admin-only via rps_admin.
CREATE POLICY "rps_authenticated_read" ON referral_program_settings FOR SELECT TO authenticated
  USING (true);
