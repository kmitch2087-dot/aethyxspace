-- 1. user_roles: allow users to read only their OWN role row.
-- Admins already have full access via the existing "Admins can manage roles" ALL policy.
-- This prevents authenticated users from enumerating other users' roles.
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. blog-covers storage bucket: add explicit public SELECT policy to document
-- intent. The bucket is already public, this just makes the access rule explicit.
CREATE POLICY "Public can view blog cover images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'blog-covers');