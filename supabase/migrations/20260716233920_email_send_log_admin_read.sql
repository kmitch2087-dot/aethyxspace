-- The admin Inbox "Sent" tab queries email_send_log with the admin's own
-- authenticated session, but the only SELECT policy was service_role-scoped —
-- so the tab always came back empty even though sends were logged fine.
create policy "Admins can read send log"
  on public.email_send_log for select to authenticated
  using (has_role(auth.uid(), 'admin'::app_role));
