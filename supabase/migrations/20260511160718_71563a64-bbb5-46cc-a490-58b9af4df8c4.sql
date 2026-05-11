
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  matched_intake public.client_intakes%ROWTYPE;
  new_profile_id uuid;
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);

  SELECT * INTO matched_intake
  FROM public.client_intakes
  WHERE lower(email) = lower(NEW.email)
  ORDER BY created_at DESC
  LIMIT 1;

  IF matched_intake.id IS NOT NULL THEN
    INSERT INTO public.client_profiles (user_id, full_name, business_name, phone, email)
    VALUES (NEW.id, matched_intake.full_name, matched_intake.business_name, matched_intake.phone, NEW.email)
    ON CONFLICT DO NOTHING
    RETURNING id INTO new_profile_id;

    IF new_profile_id IS NULL THEN
      SELECT id INTO new_profile_id FROM public.client_profiles WHERE user_id = NEW.id LIMIT 1;
    END IF;

    UPDATE public.client_intakes
    SET linked_user_id = NEW.id,
        client_profile_id = COALESCE(client_profile_id, new_profile_id),
        updated_at = now()
    WHERE id = matched_intake.id;
  END IF;

  RETURN NEW;
END;
$function$;
