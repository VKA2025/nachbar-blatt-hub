-- Fix the handle_new_user function to properly handle raw_user_meta_data as jsonb
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert into profiles, handling potential null values
  INSERT INTO public.profiles (user_id, first_name, last_name, email, street, house_number, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email,
    NEW.raw_user_meta_data->>'street',
    NEW.raw_user_meta_data->>'house_number',
    COALESCE((NEW.raw_user_meta_data->>'email_notifications')::boolean, false)
  );
  
  -- Give default user role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;