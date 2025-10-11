-- Create storage bucket for neighbor item photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('neighbor-photos', 'neighbor-photos', true);

-- Create policies for neighbor item photos
CREATE POLICY "Anyone can view neighbor photos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'neighbor-photos');

CREATE POLICY "Authenticated users can upload neighbor photos"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'neighbor-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own neighbor photos"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'neighbor-photos' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Users can delete their own neighbor photos"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'neighbor-photos' 
  AND auth.role() = 'authenticated'
);