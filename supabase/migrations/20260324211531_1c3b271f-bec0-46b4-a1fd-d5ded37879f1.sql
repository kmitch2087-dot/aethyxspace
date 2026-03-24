-- Remove any existing permissive storage policies on review-photos bucket
DROP POLICY IF EXISTS "Allow public uploads to review-photos" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to review-photos" ON storage.objects;
DROP POLICY IF EXISTS "Give anon users access to review-photos" ON storage.objects;

-- Only allow service role (edge functions) to upload to review-photos
-- Public can still read (bucket is public), but cannot upload directly
CREATE POLICY "Allow public read access to review-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'review-photos');

-- Block direct anonymous uploads - only service role can upload
-- (Edge function uses service role key)