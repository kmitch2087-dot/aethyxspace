-- Client-facing Assets tab: a per-asset "in use" signal for Kristin, and a per-project
-- Google Drive folder link a client can share back. Both are client-editable, so each
-- table needs a new ownership-scoped UPDATE policy (clients currently only have SELECT).
ALTER TABLE client_assets ADD COLUMN in_use boolean NOT NULL DEFAULT true;
ALTER TABLE client_project_plans ADD COLUMN drive_folder_url text;

CREATE POLICY "ca_client_update" ON client_assets FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "cpp_client_update" ON client_project_plans FOR UPDATE
  TO authenticated
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));
