ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS portal_last_login_notified_at timestamptz;
