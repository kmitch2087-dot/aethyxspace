-- PortalReferrals.tsx inserts a client's own referral_links row directly (client-side,
-- authenticated non-admin) to generate their referral code on first visit to that page.
-- This previously worked only because of the just-removed public "true" policy — closing
-- that hole broke this legitimate flow. Add the correctly-scoped client INSERT policy
-- (own client_profile_id only), matching the ownership pattern already used by
-- rl_client_own (SELECT) and cao_client_request (INSERT) elsewhere in this schema.
CREATE POLICY "rl_client_insert" ON referral_links FOR INSERT TO authenticated
  WITH CHECK (client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid()));
