-- Partial unique index (not a blanket unique constraint): a client can legitimately have
-- more than one historical row per catalog item over time (e.g. requested -> cancelled ->
-- requested again later), so we only forbid more than one currently-live
-- (requested/active) row per (client_profile_id, add_on_catalog_id) pair at a time.
-- Custom (non-catalog) add-ons have add_on_catalog_id IS NULL and are excluded.
CREATE UNIQUE INDEX cao_one_live_request_per_catalog_item
ON client_add_ons (client_profile_id, add_on_catalog_id)
WHERE status IN ('requested', 'active') AND add_on_catalog_id IS NOT NULL;
