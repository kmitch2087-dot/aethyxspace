-- Scheduled invoices: drafts with a future auto-send date are client-visible and
-- payable early; manual drafts (scheduled_send_at IS NULL) stay private as before.
ALTER TABLE client_invoices ADD COLUMN scheduled_send_at timestamptz NULL;

-- Early/partial settlement ledger: one row per (payment, invoice) allocation,
-- oldest-invoice-first. Unique pair makes allocation idempotent per PaymentIntent.
CREATE TABLE client_invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES client_invoices(id) ON DELETE CASCADE,
  payment_intent_id text NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  source text NOT NULL DEFAULT 'settle',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (payment_intent_id, invoice_id)
);

ALTER TABLE client_invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY cip_admin ON client_invoice_payments
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY cip_client_own ON client_invoice_payments
  FOR SELECT
  USING (client_profile_id IN (
    SELECT client_profiles.id FROM client_profiles
    WHERE client_profiles.user_id = auth.uid()
  ));
