-- Draft gate: client cannot see the agreement until admin sends it.
ALTER TABLE client_agreement_records ADD COLUMN sent_at timestamptz;

-- DB-enforced one-time-only post-signing correction. The check constraint holds even
-- against a direct SQL edit or a future UI bug, not just the admin button in AgreementDocument.tsx.
ALTER TABLE client_agreement_records ADD COLUMN unlock_count integer NOT NULL DEFAULT 0
  CHECK (unlock_count <= 1);

-- Client can only read their own agreement once it's been sent.
DROP POLICY IF EXISTS "car_client_own" ON client_agreement_records;
CREATE POLICY "car_client_own" ON client_agreement_records FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
  AND sent_at IS NOT NULL
);
