
-- Extend client_profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS first_name TEXT,
  ADD COLUMN IF NOT EXISTS last_name TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

CREATE INDEX IF NOT EXISTS idx_client_profiles_email ON public.client_profiles(lower(email));
CREATE INDEX IF NOT EXISTS idx_client_profiles_stripe ON public.client_profiles(stripe_customer_id);

-- client_invoices table
CREATE TABLE IF NOT EXISTS public.client_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  invoice_number TEXT,
  amount_due NUMERIC NOT NULL DEFAULT 0,
  amount_paid NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'draft',
  description TEXT,
  hosted_invoice_url TEXT,
  invoice_pdf TEXT,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_invoices_user ON public.client_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_stripe_customer ON public.client_invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_client_invoices_email ON public.client_invoices(lower(email));

ALTER TABLE public.client_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage client_invoices"
  ON public.client_invoices FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users view own invoices"
  ON public.client_invoices FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Deny public reads on client_invoices"
  ON public.client_invoices FOR SELECT
  TO public
  USING (false);

CREATE TRIGGER update_client_invoices_updated_at
  BEFORE UPDATE ON public.client_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
