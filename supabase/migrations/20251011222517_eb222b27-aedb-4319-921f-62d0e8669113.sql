-- Add neighbor_type column to flyers table for NachbarNetz categorization
ALTER TABLE public.flyers 
ADD COLUMN neighbor_type text CHECK (neighbor_type IS NULL OR neighbor_type IN ('Dienstleistung', 'Verleih', 'Tausch/Verschenken'));

-- Update existing NachbarNetz flyers based on their titles
UPDATE public.flyers 
SET neighbor_type = 'Dienstleistung'
WHERE id = '8e920dc6-f321-4ad4-9c8a-09b1b2c993b6';

UPDATE public.flyers 
SET neighbor_type = 'Verleih'
WHERE id = 'd121c985-0dd9-4032-86f0-4f320b1c9237';

UPDATE public.flyers 
SET neighbor_type = 'Tausch/Verschenken'
WHERE id = '6acfc449-8299-49b3-8221-1362e34481a8';