-- Add approval field to neighbor_items table
ALTER TABLE public.neighbor_items 
ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Add comment to explain the field
COMMENT ON COLUMN public.neighbor_items.is_approved IS 'Indicates whether the item has been approved by an admin';