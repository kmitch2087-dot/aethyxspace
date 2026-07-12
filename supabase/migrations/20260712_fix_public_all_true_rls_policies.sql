-- Security fast-follow: 7 policies across the schema were written as blanket
-- "USING (true) WITH CHECK (true)" for role {public} (anon + authenticated + everyone),
-- intended to be service-role-only bypass policies but never actually restricted to
-- service_role. Since service_role already bypasses RLS entirely, these policies' only
-- real effect was granting unrestricted read/write access to anyone holding just the
-- public anon key. Confirmed via code search that the admin app performs direct writes
-- to all 7 tables as an authenticated admin (not via edge functions/service_role), so the
-- fix replaces the blanket policy with the same has_role(auth.uid(), 'admin'::app_role)
-- pattern already correctly used by this app's other admin policies (cds_admin, cpp_admin,
-- cpt_admin) — closing the anon/non-admin hole while preserving legitimate admin access.

DROP POLICY IF EXISTS "aoc_service_role" ON add_on_catalog;
CREATE POLICY "aoc_admin" ON add_on_catalog FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cao_service_role" ON client_add_ons;
CREATE POLICY "cao_admin" ON client_add_ons FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cpph_admin" ON client_project_phases;
CREATE POLICY "cpph_admin" ON client_project_phases FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cpu_admin" ON client_project_updates;
CREATE POLICY "cpu_admin" ON client_project_updates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "rl_service_role" ON referral_links;
CREATE POLICY "rl_admin" ON referral_links FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "rps_service_role" ON referral_program_settings;
CREATE POLICY "rps_admin" ON referral_program_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ref_service_role" ON referrals;
CREATE POLICY "ref_admin" ON referrals FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Two real-usage gaps discovered while verifying the above didn't break legitimate
-- client-facing flows (confirmed via direct code search of src/pages/portal/*):

-- PortalReferrals.tsx inserts a client's own referral_links row directly (client-side,
-- authenticated non-admin) to generate their referral code on first visit. This
-- previously worked only via the removed public "true" policy.
CREATE POLICY "rl_client_insert" ON referral_links FOR INSERT TO authenticated
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

-- PortalReferrals.tsx reads referral_program_settings (reward amounts, commission rate,
-- eligibility notes) directly as an authenticated non-admin client to display the
-- program's terms. This table has no client_profile_id (a singleton settings row), so
-- there's no ownership predicate to scope to — every authenticated client legitimately
-- needs read access. Writes remain admin-only via rps_admin.
CREATE POLICY "rps_authenticated_read" ON referral_program_settings FOR SELECT TO authenticated
  USING (true);
