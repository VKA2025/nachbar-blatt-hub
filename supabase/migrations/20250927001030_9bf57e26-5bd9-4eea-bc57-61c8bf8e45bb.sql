-- Update default sort preferences to use custom order by default
ALTER TABLE public.profiles 
ALTER COLUMN sort_preferences 
SET DEFAULT '{"field": "custom", "direction": "desc", "custom_order": []}'::jsonb;

-- Update existing profiles that still have upload_date as default
UPDATE public.profiles 
SET sort_preferences = '{"field": "custom", "direction": "desc", "custom_order": []}'::jsonb
WHERE sort_preferences->>'field' = 'upload_date';