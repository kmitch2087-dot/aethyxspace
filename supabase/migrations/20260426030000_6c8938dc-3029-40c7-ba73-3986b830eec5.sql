CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  matched_intake public.client_intakes%ROWTYPE;
BEGIN
  -- Create profile row for the new user
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  -- Find most-recent intake matching this email (case-insensitive)
  SELECT * INTO matched_intake
  FROM public.client_intakes
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_intake.id IS NOT NULL THEN
    -- Link intake to new user
    UPDATE public.client_intakes
    SET linked_user_id = NEW.id, updated_at = now()
    WHERE id = matched_intake.id;

    -- Prefill client_profile from intake
    INSERT INTO public.client_profiles (user_id, full_name, business_name, phone)
    VALUES (
      NEW.id,
      matched_intake.full_name,
      matched_intake.business_name,
      matched_intake.phone
    )
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;