-- Add missing subcategories to Garten & Außenbereich
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Rasenmäher & Trimmer',
  'Rasenmäher und Trimmer',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Garten & Außenbereich'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Gartenwerkzeug',
  'Werkzeuge für den Garten',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Garten & Außenbereich'
ON CONFLICT DO NOTHING;

-- Add missing subcategories to Haushaltsgeräte
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Reinigungsgeräte',
  'Geräte für Reinigung',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Haushaltsgeräte'
ON CONFLICT DO NOTHING;

INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Möbelstücke',
  'Verschiedene Möbel',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Haushaltsgeräte'
ON CONFLICT DO NOTHING;

-- Add subcategory for Mobilität (if it exists, otherwise skip)
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Fahrrad & Transporthilfe',
  'Fahrräder und Transportmittel',
  true, true, true, false
FROM public.neighbor_categories WHERE name LIKE '%obil%'
ON CONFLICT DO NOTHING;

-- Add missing subcategories to Bücher & Medien
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Spiele & Bücher',
  'Spiele und Bücher',
  true, true, true, false
FROM public.neighbor_categories WHERE name = 'Bücher & Medien'
ON CONFLICT DO NOTHING;

-- Add subcategory for Kleidung (if it exists)
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_lending, is_for_exchange, is_for_giving, is_for_help)
SELECT 
  id,
  'Kleidertausch',
  'Kleidung zum Tauschen oder Verschenken',
  false, true, true, false
FROM public.neighbor_categories WHERE name LIKE '%leid%'
ON CONFLICT DO NOTHING;