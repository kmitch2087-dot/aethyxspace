-- Create table for review submissions (pending admin review)
CREATE TABLE public.review_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  review_text TEXT NOT NULL,
  photo_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  review_date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Enable RLS
ALTER TABLE public.review_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (customers submitting reviews)
CREATE POLICY "Allow anonymous review submissions"
ON public.review_submissions
FOR INSERT
WITH CHECK (true);

-- Deny public reads (only admin can view via service role)
CREATE POLICY "Deny public reads on review_submissions"
ON public.review_submissions
FOR SELECT
USING (false);

-- Create storage bucket for review photos
INSERT INTO storage.buckets (id, name, public) VALUES ('review-photos', 'review-photos', true);

-- Allow anyone to upload photos to review-photos bucket
CREATE POLICY "Allow public uploads to review-photos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'review-photos');

-- Allow public read access to review photos
CREATE POLICY "Allow public read of review-photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'review-photos');