-- Per-document client visibility. Default TRUE so every existing document — and
-- every non-admin-upload insert path (invoice pointer entries, the admin library
-- "Share with client(s)" action) — stays client-visible. The admin's direct
-- per-client upload UI explicitly inserts FALSE and toggles from there.
alter table public.client_documents
  add column if not exists shared_with_client boolean not null default true;

-- Enforce visibility in RLS, not just the UI. Admin access is a separate policy
-- ("Admins can manage client_documents") and is unaffected.
drop policy if exists "Users can view own documents" on public.client_documents;
create policy "Users can view own documents"
  on public.client_documents for select to authenticated
  using (auth.uid() = user_id and shared_with_client = true);

drop policy if exists "Users view own documents by profile" on public.client_documents;
create policy "Users view own documents by profile"
  on public.client_documents for select to authenticated
  using (
    client_profile_id in (select id from public.client_profiles where user_id = auth.uid())
    and shared_with_client = true
  );
