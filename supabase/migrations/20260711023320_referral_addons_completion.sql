-- Referral access control: admin decides which clients see the referral program
ALTER TABLE client_profiles ADD COLUMN referral_enabled boolean NOT NULL DEFAULT false;

-- Intake referral capture: silent ?ref=CODE capture from the referral link URL
ALTER TABLE client_intakes ADD COLUMN referral_code text;

-- Resolve a referral code into a referrals row, without exposing referral_links/referrals
-- to direct anon reads or writes. This function is the only door.
CREATE OR REPLACE FUNCTION public.resolve_and_record_referral(
  p_code text,
  p_intake_id uuid,
  p_referred_name text,
  p_referred_email text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT client_profile_id INTO v_referrer_id
  FROM referral_links
  WHERE code = p_code;

  IF v_referrer_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO referrals (referrer_profile_id, referred_email, referred_name, status, notes)
  VALUES (
    v_referrer_id,
    p_referred_email,
    p_referred_name,
    'pending',
    'Auto-created from intake ' || p_intake_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_and_record_referral(text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_and_record_referral(text, uuid, text, text) TO anon, authenticated;

-- Add-on requests: let an authenticated client insert their own request row,
-- but only as an unpriced, unapproved 'requested' row — never active or priced.
CREATE POLICY "cao_client_request" ON client_add_ons FOR INSERT
TO authenticated
WITH CHECK (
  status = 'requested'
  AND price IS NULL
  AND client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);

-- Visible fallback question on the intake form for people who didn't use a referral link
INSERT INTO intake_form_fields (field_key, label, help_text, field_type, options, required, section, display_order, active)
VALUES (
  'referred_by_name',
  'Who referred you to Aethyx?',
  'Optional — if a current client sent you our way, let us know who.',
  'text',
  '[]'::jsonb,
  false,
  'about',
  (SELECT COALESCE(MAX(display_order), 0) + 1 FROM intake_form_fields WHERE section = 'about'),
  true
);
