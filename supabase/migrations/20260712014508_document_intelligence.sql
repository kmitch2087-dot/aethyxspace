-- Document intelligence: extend the existing scrape review-queue tables (built for
-- URL scraping) with a second, document-sourced path. A row is either URL-sourced
-- (existing behavior, source_url set) or document-sourced (new, source_document_id +
-- source_document_type set) — never both, never neither.
ALTER TABLE client_asset_scrapes ALTER COLUMN source_url DROP NOT NULL;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_id uuid;
ALTER TABLE client_asset_scrapes ADD COLUMN source_document_type text;
ALTER TABLE client_asset_scrapes ADD CONSTRAINT client_asset_scrapes_source_check
  CHECK (
    (source_url IS NOT NULL AND source_document_id IS NULL AND source_document_type IS NULL)
    OR (source_url IS NULL AND source_document_id IS NOT NULL AND source_document_type IN ('client_documents', 'admin_documents'))
  );
