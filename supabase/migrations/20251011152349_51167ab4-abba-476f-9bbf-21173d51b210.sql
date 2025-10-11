-- Create table for neighbor exchange categories
CREATE TABLE public.neighbor_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_for_lending boolean NOT NULL DEFAULT false,
  is_for_exchange boolean NOT NULL DEFAULT false,
  is_for_giving boolean NOT NULL DEFAULT false,
  is_for_help boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.neighbor_categories ENABLE ROW LEVEL SECURITY;

-- Everyone can view categories
CREATE POLICY "Everyone can view neighbor categories"
ON public.neighbor_categories
FOR SELECT
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can manage neighbor categories"
ON public.neighbor_categories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert some example categories
INSERT INTO public.neighbor_categories (name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help) VALUES
('Garten & Außenbereich', 'Alles rund um Garten, Pflanzen und Werkzeuge', true, true, true, true),
('Werkzeuge & Maschinen', 'Bohrmaschinen, Sägen, Leitern und mehr', true, true, true, false),
('Haushaltsgeräte', 'Küchengeräte, Reinigungsgeräte', true, true, true, false),
('Kinderartikel', 'Spielzeug, Kinderwagen, Kleidung', false, true, true, false),
('Bücher & Medien', 'Bücher, DVDs, Spiele', false, true, true, false),
('Dienstleistungen', 'Hilfe im Haushalt, Garten, Handwerk', false, false, false, true);