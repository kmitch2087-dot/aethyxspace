-- Scrape enhancements: optional keywords to steer extraction, and project-scoping
-- so a scrape's approved items land in whichever business it was actually run for
-- (not whatever project tab happens to be selected later at review time).
ALTER TABLE client_asset_scrapes ADD COLUMN keywords text;
ALTER TABLE client_asset_scrapes ADD COLUMN plan_id uuid REFERENCES client_project_plans(id) ON DELETE SET NULL;
