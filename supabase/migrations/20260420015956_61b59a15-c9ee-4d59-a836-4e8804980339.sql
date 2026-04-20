ALTER TABLE public.financial_records
ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS financial_records_stripe_payment_id_unique
ON public.financial_records (stripe_payment_id)
WHERE stripe_payment_id IS NOT NULL;