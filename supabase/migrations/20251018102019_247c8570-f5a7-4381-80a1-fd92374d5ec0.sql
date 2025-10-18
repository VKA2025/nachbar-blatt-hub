-- Add expires_at column to flyers table
ALTER TABLE public.flyers 
ADD COLUMN expires_at date;

-- Update RLS policy for regular users to exclude expired flyers
DROP POLICY IF EXISTS "Everyone can view active flyers" ON public.flyers;

CREATE POLICY "Everyone can view active flyers" 
ON public.flyers 
FOR SELECT 
USING (
  is_active = true 
  AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
);