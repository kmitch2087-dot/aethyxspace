
-- 1. Track intake completion on client profile
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS intake_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS intake_required boolean NOT NULL DEFAULT false;

-- Backfill: any profile with an existing intake counts as completed
UPDATE public.client_profiles cp
SET intake_completed_at = sub.completed_at
FROM (
  SELECT client_profile_id, MIN(created_at) AS completed_at
  FROM public.client_intakes
  WHERE client_profile_id IS NOT NULL
  GROUP BY client_profile_id
) sub
WHERE cp.id = sub.client_profile_id AND cp.intake_completed_at IS NULL;

-- 2. Link client_documents back to source admin doc + allow message threads on docs
ALTER TABLE public.client_documents
  ADD COLUMN IF NOT EXISTS parent_admin_doc_id uuid,
  ADD COLUMN IF NOT EXISTS note text;

ALTER TABLE public.client_messages
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS sender text NOT NULL DEFAULT 'client';

-- 3. Document scheduling table
CREATE TABLE IF NOT EXISTS public.document_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_document_id uuid NOT NULL,
  trigger_type text NOT NULL CHECK (trigger_type IN ('once','recurring','event')),
  run_at timestamptz,
  cron_expr text,
  recurrence text CHECK (recurrence IN ('daily','weekly','monthly')),
  event_name text CHECK (event_name IN ('client_added','portal_activated','invoice_paid','project_status_changed','agreement_signed','intake_completed')),
  target_type text NOT NULL DEFAULT 'specific' CHECK (target_type IN ('specific','all','event_subject')),
  target_client_ids uuid[] NOT NULL DEFAULT '{}',
  subject text,
  message text,
  delivery text NOT NULL DEFAULT 'email_and_share' CHECK (delivery IN ('email','share','email_and_share')),
  active boolean NOT NULL DEFAULT true,
  next_run_at timestamptz,
  last_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage document_schedules"
ON public.document_schedules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_document_schedules_updated
  BEFORE UPDATE ON public.document_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_document_schedules_active_next ON public.document_schedules (active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_document_schedules_event ON public.document_schedules (event_name) WHERE trigger_type = 'event';

-- 4. Document categories (admin-managed list)
CREATE TABLE IF NOT EXISTS public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage document_categories"
ON public.document_categories FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.document_categories (name, display_order) VALUES
  ('General', 10), ('Contracts', 20), ('Templates', 30),
  ('Tax', 40), ('Legal', 50), ('Branding', 60), ('Internal', 70)
ON CONFLICT (name) DO NOTHING;

-- 5. Allow clients to update their own messages/docs metadata if needed - none required
-- 6. Update handle_new_user to set intake_completed_at when intake exists
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  matched_intake public.client_intakes%ROWTYPE;
  new_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  SELECT * INTO matched_intake
  FROM public.client_intakes
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_intake.id IS NOT NULL THEN
    INSERT INTO public.client_profiles (user_id, full_name, business_name, phone, email, intake_completed_at)
    VALUES (NEW.id, matched_intake.full_name, matched_intake.business_name, matched_intake.phone, NEW.email, matched_intake.created_at)
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_profile_id;

    IF new_profile_id IS NULL THEN
      SELECT id INTO new_profile_id FROM public.client_profiles WHERE user_id = NEW.id LIMIT 1;
    END IF;

    UPDATE public.client_intakes
    SET linked_user_id = NEW.id,
        client_profile_id = COALESCE(client_profile_id, new_profile_id),
        updated_at = now()
    WHERE id = matched_intake.id;
  END IF;

  RETURN NEW;
END;
$function$;
