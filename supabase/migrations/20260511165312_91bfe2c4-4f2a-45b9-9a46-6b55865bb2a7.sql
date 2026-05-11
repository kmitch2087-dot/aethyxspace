
ALTER TABLE public.client_projects
  ADD COLUMN IF NOT EXISTS repo_url text,
  ADD COLUMN IF NOT EXISTS dns_provider text,
  ADD COLUMN IF NOT EXISTS hosting_provider text,
  ADD COLUMN IF NOT EXISTS live_url text,
  ADD COLUMN IF NOT EXISTS staging_url text,
  ADD COLUMN IF NOT EXISTS current_phase text,
  ADD COLUMN IF NOT EXISTS progress_pct integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.project_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_profile_id uuid,
  title text NOT NULL,
  description text,
  assignee text NOT NULL DEFAULT 'admin',
  status text NOT NULL DEFAULT 'todo',
  priority text NOT NULL DEFAULT 'med',
  due_date timestamptz,
  completed_at timestamptz,
  created_by text NOT NULL DEFAULT 'admin',
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_tasks_project ON public.project_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_client ON public.project_tasks(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_project_tasks_status ON public.project_tasks(status);

CREATE TABLE IF NOT EXISTS public.project_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.client_projects(id) ON DELETE CASCADE,
  client_profile_id uuid,
  kind text NOT NULL DEFAULT 'note',
  summary text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_updates_project ON public.project_updates(project_id);
CREATE INDEX IF NOT EXISTS idx_project_updates_created_at ON public.project_updates(created_at DESC);

ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;

-- Admin full access
CREATE POLICY "Admins manage project_tasks" ON public.project_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage project_updates" ON public.project_updates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Clients view own
CREATE POLICY "Clients view own tasks" ON public.project_tasks
  FOR SELECT TO authenticated
  USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Clients update own assigned tasks" ON public.project_tasks
  FOR UPDATE TO authenticated
  USING (
    assignee = 'client'
    AND client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
  )
  WITH CHECK (
    assignee = 'client'
    AND client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Clients view own project updates" ON public.project_updates
  FOR SELECT TO authenticated
  USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_project_tasks_updated_at
  BEFORE UPDATE ON public.project_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_updates;
