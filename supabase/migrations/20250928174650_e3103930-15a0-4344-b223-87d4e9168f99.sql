-- Create table for street-district mapping data
CREATE TABLE public.street_districts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  street_name TEXT NOT NULL,
  notes TEXT,
  district TEXT NOT NULL,
  year INTEGER NOT NULL DEFAULT 2025,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.street_districts ENABLE ROW LEVEL SECURITY;

-- Create policy for everyone to view street districts (public data)
CREATE POLICY "Everyone can view street districts" 
ON public.street_districts 
FOR SELECT 
USING (true);

-- Create policy for admins to manage street districts
CREATE POLICY "Admins can manage street districts" 
ON public.street_districts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_street_districts_updated_at
BEFORE UPDATE ON public.street_districts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance on common queries
CREATE INDEX idx_street_districts_name ON public.street_districts(street_name);
CREATE INDEX idx_street_districts_district ON public.street_districts(district);
CREATE INDEX idx_street_districts_year ON public.street_districts(year);