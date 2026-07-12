CREATE TABLE client_portal_seen_at (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  item_type text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id, item_type)
);

ALTER TABLE client_portal_seen_at ENABLE ROW LEVEL SECURITY;

-- Deliberately no admin/service-role policy: nothing in the admin UI reads or writes this
-- table. Adding an unused broad policy here would repeat the USING(true)-without-TO-service_role
-- pattern already flagged as a fast-follow elsewhere in this project.
CREATE POLICY "cpsa_client_own" ON client_portal_seen_at FOR ALL TO authenticated USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
) WITH CHECK (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);

-- Seed a baseline for every existing client so this feature ships "quiet" — only items that
-- arrive after this migration ever count as unseen, not every pre-existing document/task/
-- agreement.
INSERT INTO client_portal_seen_at (client_profile_id, item_type, last_seen_at)
SELECT cp.id, t.item_type, now()
FROM client_profiles cp
CROSS JOIN (VALUES ('documents'), ('tasks'), ('agreements')) AS t(item_type)
ON CONFLICT (client_profile_id, item_type) DO NOTHING;
