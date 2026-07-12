-- Google Calendar event id for scheduled consultations, so reschedules update
-- the same event instead of creating duplicates.
ALTER TABLE public.client_intakes ADD COLUMN google_event_id text;
