-- Update subcategories to belong to "Garten & Aussenbereich" instead of "Garten"
UPDATE public.neighbor_subcategories
SET category_id = (SELECT id FROM public.neighbor_categories WHERE name = 'Garten & Aussenbereich')
WHERE name IN ('Rasenmäher & Trimmer', 'Gartenwerkzeug');