-- Fix critical security issue: Remove flawed profile access policy
DROP POLICY IF EXISTS "Block direct admin access to profiles" ON public.profiles;

-- Add proper RLS policy for authenticated users only  
CREATE POLICY "Authenticated users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Ensure only authenticated users can insert profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Ensure only authenticated users can update their own profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Authenticated users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id AND auth.role() = 'authenticated');

-- Admin policies for profiles - use secure functions only
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete all profiles" ON public.profiles;

CREATE POLICY "Admins can update profiles via secure functions" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete profiles via secure functions" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add secure function for admin profile operations
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  target_user_id uuid,
  new_first_name text DEFAULT NULL,
  new_last_name text DEFAULT NULL,
  new_email text DEFAULT NULL,
  new_street text DEFAULT NULL,
  new_house_number text DEFAULT NULL,
  new_email_notifications boolean DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  update_count integer;
BEGIN
  -- Check if caller is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;
  
  -- Log the admin action
  PERFORM log_admin_action('update_user_profile', 
    jsonb_build_object('target_user_id', target_user_id));
  
  -- Update the profile
  UPDATE public.profiles 
  SET 
    first_name = COALESCE(new_first_name, first_name),
    last_name = COALESCE(new_last_name, last_name),
    email = COALESCE(new_email, email),
    street = COALESCE(new_street, street),
    house_number = COALESCE(new_house_number, house_number),
    email_notifications = COALESCE(new_email_notifications, email_notifications),
    updated_at = now()
  WHERE user_id = target_user_id;
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  RETURN update_count > 0;
END;
$$;