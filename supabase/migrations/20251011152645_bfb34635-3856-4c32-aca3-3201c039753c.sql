-- Create table for neighbor exchange subcategories
CREATE TABLE public.neighbor_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.neighbor_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_for_lending boolean NOT NULL DEFAULT false,
  is_for_exchange boolean NOT NULL DEFAULT false,
  is_for_giving boolean NOT NULL DEFAULT false,
  is_for_help boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.neighbor_subcategories ENABLE ROW LEVEL SECURITY;

-- Everyone can view subcategories
CREATE POLICY "Everyone can view neighbor subcategories"
ON public.neighbor_subcategories
FOR SELECT
USING (true);

-- Only admins can manage subcategories
CREATE POLICY "Admins can manage neighbor subcategories"
ON public.neighbor_subcategories
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert example subcategories
-- First, get the category IDs (we'll reference them by name)
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Rasenmäher',
  'Benzin- oder Elektro-Rasenmäher',
  true,
  false,
  false,
  false
FROM public.neighbor_categories nc WHERE nc.name = 'Garten & Außenbereich';

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Gartengeräte',
  'Spaten, Harken, Scheren',
  true,
  true,
  true,
  false
FROM public.neighbor_categories nc WHERE nc.name = 'Garten & Außenbereich';

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Rasenmähen',
  'Gartenpflege oder regelmäßiges Mähen',
  false,
  false,
  false,
  true
FROM public.neighbor_categories nc WHERE nc.name = 'Garten & Außenbereich';

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Bohrmaschine',
  'Akkubohrer, Schlagbohrmaschine',
  true,
  true,
  false,
  false
FROM public.neighbor_categories nc WHERE nc.name = 'Werkzeuge & Maschinen';

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Leiter',
  'Steh- oder Klappleiter',
  true,
  false,
  false,
  false
FROM public.neighbor_categories nc WHERE nc.name = 'Werkzeuge & Maschinen';

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  nc.id,
  'Handwerkliche Hilfe',
  'Kleine Reparaturen, Möbelaufbau',
  false,
  false,
  false,
  true
FROM public.neighbor_categories nc WHERE nc.name = 'Dienstleistungen';