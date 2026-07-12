-- Allow admins full access to client-assets bucket
CREATE POLICY "Admins can manage client-assets storage"
ON storage.objects FOR ALL
USING (bucket_id = 'client-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- Allow clients to read their own assets (folder = their client_profile_id)
CREATE POLICY "Clients can read own assets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-assets' AND
  EXISTS (
    SELECT 1 FROM client_profiles
    WHERE id::text = (storage.foldername(name))[1]
    AND user_id = auth.uid()
  )
);
