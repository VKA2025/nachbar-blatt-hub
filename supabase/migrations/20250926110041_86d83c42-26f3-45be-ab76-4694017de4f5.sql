-- Add support for external URL links as alternative to file uploads
ALTER TABLE public.flyers 
ADD COLUMN external_url TEXT,
ADD COLUMN is_external BOOLEAN NOT NULL DEFAULT false;

-- Update existing constraint to allow nullable file fields when using external URLs
ALTER TABLE public.flyers 
ALTER COLUMN file_url DROP NOT NULL,
ALTER COLUMN file_name DROP NOT NULL;

-- Add check constraint to ensure either file_url or external_url is provided
ALTER TABLE public.flyers 
ADD CONSTRAINT flyers_url_check CHECK (
  (is_external = false AND file_url IS NOT NULL AND file_name IS NOT NULL AND external_url IS NULL) OR
  (is_external = true AND external_url IS NOT NULL AND file_url IS NULL AND file_name IS NULL)
);