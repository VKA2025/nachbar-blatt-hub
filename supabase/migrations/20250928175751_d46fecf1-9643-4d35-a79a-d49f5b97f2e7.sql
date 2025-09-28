-- Create waste collection schedule table
CREATE TABLE public.waste_collection_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  waste_type TEXT NOT NULL CHECK (waste_type IN ('Restmülltonne', 'Gelber Sack', 'Papiertonne', 'Biotonne')),
  district TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.waste_collection_schedule ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view waste collection schedule" 
ON public.waste_collection_schedule 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage waste collection schedule" 
ON public.waste_collection_schedule 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for timestamps
CREATE TRIGGER update_waste_collection_schedule_updated_at
BEFORE UPDATE ON public.waste_collection_schedule
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_waste_collection_date ON public.waste_collection_schedule(collection_date);
CREATE INDEX idx_waste_collection_district ON public.waste_collection_schedule(district);
CREATE INDEX idx_waste_collection_type ON public.waste_collection_schedule(waste_type);