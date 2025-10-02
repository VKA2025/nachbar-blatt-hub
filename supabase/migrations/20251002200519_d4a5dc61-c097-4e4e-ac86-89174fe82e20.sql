-- Remove duplicate profile SELECT policy
-- Keep the more restrictive policy that checks both auth.uid() AND auth.role()
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Update admin_audit_log INSERT policy to explicitly check admin role
DROP POLICY IF EXISTS "System can insert audit logs" ON public.admin_audit_log;

CREATE POLICY "Only admin functions can insert audit logs"
ON public.admin_audit_log
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));