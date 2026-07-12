-- Bounty applicants: public, non-client applicants for the bounty/referral program.
-- Deliberately separate from client_profiles (whose user_id is NOT NULL with no
-- existing "profile without a login" pattern anywhere in this codebase).
CREATE TABLE bounty_applicants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  relationship_note text,
  tax_ack boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  w9_file_path text,
  w9_uploaded_at timestamptz,
  code text UNIQUE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE bounty_applicants ENABLE ROW LEVEL SECURITY;

-- Public can apply (strict caps, forced status='pending', mirrors client_intakes' pattern)
CREATE POLICY "Anyone can apply to bounty program"
  ON bounty_applicants FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    full_name IS NOT NULL
    AND email IS NOT NULL
    AND length(full_name) <= 200
    AND length(email) <= 320
    AND (phone IS NULL OR length(phone) <= 50)
    AND (relationship_note IS NULL OR length(relationship_note) <= 2000)
    AND status = 'pending'
    AND w9_file_path IS NULL
    AND code IS NULL
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );

CREATE POLICY "Deny public reads on bounty_applicants"
  ON bounty_applicants FOR SELECT
  TO public
  USING (false);

CREATE POLICY "Admins can manage bounty_applicants"
  ON bounty_applicants FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_bounty_applicants_updated_at
  BEFORE UPDATE ON bounty_applicants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- referrals: referrer is either an existing client OR an approved bounty applicant, never both/neither
ALTER TABLE referrals ALTER COLUMN referrer_profile_id DROP NOT NULL;
ALTER TABLE referrals ADD COLUMN referrer_bounty_applicant_id uuid REFERENCES bounty_applicants(id);
ALTER TABLE referrals ADD CONSTRAINT referrals_referrer_xor CHECK (
  (referrer_profile_id IS NOT NULL AND referrer_bounty_applicant_id IS NULL)
  OR
  (referrer_profile_id IS NULL AND referrer_bounty_applicant_id IS NOT NULL)
);

-- Fix pre-existing bug: Intakes.tsx's waiveFee() already writes status='waived',
-- but the live CHECK constraint never allowed it. This plan's auto-apply fee waiver
-- writes the same status, so this must be fixed for either path to work.
ALTER TABLE client_intakes DROP CONSTRAINT client_intakes_status_check;
ALTER TABLE client_intakes ADD CONSTRAINT client_intakes_status_check
  CHECK (status IN ('new','reviewing','invoice_sent','paid','archived','waived'));

-- Storage: W9 files, admin-only (Kristin attaches the file after collecting it from
-- the partner however she prefers — email, DocuSign, etc. — mirrors admin-documents exactly)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('bounty-documents', 'bounty-documents', false, 52428800);

CREATE POLICY "Admins can read bounty-documents storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload to bounty-documents storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update bounty-documents storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete bounty-documents storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'bounty-documents' AND has_role(auth.uid(), 'admin'::app_role));
