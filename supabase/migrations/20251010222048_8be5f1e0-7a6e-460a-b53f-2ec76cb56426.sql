-- Drop the old constraint that requires either file_url or external_url
ALTER TABLE public.flyers DROP CONSTRAINT IF EXISTS flyers_url_check;

-- Add a new constraint that allows all three cases:
-- 1. file_url is set (and external_url is null)
-- 2. external_url is set (and file_url is null)  
-- 3. both are null (for info tiles without file/URL)
ALTER TABLE public.flyers ADD CONSTRAINT flyers_url_check 
CHECK (
  (file_url IS NOT NULL AND external_url IS NULL) OR
  (external_url IS NOT NULL AND file_url IS NULL) OR
  (file_url IS NULL AND external_url IS NULL)
);