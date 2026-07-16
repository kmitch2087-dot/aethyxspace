-- Service-role-only key/value store (RLS enabled, deliberately NO policies — edge
-- functions only). First use: the Gmail-scoped Google OAuth refresh token, so the
-- Gmail connection can be completed from the admin UI without redeploying secrets.
create table if not exists public.app_private_config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table public.app_private_config enable row level security;
