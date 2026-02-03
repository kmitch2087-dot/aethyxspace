-- Create waiting_list table to store waiting list submissions
CREATE TABLE public.waiting_list (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  update_frequency TEXT NOT NULL,
  website_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anonymous inserts (public form)
CREATE POLICY "Allow anonymous inserts to waiting_list" 
ON public.waiting_list 
FOR INSERT 
WITH CHECK (true);

-- No SELECT/UPDATE/DELETE policies - data is write-only from public
-- Admin access would be through service role key or dashboard

-- Add index on email for potential duplicate checking
CREATE INDEX idx_waiting_list_email ON public.waiting_list(email);

-- Add index on created_at for ordering
CREATE INDEX idx_waiting_list_created_at ON public.waiting_list(created_at DESC);