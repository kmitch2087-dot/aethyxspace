-- cpt_client_update's WITH CHECK is unconditionally true — once a client owns a task
-- (assigned_to='client'), RLS lets them update ANY column, not just status, even though
-- the app itself (PortalTasks.tsx) only ever sends {status: 'complete'}. Not currently
-- exploitable via the app's own UI, but a crafted direct API call could rewrite
-- title/priority/assigned_to/due_date on a task the client already owns. Same pattern
-- already used to protect client_agreement_records — a BEFORE UPDATE trigger that lets
-- admins/service_role through unrestricted, and otherwise only allows status/updated_at
-- to change.
CREATE OR REPLACE FUNCTION protect_client_project_task_fields()
RETURNS trigger AS $$
BEGIN
  IF auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_id IS DISTINCT FROM OLD.plan_id
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.description IS DISTINCT FROM OLD.description
     OR NEW.assigned_to IS DISTINCT FROM OLD.assigned_to
     OR NEW.due_date IS DISTINCT FROM OLD.due_date
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.sort_order IS DISTINCT FROM OLD.sort_order
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
  THEN
    RAISE EXCEPTION 'Clients may only update the status field on their own tasks';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_client_project_task_fields ON client_project_tasks;
CREATE TRIGGER trg_protect_client_project_task_fields
  BEFORE UPDATE ON client_project_tasks
  FOR EACH ROW EXECUTE FUNCTION protect_client_project_task_fields();
