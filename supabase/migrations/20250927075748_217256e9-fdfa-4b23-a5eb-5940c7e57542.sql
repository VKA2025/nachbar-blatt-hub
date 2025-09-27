-- Create streets master data table
CREATE TABLE public.streets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on streets table
ALTER TABLE public.streets ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read streets (public data)
CREATE POLICY "Everyone can view streets" 
ON public.streets 
FOR SELECT 
USING (true);

-- Add street and house number fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN street text,
ADD COLUMN house_number text;