-- Insert new info type "NachbarNetz"
INSERT INTO public.info_types (name)
VALUES ('NachbarNetz')
ON CONFLICT DO NOTHING;