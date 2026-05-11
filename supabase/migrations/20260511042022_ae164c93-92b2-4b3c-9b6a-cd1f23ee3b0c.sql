
-- 1. client_profiles additions
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

-- Backfill stripe_customer_ids from the singular column
UPDATE public.client_profiles
SET stripe_customer_ids = ARRAY[stripe_customer_id]
WHERE stripe_customer_id IS NOT NULL
  AND NOT (stripe_customer_id = ANY(stripe_customer_ids));

CREATE INDEX IF NOT EXISTS idx_client_profiles_stripe_customer_ids
  ON public.client_profiles USING GIN (stripe_customer_ids);

CREATE INDEX IF NOT EXISTS idx_client_profiles_email_lower
  ON public.client_profiles (lower(email));

-- 2. client_invoices additions
ALTER TABLE public.client_invoices
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_reason text;

CREATE INDEX IF NOT EXISTS idx_client_invoices_needs_review
  ON public.client_invoices (needs_review) WHERE needs_review = true;

-- 3. client_projects table
CREATE TABLE IF NOT EXISTS public.client_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES public.client_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  lovable_url text,
  status text NOT NULL DEFAULT 'in_progress',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_projects"
  ON public.client_projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Clients view own projects"
  ON public.client_projects FOR SELECT
  TO authenticated
  USING (
    client_profile_id IN (
      SELECT id FROM public.client_profiles WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_client_projects_updated_at
  BEFORE UPDATE ON public.client_projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. One-time merge: Aaron Gallucci duplicates
-- Primary: 36dec941-f148-43cb-b205-f4ff22e9d5ec (ahearnmanagement@icloud.com)
-- Duplicate: 79b0d092-c102-4452-9edc-e17173fa34fe (ahearnrecovery@icloud.com)
DO $$
DECLARE
  primary_id uuid := '36dec941-f148-43cb-b205-f4ff22e9d5ec';
  dup_id uuid := '79b0d092-c102-4452-9edc-e17173fa34fe';
  dup_cust text;
BEGIN
  -- Pull the dup's stripe_customer_id and merge into the primary's array
  SELECT stripe_customer_id INTO dup_cust
  FROM public.client_profiles WHERE id = dup_id;

  IF dup_cust IS NOT NULL THEN
    UPDATE public.client_profiles
    SET stripe_customer_ids = (
      SELECT ARRAY(SELECT DISTINCT unnest(stripe_customer_ids || ARRAY[dup_cust]))
    )
    WHERE id = primary_id;
  END IF;

  -- Move invoices
  UPDATE public.client_invoices
  SET client_profile_id = primary_id
  WHERE client_profile_id = dup_id;

  -- Delete duplicate profile
  DELETE FROM public.client_profiles WHERE id = dup_id;
END $$;
