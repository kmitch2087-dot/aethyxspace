-- Regression fix: client_project_tasks has never had a client-scoped UPDATE
-- policy. Client task completion (PortalTasks.tsx markTaskComplete) previously
-- "worked" only because cpt_admin was USING(true) with no role check, so any
-- authenticated user's update silently matched that policy. Task 3 correctly
-- scoped cpt_admin to has_role(auth.uid(), 'admin'::app_role) (see
-- 20260711_view_as_client_rls_fix.sql), which means clients can no longer
-- update their own task rows at all -- the update becomes a silent no-op.
--
-- This mirrors the existing car_client_update policy on client_agreement_records
-- (see 20260707204418_document_slots_and_agreement_records.sql), matching its
-- live shape exactly: no explicit role clause (applies to {public}, same as
-- cpt_client_own and car_client_update both already do), USING scoped to the
-- client's own rows, WITH CHECK (true).
--
-- The additional `assigned_to = 'client'` condition mirrors the same filter
-- PortalTasks.tsx already applies when loading tasks for display (.eq
-- ("assigned_to", "client")), as defense-in-depth so a client can never mark
-- an admin-assigned task complete via a crafted request.
CREATE POLICY "cpt_client_update" ON client_project_tasks FOR UPDATE USING (
  plan_id IN (
    SELECT id FROM client_project_plans WHERE client_profile_id IN (
      SELECT id FROM client_profiles WHERE user_id = auth.uid()
    )
  )
  AND assigned_to = 'client'
) WITH CHECK (true);
