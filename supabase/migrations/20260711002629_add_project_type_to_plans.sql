ALTER TABLE client_project_plans
  ADD COLUMN IF NOT EXISTS project_type text NOT NULL DEFAULT 'website_build';

COMMENT ON COLUMN client_project_plans.project_type IS
  'Project type key matching PROJECT_TYPES in src/lib/projectTemplates.ts (e.g. website_build, google_ads). Determines default phases and whether the client_document_slots checklist auto-completes phases on this plan.';

-- Existing Google Ads-style plans created before this column existed (matched by name)
-- should be correctly tagged rather than defaulting to website_build.
UPDATE client_project_plans
SET project_type = 'google_ads'
WHERE project_name ILIKE '%google ads%';
