-- Create admin_documents table
CREATE TABLE public.admin_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size BIGINT,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_documents"
  ON public.admin_documents
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_documents_updated_at
  BEFORE UPDATE ON public.admin_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create admin_media table
CREATE TABLE public.admin_media (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  mime_type TEXT,
  file_size BIGINT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage admin_media"
  ON public.admin_media
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_media_updated_at
  BEFORE UPDATE ON public.admin_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create private storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES
  ('admin-documents', 'admin-documents', false, 52428800),
  ('admin-media', 'admin-media', false, 52428800);

-- Storage policies: only admins can read/write to these buckets
CREATE POLICY "Admins can read admin-documents storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'admin-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload to admin-documents storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'admin-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin-documents storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'admin-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin-documents storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'admin-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read admin-media storage"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload to admin-media storage"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update admin-media storage"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete admin-media storage"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'admin-media' AND public.has_role(auth.uid(), 'admin'));