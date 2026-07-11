CREATE TABLE client_asset_scrapes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE client_asset_scrape_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scrape_id uuid NOT NULL REFERENCES client_asset_scrapes(id) ON DELETE CASCADE,
  kind text NOT NULL,
  suggested_category text NOT NULL DEFAULT 'other',
  suggested_label text NOT NULL,
  content text,
  source_url text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE client_asset_scrapes ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_asset_scrape_items ENABLE ROW LEVEL SECURITY;

-- Admin-only, correctly scoped via has_role — never a blanket USING(true).
CREATE POLICY "cas_admin_all" ON client_asset_scrapes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "casi_admin_all" ON client_asset_scrape_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
