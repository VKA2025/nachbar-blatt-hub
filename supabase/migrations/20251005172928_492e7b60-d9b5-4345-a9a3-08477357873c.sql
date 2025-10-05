-- Fix the handle_new_user function to properly cast raw_user_meta_data
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  meta_data jsonb;
BEGIN
  -- Cast raw_user_meta_data to jsonb once
  meta_data := NEW.raw_user_meta_data::jsonb;
  
  -- Insert into profiles
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
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();