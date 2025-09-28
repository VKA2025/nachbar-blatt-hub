-- Remove the overly permissive admin policy for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create an audit log table for tracking admin actions if it doesn't exist
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log table if not already enabled
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'admin_audit_log'
  ) THEN
    ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Drop and recreate policies for audit log to ensure consistency
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

CREATE POLICY "Admins can view audit logs" ON public.admin_audit_log
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

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
  -- Only admins can call this function and log the access
  SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE email_notifications = true) as users_with_notifications,
    COUNT(*) FILTER (WHERE street IS NOT NULL) as users_with_addresses,
    COUNT(*) FILTER (WHERE created_at > CURRENT_DATE - INTERVAL '30 days') as recent_signups
  FROM public.profiles
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND (SELECT log_admin_action('view_user_statistics') IS NOT NULL OR true);
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
  -- Log admin access and return only non-sensitive data
  SELECT 
    p.user_id,
    p.created_at,
    (p.street IS NOT NULL) as has_street,
    p.email_notifications as notifications_enabled,
    p.updated_at as last_updated
  FROM public.profiles p
  WHERE has_role(auth.uid(), 'admin'::app_role)
    AND (SELECT log_admin_action('user_management_access', 
          jsonb_build_object('limit', limit_count)) IS NOT NULL OR true)
  ORDER BY p.created_at DESC
  LIMIT limit_count;
$$;

-- Create a secure function for street-based user queries
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
  -- Only return aggregated, anonymized data
  SELECT 
    COUNT(*) as user_count,
    COUNT(*) FILTER (WHERE email_notifications = true) as notifications_enabled,
    street_name as street
  FROM public.profiles
  WHERE street = street_name
    AND has_role(auth.uid(), 'admin'::app_role)
    AND (SELECT log_admin_action('street_user_query', 
          jsonb_build_object('street', street_name)) IS NOT NULL OR true)
  GROUP BY street_name;
$$;