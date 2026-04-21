-- Revert: remove the broad SELECT policy on blog-covers.
-- Public buckets serve files via the CDN (getPublicUrl) without requiring a
-- storage.objects SELECT policy. The broad policy enables listing/enumeration
-- of all files via the storage API, which is what we previously removed.
DROP POLICY IF EXISTS "Public can view blog cover images" ON storage.objects;