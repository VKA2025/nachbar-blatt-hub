-- Add new info types
INSERT INTO public.info_types (name) 
VALUES 
  ('Veranstaltungen'),
  ('Einrichtungen')
ON CONFLICT DO NOTHING;

-- Update "Nächster Flohmarkt" flyer to be categorized as "Veranstaltungen"
UPDATE public.flyers 
SET info_type_id = (SELECT id FROM public.info_types WHERE name = 'Veranstaltungen')
WHERE title = 'Nächster Flohmarkt';