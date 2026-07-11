-- Admin-only: expose auth.users.last_sign_in_at for the client roster/detail views.
-- Follows the same SECURITY DEFINER + internal admin check pattern already
-- established by resolve_and_record_referral() — never a bypass, gated inside
-- the function body.
CREATE OR REPLACE FUNCTION public.get_client_last_sign_ins()
RETURNS TABLE(client_profile_id uuid, last_sign_in_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN; -- empty result set for non-admins, not an error
  END IF;
  RETURN QUERY
    SELECT cp.id, u.last_sign_in_at
    FROM client_profiles cp
    JOIN auth.users u ON u.id = cp.user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_last_sign_ins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_last_sign_ins() TO authenticated;
