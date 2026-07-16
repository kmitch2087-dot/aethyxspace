-- Gmail receipt capture: auto-post business subscription receipts as expenses.
alter table public.financial_records
  add column if not exists source_email_id text;
create unique index if not exists financial_records_source_email_id_key
  on public.financial_records (source_email_id) where source_email_id is not null;

-- Vendors whose receipt emails get captured. Admin-managed.
create table if not exists public.expense_email_senders (
  id uuid primary key default gen_random_uuid(),
  vendor_name text not null,
  sender_domain text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.expense_email_senders enable row level security;
create policy "ees_admin_all" on public.expense_email_senders
  for all to authenticated
  using (has_role(auth.uid(), 'admin'::app_role))
  with check (has_role(auth.uid(), 'admin'::app_role));

-- Every Gmail message already examined (receipt or not), so non-receipts
-- aren't re-sent to Gemini on every run.
create table if not exists public.expense_email_seen (
  message_id text primary key,
  verdict text not null,
  created_at timestamptz not null default now()
);
alter table public.expense_email_seen enable row level security;
create policy "ees_seen_admin_read" on public.expense_email_seen
  for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));

insert into public.expense_email_senders (vendor_name, sender_domain) values
  ('Anthropic (Claude)', 'anthropic.com'),
  ('OpenAI (ChatGPT)', 'openai.com'),
  ('Canva', 'canva.com'),
  ('Proton', 'proton.me'),
  ('Linktree', 'linktr.ee')
on conflict (sender_domain) do nothing;
