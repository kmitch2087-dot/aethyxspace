-- 1. Lock down client_agreement_records admin policy to real admins (was public/true = anyone)
DROP POLICY IF EXISTS car_admin ON client_agreement_records;
CREATE POLICY car_admin ON client_agreement_records
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Lock down client_document_slots admin policy the same way, and add real client self-service policies
DROP POLICY IF EXISTS cds_admin ON client_document_slots;
CREATE POLICY cds_admin ON client_document_slots
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS cds_client_insert ON client_document_slots;
CREATE POLICY cds_client_insert ON client_document_slots
  FOR INSERT
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS cds_client_update ON client_document_slots;
CREATE POLICY cds_client_update ON client_document_slots
  FOR UPDATE
  USING (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()))
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));

-- 3. Storage policies for client-slot-docs bucket (previously had none at all -> uploads were impossible)
DROP POLICY IF EXISTS "Admins can manage client-slot-docs" ON storage.objects;
CREATE POLICY "Admins can manage client-slot-docs"
  ON storage.objects FOR ALL
  USING (bucket_id = 'client-slot-docs' AND has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'client-slot-docs' AND has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can upload own files in client-slot-docs" ON storage.objects;
CREATE POLICY "Users can upload own files in client-slot-docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'client-slot-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own files in client-slot-docs" ON storage.objects;
CREATE POLICY "Users can view own files in client-slot-docs"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'client-slot-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own files in client-slot-docs" ON storage.objects;
CREATE POLICY "Users can update own files in client-slot-docs"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'client-slot-docs' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- 4. Prevent a client from rewriting financial/scope/control fields on their own agreement record
--    while still allowing them to sign it (signature, ID path, submitted_at, is_locked true).
--    Service role (edge functions) and admins bypass this check entirely.
CREATE OR REPLACE FUNCTION protect_agreement_financial_fields()
RETURNS trigger AS $$
BEGIN
  IF auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.project_scope IS DISTINCT FROM OLD.project_scope
     OR NEW.services_included IS DISTINCT FROM OLD.services_included
     OR NEW.total_investment IS DISTINCT FROM OLD.total_investment
     OR NEW.down_payment_amount IS DISTINCT FROM OLD.down_payment_amount
     OR NEW.payment_schedule IS DISTINCT FROM OLD.payment_schedule
     OR NEW.timeline_start IS DISTINCT FROM OLD.timeline_start
     OR NEW.timeline_end IS DISTINCT FROM OLD.timeline_end
     OR NEW.down_payment_status IS DISTINCT FROM OLD.down_payment_status
     OR NEW.stripe_checkout_session_id IS DISTINCT FROM OLD.stripe_checkout_session_id
     OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     OR NEW.client_profile_id IS DISTINCT FROM OLD.client_profile_id
  THEN
    RAISE EXCEPTION 'Clients may only update signature, ID document, and submission fields on an agreement record';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_protect_agreement_financial_fields ON client_agreement_records;
CREATE TRIGGER trg_protect_agreement_financial_fields
  BEFORE UPDATE ON client_agreement_records
  FOR EACH ROW EXECUTE FUNCTION protect_agreement_financial_fields();
