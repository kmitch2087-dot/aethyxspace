ALTER TABLE client_project_updates ADD COLUMN IF NOT EXISTS is_client_visible boolean NOT NULL DEFAULT false;

CREATE TABLE client_project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES client_project_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  assigned_to text NOT NULL DEFAULT 'client',
  status text NOT NULL DEFAULT 'pending',
  due_date date,
  priority text NOT NULL DEFAULT 'normal',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_project_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cpt_admin" ON client_project_tasks USING (true) WITH CHECK (true);

CREATE POLICY "cpt_client_own" ON client_project_tasks FOR SELECT USING (
  plan_id IN (
    SELECT id FROM client_project_plans WHERE client_profile_id IN (
      SELECT id FROM client_profiles WHERE user_id = auth.uid()
    )
  )
);
