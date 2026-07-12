-- Extend the existing referral-resolution function (the only door into referrals/
-- bounty_applicants from public code) to also match bounty applicant codes, and to
-- auto-waive the intake fee when any valid code resolves.
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
  v_bounty_applicant_id uuid;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT client_profile_id INTO v_referrer_id
  FROM referral_links
  WHERE code = p_code;

  IF v_referrer_id IS NOT NULL THEN
    INSERT INTO referrals (referrer_profile_id, referred_email, referred_name, status, notes)
    VALUES (v_referrer_id, p_referred_email, p_referred_name, 'pending', 'Auto-created from intake ' || p_intake_id);
  ELSE
    SELECT id INTO v_bounty_applicant_id
    FROM bounty_applicants
    WHERE code = p_code AND status = 'approved';

    IF v_bounty_applicant_id IS NULL THEN
      RETURN;
    END IF;

    INSERT INTO referrals (referrer_bounty_applicant_id, referred_email, referred_name, status, notes)
    VALUES (v_bounty_applicant_id, p_referred_email, p_referred_name, 'pending', 'Auto-created from intake ' || p_intake_id);
  END IF;

  -- Auto-apply fee waiver: only touch intakes still in their initial 'new' state,
  -- so an admin who already moved the intake forward is never silently overridden.
  UPDATE client_intakes SET status = 'waived', updated_at = now()
  WHERE id = p_intake_id AND status = 'new';
END;
$$;
