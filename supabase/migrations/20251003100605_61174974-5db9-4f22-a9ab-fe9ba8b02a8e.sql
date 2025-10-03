-- Create imprint_data table for storing site imprint information
CREATE TABLE public.imprint_data (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name text NOT NULL DEFAULT 'Schlossstadt.Info',
  first_name text NOT NULL,
  last_name text NOT NULL,
  street text NOT NULL,
  house_number text NOT NULL,
  postal_code text NOT NULL,
  city text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.imprint_data ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Everyone can view imprint data"
  ON public.imprint_data
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage imprint data"
  ON public.imprint_data
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_imprint_data_updated_at
  BEFORE UPDATE ON public.imprint_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial data
INSERT INTO public.imprint_data (
  site_name,
  first_name,
  last_name,
  street,
  house_number,
  postal_code,
  city,
  email,
  phone
) VALUES (
  'Schlossstadt.Info',
  'Volkan',
  'Kayrak',
  'Zur Gabjei',
  '97',
  '50321',
  'Brühl',
  'info@schlossstadt.info',
  '(02232) 7690238'
);