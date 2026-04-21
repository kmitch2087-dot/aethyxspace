-- 1. Lock down user_roles: only admins may INSERT/UPDATE/DELETE roles.
-- The existing permissive ALL policy already restricts to admins via USING,
-- but INSERT needs an explicit WITH CHECK. Add a RESTRICTIVE policy that
-- enforces admin-only writes regardless of any other permissive policies.

CREATE POLICY "Only admins can insert roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles (restrictive)"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict listing on public storage buckets.
-- Public buckets currently allow any client to list/enumerate files via storage.objects SELECT.
-- We replace blanket SELECT policies on review-photos and blog-covers with policies that
-- only allow direct object reads (which is what getPublicUrl uses) by limiting to specific
-- name lookups. Since Supabase public URLs do not require a SELECT policy at all
-- (public buckets serve files via the storage CDN), we can safely remove broad SELECT
-- policies that enable listing.

-- Drop any existing permissive SELECT policies on these public buckets.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        qual LIKE '%review-photos%'
        OR qual LIKE '%blog-covers%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Note: Public buckets continue to serve files via their public CDN URLs
-- (getPublicUrl) without requiring storage.objects SELECT policies. Removing the
-- broad SELECT policies prevents listing/enumeration via the storage API while
-- preserving normal display of images by URL.