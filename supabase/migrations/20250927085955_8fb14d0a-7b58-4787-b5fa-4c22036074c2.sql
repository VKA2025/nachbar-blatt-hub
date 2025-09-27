-- Insert "unspezifisch" info type
INSERT INTO public.info_types (name) VALUES ('unspezifisch');

-- Update all existing flyers that don't have an info_type_id assigned
-- to use the "unspezifisch" info type
UPDATE public.flyers 
SET info_type_id = (
  SELECT id FROM public.info_types WHERE name = 'unspezifisch'
)
WHERE info_type_id IS NULL;