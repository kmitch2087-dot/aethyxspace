-- Consultation scheduling flow: meeting details + $50 invoice tracking on intakes,
-- and a "preferred meeting type" question on the public intake form.

ALTER TABLE public.client_intakes
  ADD COLUMN meeting_scheduled_at timestamptz,
  ADD COLUMN meeting_type text,
  ADD COLUMN meeting_link text,
  ADD COLUMN meeting_reschedule_used boolean NOT NULL DEFAULT false,
  ADD COLUMN consultation_invoice_id text,
  ADD COLUMN consultation_invoice_url text,
  ADD COLUMN consultation_paid_at timestamptz;

INSERT INTO public.intake_form_fields
  (field_key, label, field_type, section, display_order, required, active, options, help_text)
VALUES
  ('preferred_meeting_type', 'How would you like to meet?', 'select', 'extra', 25, true, true,
   '["Phone call","Google Meet"]'::jsonb,
   'Your strategy consultation happens by phone or Google Meet — pick what works best.');
