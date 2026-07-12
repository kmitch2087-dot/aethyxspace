-- First-party page-view tracking + advertiser inquiries for the /advertise page.

CREATE TABLE public.page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  path text NOT NULL,
  referrer text,
  session_id uuid NOT NULL,
  device text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Insert-only for visitors; raw rows are never client-readable (aggregates come
-- from the SECURITY DEFINER get_traffic_stats() below).
CREATE POLICY "Anyone can log a page view" ON public.page_views FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(path) <= 300
  AND (referrer IS NULL OR length(referrer) <= 500)
  AND (device IS NULL OR device IN ('mobile', 'desktop'))
  AND created_at >= now() - interval '5 minutes'
  AND created_at <= now() + interval '5 minutes'
);

CREATE INDEX idx_page_views_created_at ON public.page_views (created_at);

CREATE TABLE public.advertiser_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  website_url text,
  message text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advertiser_inquiries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an advertising inquiry" ON public.advertiser_inquiries FOR INSERT
TO anon, authenticated
WITH CHECK (
  length(company_name) <= 200
  AND length(contact_name) <= 200
  AND length(email) <= 320
  AND (phone IS NULL OR length(phone) <= 50)
  AND (website_url IS NULL OR length(website_url) <= 500)
  AND (message IS NULL OR length(message) <= 3000)
  AND status = 'new'
  AND created_at >= now() - interval '5 minutes'
  AND created_at <= now() + interval '5 minutes'
);

CREATE POLICY "Admins can view advertiser inquiries" ON public.advertiser_inquiries FOR SELECT
TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update advertiser inquiries" ON public.advertiser_inquiries FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public aggregate stats for the /advertise page. SECURITY DEFINER so anon can read
-- aggregates without any SELECT access to the underlying rows.
CREATE OR REPLACE FUNCTION public.get_traffic_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'views_today', (SELECT count(*) FROM page_views WHERE created_at >= date_trunc('day', now())),
    'views_7d', (SELECT count(*) FROM page_views WHERE created_at >= now() - interval '7 days'),
    'views_30d', (SELECT count(*) FROM page_views WHERE created_at >= now() - interval '30 days'),
    'unique_visitors_30d', (SELECT count(DISTINCT session_id) FROM page_views WHERE created_at >= now() - interval '30 days'),
    'total_views', (SELECT count(*) FROM page_views),
    'top_pages', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('path', path, 'views', views))
      FROM (
        SELECT path, count(*) AS views
        FROM page_views
        WHERE created_at >= now() - interval '30 days'
        GROUP BY path ORDER BY views DESC LIMIT 5
      ) t
    ), '[]'::jsonb),
    'sources', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('source', source, 'clicks', clicks))
      FROM (
        SELECT source, count(*) AS clicks
        FROM traffic_clicks
        WHERE created_at >= now() - interval '30 days'
        GROUP BY source ORDER BY clicks DESC
      ) s
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_traffic_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_traffic_stats() TO anon, authenticated;
