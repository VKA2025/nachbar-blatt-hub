-- Fix the handle_new_user function to properly cast raw_user_meta_data to jsonb
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  meta_data jsonb;
BEGIN
  -- Cast raw_user_meta_data to jsonb explicitly
  meta_data := NEW.raw_user_meta_data::jsonb;
  
  -- Insert into profiles, handling potential null values
  INSERT INTO public.profiles (user_id, first_name, last_name, email, street, house_number, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(meta_data->>'first_name', ''),
    COALESCE(meta_data->>'last_name', ''),
    NEW.email,
    meta_data->>'street',
    meta_data->>'house_number',
    COALESCE((meta_data->>'email_notifications')::boolean, false)
  );
  
  -- Give default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;