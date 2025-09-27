-- Create info_types table with predefined types
CREATE TABLE public.info_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.info_types ENABLE ROW LEVEL SECURITY;

-- Create policy for everyone to view info types
CREATE POLICY "Everyone can view info types" 
ON public.info_types 
FOR SELECT 
USING (true);

-- Insert predefined info types
INSERT INTO public.info_types (name) VALUES 
  ('Werbung'),
  ('Abfallkalender'), 
  ('Kinoprogramm'),
  ('Zeitung');

-- Add info_type_id to flyers table
ALTER TABLE public.flyers 
ADD COLUMN info_type_id UUID REFERENCES public.info_types(id);

-- Create index for better performance
CREATE INDEX idx_flyers_info_type_id ON public.flyers(info_type_id);