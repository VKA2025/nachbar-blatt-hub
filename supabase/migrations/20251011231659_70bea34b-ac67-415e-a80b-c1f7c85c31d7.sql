-- Add subcategories with their correct parent categories

-- Werkzeuge & Maschinen subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Werkzeuge',
  'Verschiedene Werkzeuge',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Werkzeuge & Maschinen'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Maschinen',
  'Verschiedene Maschinen',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Werkzeuge & Maschinen'
ON CONFLICT DO NOTHING;

-- Garten subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Rasenmäher & Trimmer',
  'Rasenmäher und Trimmer',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Garten'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Gartenwerkzeug',
  'Werkzeuge für den Garten',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Garten'
ON CONFLICT DO NOTHING;

-- Haushalt subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Reinigungsgeräte',
  'Geräte für Reinigung',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Haushalt'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Möbelstücke',
  'Verschiedene Möbel',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Haushalt'
ON CONFLICT DO NOTHING;

-- Mobilität subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Fahrrad & Transporthilfe',
  'Fahrräder und Transportmittel',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Mobilität'
ON CONFLICT DO NOTHING;

-- Freizeit & Unterhaltung subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Spiele & Bücher',
  'Spiele und Bücher',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Freizeit & Unterhaltung'
ON CONFLICT DO NOTHING;

-- Kleidung & Textilien subcategories
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Kleidertausch',
  'Kleidung zum Tauschen oder Verschenken',
  false, true, true, false
FROM public.neighbor_categories WHERE name = 'Kleidung & Textilien'
ON CONFLICT DO NOTHING;

-- Dienstleistungen subcategories (help only)
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Einkaufshilfe',
  'Hilfe beim Einkaufen',
  false, false, false, true
FROM public.neighbor_categories WHERE name = 'Dienstleistungen'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Arztbegleitung',
  'Begleitung zum Arzt',
  false, false, false, true
FROM public.neighbor_categories WHERE name = 'Dienstleistungen'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Rasenmähen helfen',
  'Hilfe beim Rasenmähen',
  false, false, false, true
FROM public.neighbor_categories WHERE name = 'Dienstleistungen'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Gesellschaft leisten',
  'Gesellschaft und Unterhaltung',
  false, false, false, true
FROM public.neighbor_categories WHERE name = 'Dienstleistungen'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Umzugshilfe',
  'Hilfe beim Umzug',
  false, false, false, true
FROM public.neighbor_categories WHERE name = 'Dienstleistungen'
ON CONFLICT DO NOTHING;