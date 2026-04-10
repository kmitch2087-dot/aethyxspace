
CREATE POLICY "Admins can delete agreements" ON public.client_agreements FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete financials" ON public.financial_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
