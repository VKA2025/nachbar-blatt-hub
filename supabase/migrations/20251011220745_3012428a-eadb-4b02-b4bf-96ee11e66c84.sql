-- Create table for neighbor exchange items/services
CREATE TABLE public.neighbor_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category_id uuid NOT NULL REFERENCES public.neighbor_categories(id) ON DELETE RESTRICT,
  subcategory_id uuid NOT NULL REFERENCES public.neighbor_subcategories(id) ON DELETE RESTRICT,
  photo_url text,
  offer_type text NOT NULL CHECK (offer_type IN ('Verleih', 'Tausch', 'Verschenken', 'Dienstleistung')),
  availability_status text NOT NULL DEFAULT 'verfügbar' CHECK (availability_status IN ('verfügbar', 'reserviert', 'nicht verfügbar')),
  available_from date,
  available_until date,
  duration text,
  is_free boolean,
  exchange_preference text,
  deposit_required numeric(10,2),
  usage_tips text,
  tags text[],
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  deactivated boolean NOT NULL DEFAULT false
);

-- Create index for faster queries
CREATE INDEX idx_neighbor_items_owner ON public.neighbor_items(owner_id);
CREATE INDEX idx_neighbor_items_category ON public.neighbor_items(category_id);
CREATE INDEX idx_neighbor_items_subcategory ON public.neighbor_items(subcategory_id);
CREATE INDEX idx_neighbor_items_offer_type ON public.neighbor_items(offer_type);
CREATE INDEX idx_neighbor_items_tags ON public.neighbor_items USING gin(tags);

-- Enable RLS
ALTER TABLE public.neighbor_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view active, non-deactivated items
CREATE POLICY "Everyone can view active items"
ON public.neighbor_items
FOR SELECT
USING (deactivated = false);

-- Users can view their own items (including deactivated ones)
CREATE POLICY "Users can view their own items"
ON public.neighbor_items
FOR SELECT
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));

-- Users can insert their own items
CREATE POLICY "Users can create their own items"
ON public.neighbor_items
FOR INSERT
WITH CHECK (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));

-- Users can update their own items
CREATE POLICY "Users can update their own items"
ON public.neighbor_items
FOR UPDATE
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));

-- Users can delete their own items
CREATE POLICY "Users can delete their own items"
ON public.neighbor_items
FOR DELETE
USING (auth.uid() = (SELECT user_id FROM public.profiles WHERE id = owner_id));

-- Admins can manage all items
CREATE POLICY "Admins can manage all items"
ON public.neighbor_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for automatic updated_at timestamp
CREATE TRIGGER update_neighbor_items_updated_at
BEFORE UPDATE ON public.neighbor_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();