
-- 1. Remove duplicate SELECT policy on storage
DROP POLICY IF EXISTS "Allow public read access to review-photos" ON storage.objects;

-- 2. Block direct anonymous/authenticated INSERT on storage (uploads go through edge function with service role)
CREATE POLICY "Deny direct uploads to review-photos"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id != 'review-photos');

-- 3. Block DELETE on review-photos for non-service-role users
CREATE POLICY "Deny deletes on review-photos"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id != 'review-photos');

-- 4. Block UPDATE on review-photos for non-service-role users
CREATE POLICY "Deny updates on review-photos"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id != 'review-photos');

-- 5. Tighten review_submissions INSERT policy
DROP POLICY IF EXISTS "Allow anonymous review submissions" ON public.review_submissions;
CREATE POLICY "Allow anonymous review submissions"
ON public.review_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (name IS NOT NULL) AND
  (city IS NOT NULL) AND
  (state IS NOT NULL) AND
  (review_text IS NOT NULL) AND
  (length(review_text) <= 2000) AND
  (length(name) <= 200) AND
  (length(city) <= 100) AND
  (length(state) <= 2) AND
  (status = 'pending'::text) AND
  (photo_url IS NULL OR (photo_url ~ '^https://' AND length(photo_url) <= 1000))
);

-- 6. Tighten waiting_list INSERT policy
DROP POLICY IF EXISTS "Allow anonymous inserts to waiting_list" ON public.waiting_list;
CREATE POLICY "Allow anonymous inserts to waiting_list"
ON public.waiting_list
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (name IS NOT NULL) AND
  (email IS NOT NULL) AND
  (update_frequency IS NOT NULL) AND
  (length(email) <= 320) AND
  (length(name) <= 200) AND
  (length(update_frequency) <= 500) AND
  (website_url IS NULL OR (website_url ~ '^https?://' AND length(website_url) <= 500))
);
