-- Add explicit deny policy for SELECT to prevent any data reads
CREATE POLICY "Deny all selects on waiting_list" 
ON public.waiting_list 
FOR SELECT 
USING (false);