-- Add "Sonstiges" category for all neighbor types except help/services
INSERT INTO public.neighbor_categories (name, description, is_for_giving, is_for_lending, is_for_exchange, is_for_help)
VALUES (
  'Sonstiges',
  'Alles, was in keine andere Kategorie passt',
  true,
  true,
  true,
  false
)
ON CONFLICT DO NOTHING;

-- Add "Sonstiges" subcategory
INSERT INTO public.neighbor_subcategories (category_id, name, description, is_for_giving, is_for_lending, is_for_exchange, is_for_help)
SELECT 
  id,
  'Sonstiges',
  'Verschiedenes',
  true,
  true,
  true,
  false
FROM public.neighbor_categories
WHERE name = 'Sonstiges'
ON CONFLICT DO NOTHING;