-- Lead capture for the /launch offer page. Anonymous visitors may only insert;
-- reads are admin-only.
create table if not exists public.offer_leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  business_name text,
  website_url text,
  need text,
  created_at timestamptz not null default now()
);
alter table public.offer_leads enable row level security;
create policy "ol_anon_insert" on public.offer_leads
  for insert to anon, authenticated with check (true);
create policy "ol_admin_read" on public.offer_leads
  for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
