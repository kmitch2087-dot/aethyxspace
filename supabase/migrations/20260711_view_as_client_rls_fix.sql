-- View-as-Client (admin read-only impersonation) requires these admin policies to
-- actually be admin-scoped — they were previously USING(true) with no role check,
-- meaning any authenticated user (not just admins) could read/write any client's
-- rows here. Scoped tightly to the 5 tables this feature depends on; the broader
-- referral/add-on RLS gap is tracked separately.
--
-- Note: car_admin (client_agreement_records) and cds_admin (client_document_slots)
-- were already corrected directly against the live database with a has_role() check
-- at some point without a corresponding tracked migration, so the two DROP+CREATE
-- statements below are a no-op there — but they bring this migration file back in
-- sync with live reality for those two tables.
DROP POLICY IF EXISTS "cpp_admin" ON client_project_plans;
CREATE POLICY "cpp_admin" ON client_project_plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cpt_admin" ON client_project_tasks;
CREATE POLICY "cpt_admin" ON client_project_tasks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "car_admin" ON client_agreement_records;
CREATE POLICY "car_admin" ON client_agreement_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "cds_admin" ON client_document_slots;
CREATE POLICY "cds_admin" ON client_document_slots FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "ca_admin" ON client_assets;
CREATE POLICY "ca_admin" ON client_assets FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
