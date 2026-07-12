-- The native Stripe integration (Stripe Sync Engine) auto-created the `stripe`
-- schema with RLS disabled on every table, exposing all synced Stripe data
-- (customers, charges, invoices, payment_intents, etc.) to the anon/authenticated
-- Data API. Lock every table to admin-only, matching the rest of the admin tables.
-- The sync engine itself writes via the service_role key, which bypasses RLS,
-- so this does not affect syncing.

alter table stripe._migrations enable row level security;
alter table stripe.accounts enable row level security;
alter table stripe._managed_webhooks enable row level security;
alter table stripe._sync_runs enable row level security;
alter table stripe._sync_obj_runs enable row level security;
alter table stripe._rate_limits enable row level security;
alter table stripe.active_entitlements enable row level security;
alter table stripe.charges enable row level security;
alter table stripe.checkout_session_line_items enable row level security;
alter table stripe.checkout_sessions enable row level security;
alter table stripe.coupons enable row level security;
alter table stripe.credit_notes enable row level security;
alter table stripe.customers enable row level security;
alter table stripe.disputes enable row level security;
alter table stripe.early_fraud_warnings enable row level security;
alter table stripe.features enable row level security;
alter table stripe.invoices enable row level security;
alter table stripe.payment_intents enable row level security;
alter table stripe.payment_methods enable row level security;
alter table stripe.plans enable row level security;
alter table stripe.prices enable row level security;
alter table stripe.products enable row level security;
alter table stripe.refunds enable row level security;
alter table stripe.reviews enable row level security;
alter table stripe.setup_intents enable row level security;
alter table stripe.subscription_items enable row level security;
alter table stripe.subscription_schedules enable row level security;
alter table stripe.subscriptions enable row level security;
alter table stripe.tax_ids enable row level security;

create policy "admin_only" on stripe._migrations for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.accounts for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe._managed_webhooks for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe._sync_runs for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe._sync_obj_runs for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe._rate_limits for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.active_entitlements for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.charges for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.checkout_session_line_items for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.checkout_sessions for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.coupons for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.credit_notes for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.customers for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.disputes for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.early_fraud_warnings for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.features for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.invoices for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.payment_intents for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.payment_methods for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.plans for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.prices for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.products for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.refunds for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.reviews for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.setup_intents for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.subscription_items for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.subscription_schedules for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.subscriptions for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
create policy "admin_only" on stripe.tax_ids for all to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role)) with check (public.has_role(auth.uid(), 'admin'::public.app_role));
