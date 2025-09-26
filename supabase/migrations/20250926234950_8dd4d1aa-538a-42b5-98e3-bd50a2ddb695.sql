-- Add sort preferences to profiles table
ALTER TABLE public.profiles 
ADD COLUMN sort_preferences JSONB DEFAULT '{"field": "upload_date", "direction": "desc"}'::jsonb;