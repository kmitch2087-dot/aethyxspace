-- Multi-business clients (e.g. Irving Munoz: Scotty's Adventures + Limitless Barbershop
-- under one portal login) need correspondence about each project routed to that
-- business's own email, distinct from whichever email he actually logs in with.
-- Lightweight routing field, no auth/RLS changes — admin sets it manually per plan and
-- references it when sending project-specific emails.
ALTER TABLE client_project_plans ADD COLUMN contact_email text;
