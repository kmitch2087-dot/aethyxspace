
-- ============================================
-- Table: intake_form_fields
-- ============================================
CREATE TABLE public.intake_form_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  help_text text,
  field_type text NOT NULL CHECK (field_type IN ('text','textarea','email','tel','url','select','multiselect')),
  options jsonb DEFAULT '[]'::jsonb,
  required boolean NOT NULL DEFAULT false,
  section text NOT NULL CHECK (section IN ('about','project','market','extra')),
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  field_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.intake_form_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active intake fields"
  ON public.intake_form_fields FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage intake fields"
  ON public.intake_form_fields FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_intake_form_fields_updated_at
  BEFORE UPDATE ON public.intake_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Table: client_intakes
-- ============================================
CREATE TABLE public.client_intakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_name text,
  responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','invoice_sent','paid','archived')),
  linked_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_intakes_email ON public.client_intakes (lower(email));
CREATE INDEX idx_client_intakes_status ON public.client_intakes (status);

ALTER TABLE public.client_intakes ENABLE ROW LEVEL SECURITY;

-- Public can submit (with strict caps, forced status='new')
CREATE POLICY "Anyone can submit intake"
  ON public.client_intakes FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL
    AND email IS NOT NULL
    AND length(full_name) <= 200
    AND length(email) <= 320
    AND (phone IS NULL OR length(phone) <= 50)
    AND (business_name IS NULL OR length(business_name) <= 200)
    AND status = 'new'
    AND linked_user_id IS NULL
    AND notes IS NULL
  );

-- Block public reads
CREATE POLICY "Deny public reads on client_intakes"
  ON public.client_intakes FOR SELECT
  TO public
  USING (false);

-- Admins manage
CREATE POLICY "Admins can read intakes"
  ON public.client_intakes FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update intakes"
  ON public.client_intakes FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete intakes"
  ON public.client_intakes FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_client_intakes_updated_at
  BEFORE UPDATE ON public.client_intakes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Update handle_new_user trigger to link intakes & prefill client_profiles
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_intake public.client_intakes%ROWTYPE;
BEGIN
  -- Existing: profile + admin grant
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  IF NEW.email = 'aethyxspace@protonmail.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
  END IF;

  -- Find most-recent intake matching this email (case-insensitive)
  SELECT * INTO matched_intake
  FROM public.client_intakes
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_intake.id IS NOT NULL THEN
    -- Link intake to new user
    UPDATE public.client_intakes
    SET linked_user_id = NEW.id, updated_at = now()
    WHERE id = matched_intake.id;

    -- Prefill client_profile from intake
    INSERT INTO public.client_profiles (user_id, full_name, business_name, phone)
    VALUES (
      NEW.id,
      matched_intake.full_name,
      matched_intake.business_name,
      matched_intake.phone
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

-- Make sure the trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- Seed the 18 default intake questions
-- ============================================
INSERT INTO public.intake_form_fields (field_key, label, help_text, field_type, options, required, section, display_order) VALUES
-- About you
('full_name', 'Full name', NULL, 'text', '[]', true, 'about', 10),
('email', 'Email', NULL, 'email', '[]', true, 'about', 20),
('phone', 'Phone', 'Optional', 'tel', '[]', false, 'about', 30),
('business_name', 'Business name', NULL, 'text', '[]', true, 'about', 40),
('website', 'Current website', 'If you have one', 'url', '[]', false, 'about', 50),
('industry', 'Industry', NULL, 'text', '[]', true, 'about', 60),

-- The project
('project_type', 'Project type', NULL, 'select',
  '["Rebrand","New build","Redesign","Scale existing","Not sure yet"]', true, 'project', 10),
('biggest_challenge', 'Biggest challenge right now', 'What''s the single thing slowing you down?', 'textarea', '[]', true, 'project', 20),
('top_goals', 'Top 3 goals for this project', 'One per line is fine', 'textarea', '[]', true, 'project', 30),
('timeline', 'Timeline', 'When do you want to launch?', 'select',
  '["ASAP","1–3 months","3–6 months","6+ months","Just exploring"]', true, 'project', 40),
('budget_range', 'Budget range', NULL, 'select',
  '["Under $5k","$5k–$15k","$15k–$30k","$30k–$60k","$60k+"]', true, 'project', 50),
('brand_assets', 'Brand assets status', NULL, 'select',
  '["None yet","Partial (logo or basics)","Complete (full brand system)"]', false, 'project', 60),
('content_readiness', 'Content readiness', NULL, 'select',
  '["Need help writing it","Drafted, needs polish","Finalized and ready"]', false, 'project', 70),

-- The market
('target_audience', 'Target audience', 'Who exactly are you trying to reach?', 'textarea', '[]', true, 'market', 10),
('competitors', '2–3 competitors', 'URLs or names', 'textarea', '[]', false, 'market', 20),
('marketing_channels', 'Current marketing channels', 'Where are you showing up today?', 'textarea', '[]', false, 'market', 30),
('success_metrics', 'How will you measure success', 'What does winning look like in 6 months?', 'textarea', '[]', true, 'market', 40),

-- Extra
('inspiration', 'Inspiration links / references', 'Sites, brands, anything you love', 'textarea', '[]', false, 'extra', 10),
('anything_else', 'Anything else I should know', NULL, 'textarea', '[]', false, 'extra', 20);
