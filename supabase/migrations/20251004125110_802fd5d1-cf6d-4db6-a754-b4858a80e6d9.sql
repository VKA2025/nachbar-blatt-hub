-- Enable pg_net extension for HTTP requests from database
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create function to notify admin about new user registration
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_first_name text;
  user_last_name text;
  user_email text;
BEGIN
  -- Get user details from the profiles table
  SELECT first_name, last_name, email
  INTO user_first_name, user_last_name, user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- Call edge function via pg_net
  PERFORM net.http_post(
    url := 'https://kvrxgaxjdpxqlnfhhsrc.supabase.co/functions/v1/notify-admin-new-user',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('request.jwt.claims', true)::json->>'token'
    ),
    body := jsonb_build_object(
      'user_email', user_email,
      'user_name', COALESCE(user_first_name || ' ' || user_last_name, user_email)
    )
  );

  RETURN NEW;
END;
$function$;

-- Create trigger to call the notification function after user role is assigned
CREATE TRIGGER trigger_notify_admin_new_user
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  WHEN (NEW.role = 'user')
  EXECUTE FUNCTION public.notify_admin_new_user();