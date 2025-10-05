-- Remove admin notification trigger and function
DROP TRIGGER IF EXISTS trigger_notify_admin_new_user ON public.user_roles;
DROP FUNCTION IF EXISTS public.notify_admin_new_user();