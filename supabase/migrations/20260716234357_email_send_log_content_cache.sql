-- Cached rendered content for the admin Sent-tab email viewer/forwarding.
-- Populated lazily by the email-actions function (fetched once from Resend's
-- API by message_id, then stored here) — older sends never logged their body.
alter table public.email_send_log
  add column if not exists subject text,
  add column if not exists html_body text;
