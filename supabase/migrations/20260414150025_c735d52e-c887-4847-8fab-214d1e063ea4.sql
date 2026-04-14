
DROP POLICY "Allow anonymous inserts to traffic_clicks" ON public.traffic_clicks;

CREATE POLICY "Allow anonymous inserts to traffic_clicks"
ON public.traffic_clicks FOR INSERT
TO anon, authenticated
WITH CHECK (
  source IS NOT NULL
  AND (other_details IS NULL OR length(other_details) <= 500)
);
