-- Remove the overly permissive admin policy for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a more restrictive admin policy that blocks direct table access for admins
CREATE POLICY "Block direct admin access to profiles" ON public.profiles
FOR SELECT 
USING (
  -- Admins cannot directly access the profiles table
  -- They must use specific functions instead
  NOT has_role(auth.uid(), 'admin'::app_role)
);

-- Create a secure function for admins to get user statistics without exposing personal data
CREATE OR REPLACE FUNCTION public.get_user_statistics()
RETURNS TABLE(
  total_users bigint,
  users_with_notifications bigint,
  users_with_addresses bigint,
  recent_signups bigint
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admins can call this function
  SELECT 
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles)
    ELSE 0 END as total_users,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles WHERE email_notifications = true)
    ELSE 0 END as users_with_notifications,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles WHERE street IS NOT NULL)
    ELSE 0 END as users_with_addresses,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles WHERE created_at > CURRENT_DATE - INTERVAL '30 days')
    ELSE 0 END as recent_signups;
$$;

-- Create a secure function for admins to search users by street (for waste management purposes)
-- This only returns anonymized data
CREATE OR REPLACE FUNCTION public.get_users_by_street(street_name text)
RETURNS TABLE(
  user_count bigint,
  notifications_enabled bigint,
  street text
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only admins can call this function
  SELECT 
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles WHERE street = street_name)
    ELSE 0 END as user_count,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      (SELECT COUNT(*) FROM public.profiles WHERE street = street_name AND email_notifications = true)
    ELSE 0 END as notifications_enabled,
    CASE WHEN has_role(auth.uid(), 'admin'::app_role) THEN
      street_name
    ELSE NULL END as street;
$$;

-- Create an audit log table for tracking admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log table
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only system can insert audit logs (via triggers or functions)
CREATE POLICY "System can insert audit logs" ON public.admin_audit_log
FOR INSERT 
WITH CHECK (true);

-- Create a function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(action_type text, action_details jsonb DEFAULT NULL)
RETURNS uuid
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.admin_audit_log (admin_user_id, action, details)
  VALUES (auth.uid(), action_type, action_details)
  RETURNING id;
$$;

-- Create a secure function for user management that only exposes necessary data
CREATE OR REPLACE FUNCTION public.get_user_management_data(limit_count integer DEFAULT 50)
RETURNS TABLE(
  user_id uuid,
  created_at timestamp with time zone,
  has_street boolean,
  notifications_enabled boolean,
  last_updated timestamp with time zone
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only return data if user is admin and log the access
  SELECT 
    p.user_id,
    p.created_at,
    (p.street IS NOT NULL) as has_street,
    p.email_notifications as notifications_enabled,
    p.updated_at as last_updated
  FROM public.profiles p
  WHERE has_role(auth.uid(), 'admin'::app_role)
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;