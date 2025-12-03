-- Unique constraint für street_districts (inkl. district)
CREATE UNIQUE INDEX IF NOT EXISTS street_districts_unique_idx 
ON public.street_districts (street_name, COALESCE(notes, ''), district, year);

-- Unique constraint für waste_collection_schedule
CREATE UNIQUE INDEX IF NOT EXISTS waste_collection_schedule_unique_idx 
ON public.waste_collection_schedule (collection_date, waste_type, district);