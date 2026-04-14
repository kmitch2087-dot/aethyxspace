
-- Traffic source enum
CREATE TYPE public.traffic_source AS ENUM ('tiktok', 'instagram', 'facebook', 'other');

-- Traffic clicks table
CREATE TABLE public.traffic_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source traffic_source NOT NULL,
  other_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.traffic_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous inserts to traffic_clicks"
ON public.traffic_clicks FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins can read traffic_clicks"
ON public.traffic_clicks FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Client profiles table (extended billing info)
CREATE TABLE public.client_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  business_name TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_zip TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own client_profile"
ON public.client_profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own client_profile"
ON public.client_profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own client_profile"
ON public.client_profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client_profiles"
ON public.client_profiles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_client_profiles_updated_at
BEFORE UPDATE ON public.client_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Client messages table
CREATE TABLE public.client_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
ON public.client_messages FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
ON public.client_messages FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage client_messages"
ON public.client_messages FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Client documents table
CREATE TABLE public.client_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_by TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
ON public.client_documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage client_documents"
ON public.client_documents FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Client documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('client-documents', 'client-documents', false);

CREATE POLICY "Users can view own files in client-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'client-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can manage client-documents"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'admin'::app_role));
