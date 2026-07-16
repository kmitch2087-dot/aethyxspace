-- Custom uploaded document as the agreement body (path within client-slot-docs bucket),
-- and a link to the auto-generated down-payment invoice created when the client signs.
alter table public.client_agreement_records
  add column if not exists document_path text,
  add column if not exists down_payment_invoice_id uuid references public.client_invoices(id);

-- client-slot-docs files live under {client_profile_id}/... but the existing client-side
-- policies scope to (storage.foldername(name))[1] = auth.uid() — the auth user id, which
-- never matches a profile id. Clients could not read their own slot documents (needed to
-- view an attached agreement PDF) nor upload their signing ID. Scope by profile ownership.
create policy "Clients can view own profile files in client-slot-docs"
  on storage.objects for select
  using (
    bucket_id = 'client-slot-docs'
    and exists (
      select 1 from public.client_profiles cp
      where cp.user_id = auth.uid()
        and cp.id::text = (storage.foldername(name))[1]
    )
  );

create policy "Clients can upload to own profile folder in client-slot-docs"
  on storage.objects for insert
  with check (
    bucket_id = 'client-slot-docs'
    and exists (
      select 1 from public.client_profiles cp
      where cp.user_id = auth.uid()
        and cp.id::text = (storage.foldername(name))[1]
    )
  );
