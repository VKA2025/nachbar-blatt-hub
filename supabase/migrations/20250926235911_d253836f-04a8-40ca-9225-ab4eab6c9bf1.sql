-- Update profiles table to support custom flyer ordering
-- The sort_preferences will now also include a custom_order array for flyer IDs

-- First, let's update the default value to include custom_order
ALTER TABLE public.profiles 
ALTER COLUMN sort_preferences 
SET DEFAULT '{"field": "upload_date", "direction": "desc", "custom_order": []}'::jsonb;

-- Update existing records to include the custom_order field if it doesn't exist
UPDATE public.profiles 
SET sort_preferences = sort_preferences || '{"custom_order": []}'::jsonb
WHERE sort_preferences IS NOT NULL 
AND NOT (sort_preferences ? 'custom_order');