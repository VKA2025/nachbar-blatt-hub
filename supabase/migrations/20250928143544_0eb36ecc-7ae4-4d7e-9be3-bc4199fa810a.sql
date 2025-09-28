-- Add background image support to flyers table
ALTER TABLE public.flyers 
ADD COLUMN background_image_url text;