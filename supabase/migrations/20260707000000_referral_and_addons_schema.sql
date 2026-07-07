-- Referral program settings (single editable row)
CREATE TABLE referral_program_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT true,
  first_reward_amount numeric(10,2) NOT NULL DEFAULT 200.00,
  completion_bonus_amount numeric(10,2) NOT NULL DEFAULT 150.00,
  tier_threshold integer NOT NULL DEFAULT 3,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.10,
  new_client_discount numeric(10,2) NOT NULL DEFAULT 100.00,
  eligibility_notes text NOT NULL DEFAULT 'New clients only. Commission paid after deposit clears. No cap on referrals.',
  payout_methods text[] NOT NULL DEFAULT ARRAY['paypal','venmo','credit'],
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One referral link per client
CREATE TABLE referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_profile_id)
);

-- Individual referral records
CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_profile_id uuid NOT NULL REFERENCES client_profiles(id),
  referred_email text NOT NULL,
  referred_name text,
  referred_profile_id uuid REFERENCES client_profiles(id),
  status text NOT NULL DEFAULT 'pending',
  first_reward_paid_at timestamptz,
  completion_bonus_paid_at timestamptz,
  payout_method text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add-on services catalog (admin editable)
CREATE TABLE add_on_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'one_time',
  category text NOT NULL DEFAULT 'project',
  price_min numeric(10,2),
  price_max numeric(10,2),
  display_price text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Which add-ons each client has active
CREATE TABLE client_add_ons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_profile_id uuid NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  add_on_catalog_id uuid REFERENCES add_on_catalog(id),
  custom_name text,
  price numeric(10,2),
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE referral_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE add_on_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_add_ons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rps_service_role" ON referral_program_settings USING (true) WITH CHECK (true);
CREATE POLICY "rl_service_role" ON referral_links USING (true) WITH CHECK (true);
CREATE POLICY "ref_service_role" ON referrals USING (true) WITH CHECK (true);
CREATE POLICY "aoc_service_role" ON add_on_catalog USING (true) WITH CHECK (true);
CREATE POLICY "cao_service_role" ON client_add_ons USING (true) WITH CHECK (true);

CREATE POLICY "rl_client_own" ON referral_links FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "ref_client_own" ON referrals FOR SELECT USING (
  referrer_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);
CREATE POLICY "aoc_public_read" ON add_on_catalog FOR SELECT USING (active = true);
CREATE POLICY "cao_client_own" ON client_add_ons FOR SELECT USING (
  client_profile_id IN (SELECT id FROM client_profiles WHERE user_id = auth.uid())
);

-- Seed settings row
INSERT INTO referral_program_settings (id) VALUES (gen_random_uuid());

-- Seed add-on catalog
INSERT INTO add_on_catalog (name, description, type, category, price_min, price_max, display_price, sort_order) VALUES
('Maintenance & Care Plan', 'Monthly content updates, performance monitoring, priority change requests, monthly site-health report.', 'recurring', 'retainer', 150, 299, '$150 – $299 / mo', 1),
('SEO Starter', 'Keyword tracking, 1–2 ghostwritten blog posts/month, Google Business Profile management, monthly rankings report.', 'recurring', 'retainer', 400, 800, '$400 – $800 / mo', 2),
('Social Media Graphics Pack', '8–12 branded graphics/month for Instagram, Facebook, and LinkedIn — designed to match site visual identity.', 'recurring', 'retainer', 200, 350, '$200 – $350 / mo', 3),
('Email Marketing', 'Monthly branded email campaigns designed and sent via Aethyx email system.', 'recurring', 'retainer', 300, 600, '$300 – $600 / mo', 4),
('Landing Page', 'Campaign or promo-specific page added to existing site.', 'one_time', 'project', 500, 1500, '$500 – $1,500', 5),
('Brand Refresh', 'Updated colors, fonts, logo variations — not a full rebrand.', 'one_time', 'project', 800, 2000, '$800 – $2,000', 6),
('Email Template Design', '1–3 branded email templates for use in client marketing platform.', 'one_time', 'project', 300, 600, '$300 – $600', 7),
('Blog Setup + 3 Posts', 'Blog infrastructure set up with 3 SEO-optimised starter articles.', 'one_time', 'project', 500, 900, '$500 – $900', 8),
('Speed & SEO Audit', 'One-time technical review with written action plan delivered.', 'one_time', 'project', 250, 500, '$250 – $500', 9),
('Form / Intake Upgrade', 'Custom-styled form connected to Aethyx notification pipeline.', 'one_time', 'project', 200, 400, '$200 – $400', 10),
('Analytics Dashboard Setup', 'Google Analytics 4 configured with goal tracking and custom reporting.', 'one_time', 'project', 300, 500, '$300 – $500', 11);
