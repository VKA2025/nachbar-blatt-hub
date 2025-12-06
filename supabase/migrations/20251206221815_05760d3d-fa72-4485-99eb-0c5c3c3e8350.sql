-- Drop the old constraint
ALTER TABLE public.waste_collection_schedule 
DROP CONSTRAINT waste_collection_schedule_waste_type_check;

-- Add the new constraint with Straßenlaub included
ALTER TABLE public.waste_collection_schedule 
ADD CONSTRAINT waste_collection_schedule_waste_type_check 
CHECK (waste_type = ANY (ARRAY['Restmülltonne'::text, 'Gelber Sack'::text, 'Papiertonne'::text, 'Biotonne'::text, 'Straßenlaub'::text]));