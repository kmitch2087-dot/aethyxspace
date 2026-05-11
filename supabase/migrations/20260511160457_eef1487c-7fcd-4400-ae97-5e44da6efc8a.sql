
-- Add universal client_profile_id linkage
ALTER TABLE public.client_documents ADD COLUMN IF NOT EXISTS client_profile_id uuid;
ALTER TABLE public.client_messages ADD COLUMN IF NOT EXISTS client_profile_id uuid;
ALTER TABLE public.client_agreements ADD COLUMN IF NOT EXISTS client_profile_id uuid;
ALTER TABLE public.client_intakes ADD COLUMN IF NOT EXISTS client_profile_id uuid;

-- Backfill: client_documents / client_messages by user_id
UPDATE public.client_documents d
SET client_profile_id = p.id
FROM public.client_profiles p
WHERE d.client_profile_id IS NULL AND p.user_id = d.user_id;

UPDATE public.client_messages m
SET client_profile_id = p.id
FROM public.client_profiles p
WHERE m.client_profile_id IS NULL AND p.user_id = m.user_id;

-- Backfill agreements by email (case-insensitive)
UPDATE public.client_agreements a
SET client_profile_id = p.id
FROM public.client_profiles p
WHERE a.client_profile_id IS NULL
  AND a.client_email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(a.client_email) = lower(p.email);

-- Backfill intakes by linked_user_id, then by email
UPDATE public.client_intakes i
SET client_profile_id = p.id
FROM public.client_profiles p
WHERE i.client_profile_id IS NULL AND i.linked_user_id IS NOT NULL AND p.user_id = i.linked_user_id;

UPDATE public.client_intakes i
SET client_profile_id = p.id
FROM public.client_profiles p
WHERE i.client_profile_id IS NULL
  AND i.email IS NOT NULL
  AND p.email IS NOT NULL
  AND lower(i.email) = lower(p.email);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_profile ON public.client_documents(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_profile ON public.client_messages(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_client_agreements_profile ON public.client_agreements(client_profile_id);
CREATE INDEX IF NOT EXISTS idx_client_intakes_profile ON public.client_intakes(client_profile_id);

-- Portal RLS additions: clients can view by profile linkage
CREATE POLICY "Users view own documents by profile"
ON public.client_documents FOR SELECT TO authenticated
USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own messages by profile"
ON public.client_messages FOR SELECT TO authenticated
USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users insert own messages by profile"
ON public.client_messages FOR INSERT TO authenticated
WITH CHECK (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own agreements by profile"
ON public.client_agreements FOR SELECT TO authenticated
USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));

CREATE POLICY "Users view own intakes by profile"
ON public.client_intakes FOR SELECT TO authenticated
USING (client_profile_id IN (SELECT id FROM public.client_profiles WHERE user_id = auth.uid()));
