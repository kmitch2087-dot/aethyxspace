CREATE TABLE client_document_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  slot_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  storage_path text,
  file_name text,
  file_size integer,
  uploaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id, slot_type)
);

CREATE TABLE client_agreement_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  project_scope text NOT NULL DEFAULT '',
  services_included text NOT NULL DEFAULT '',
  total_investment numeric(10,2),
  down_payment_amount numeric(10,2),
  payment_schedule text NOT NULL DEFAULT '',
  timeline_start date,
  timeline_end date,
  revision_rounds integer NOT NULL DEFAULT 2,
  hosting_notes text NOT NULL DEFAULT '',
  additional_terms text NOT NULL DEFAULT '',
  client_legal_name text NOT NULL DEFAULT '',
  client_company text NOT NULL DEFAULT '',
  client_address text NOT NULL DEFAULT '',
  client_signature_data text,
  client_signed_at timestamptz,
  id_document_path text,
  is_locked boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  down_payment_status text NOT NULL DEFAULT 'pending',
  stripe_checkout_session_id text,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id)
);

ALTER TABLE client_document_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_agreement_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cds_admin" ON client_document_slots USING (true) WITH CHECK (true);
CREATE POLICY "car_admin" ON client_agreement_records USING (true) WITH CHECK (true);

CREATE POLICY "cds_client_own" ON client_document_slots FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "car_client_own" ON client_agreement_records FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "car_client_update" ON client_agreement_records FOR UPDATE USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  AND is_locked = false
) WITH CHECK (true);

INSERT INTO storage.buckets (id, name, public) VALUES ('client-slot-docs', 'client-slot-docs', false)
ON CONFLICT (id) DO NOTHING;
