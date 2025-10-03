-- Update all flyers with "Kinoprogramm" info type to "Veranstaltungen"
UPDATE public.flyers 
SET info_type_id = (SELECT id FROM public.info_types WHERE name = 'Veranstaltungen')
WHERE info_type_id = (SELECT id FROM public.info_types WHERE name = 'Kinoprogramm');

-- Delete "Kinoprogramm" info type
DELETE FROM public.info_types WHERE name = 'Kinoprogramm';