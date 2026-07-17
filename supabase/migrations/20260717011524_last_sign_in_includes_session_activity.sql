-- last_sign_in_at only updates on a fresh login; users who stay signed in
-- (persistent sessions auto-refreshing tokens) never bump it, so "last logged
-- in" displays went stale. Fold in the newest session refresh — auth.sessions
-- .refreshed_at — to reflect actual recent activity.
create or replace function public.get_client_last_sign_ins()
returns table(client_profile_id uuid, last_sign_in_at timestamptz)
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not has_role(auth.uid(), 'admin'::app_role) then
    return; -- empty result set for non-admins, not an error
  end if;
  return query
    select cp.id,
           greatest(
             u.last_sign_in_at,
             (select max(s.refreshed_at) from auth.sessions s where s.user_id = u.id) at time zone 'utc'
           )
    from client_profiles cp
    join auth.users u on u.id = cp.user_id;
end;
$$;
