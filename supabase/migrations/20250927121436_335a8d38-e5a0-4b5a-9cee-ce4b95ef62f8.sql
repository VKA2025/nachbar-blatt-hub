-- Add filter_preferences column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN filter_preferences jsonb DEFAULT '[]'::jsonb;