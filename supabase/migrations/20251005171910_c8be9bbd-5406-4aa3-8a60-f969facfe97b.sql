-- Drop and recreate the trigger and function completely
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create the function with proper type handling
CREATE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, first_name, last_name, email, street, house_number, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data::jsonb->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data::jsonb->>'last_name', ''),
    NEW.email,
    NEW.raw_user_meta_data::jsonb->>'street',
    NEW.raw_user_meta_data::jsonb->>'house_number',
    COALESCE((NEW.raw_user_meta_data::jsonb->>'email_notifications')::boolean, false)
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
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();