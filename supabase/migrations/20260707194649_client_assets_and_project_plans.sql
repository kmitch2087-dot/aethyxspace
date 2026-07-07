CREATE TABLE client_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'text',
  category text NOT NULL DEFAULT 'other',
  label text NOT NULL,
  content text,
  file_url text,
  file_name text,
  file_size integer,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_project_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  project_name text NOT NULL DEFAULT 'Website Project',
  overview text,
  completion_percent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  start_date date,
  target_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_project_phases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES client_project_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  completion_percent integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE client_project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES client_project_plans(id) ON DELETE CASCADE,
  content text NOT NULL,
  author text NOT NULL DEFAULT 'Kristin',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_project_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_project_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ca_admin" ON client_assets USING (true) WITH CHECK (true);
CREATE POLICY "cpp_admin" ON client_project_plans USING (true) WITH CHECK (true);
CREATE POLICY "cpph_admin" ON client_project_phases USING (true) WITH CHECK (true);
CREATE POLICY "cpu_admin" ON client_project_updates USING (true) WITH CHECK (true);

CREATE POLICY "ca_client_own" ON client_assets FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "cpp_client_own" ON client_project_plans FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "cpph_client_own" ON client_project_phases FOR SELECT USING (
  plan_id IN (SELECT id FROM client_project_plans WHERE client_profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ))
);
CREATE POLICY "cpu_client_own" ON client_project_updates FOR SELECT USING (
  plan_id IN (SELECT id FROM client_project_plans WHERE client_profile_id IN (
    SELECT id FROM client_profiles WHERE user_id = auth.uid()
  ))
);

INSERT INTO storage.buckets (id, name, public) VALUES ('client-assets', 'client-assets', false)
ON CONFLICT (id) DO NOTHING;
