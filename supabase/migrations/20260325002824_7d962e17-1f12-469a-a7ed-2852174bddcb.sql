
-- Fix waiting_list: grant to anon explicitly
DROP POLICY IF EXISTS "Allow anonymous inserts to waiting_list" ON public.waiting_list;
CREATE POLICY "Allow anonymous inserts to waiting_list"
ON public.waiting_list
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL
  AND email IS NOT NULL
  AND update_frequency IS NOT NULL
  AND length(email) <= 320
  AND length(name) <= 200
);

-- Fix review_submissions: grant to anon explicitly
DROP POLICY IF EXISTS "Allow anonymous review submissions" ON public.review_submissions;
CREATE POLICY "Allow anonymous review submissions"
ON public.review_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  name IS NOT NULL
  AND city IS NOT NULL
  AND state IS NOT NULL
  AND review_text IS NOT NULL
  AND length(review_text) <= 2000
  AND length(name) <= 200
  AND status = 'pending'
);
