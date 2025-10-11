-- Create table for neighbor item transactions
CREATE TABLE public.neighbor_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.neighbor_items(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'offen' CHECK (status IN ('offen', 'angenommen', 'abgelehnt', 'abgeschlossen')),
  start_date date,
  end_date date,
  notes text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_neighbor_transactions_item ON public.neighbor_transactions(item_id);
CREATE INDEX idx_neighbor_transactions_requester ON public.neighbor_transactions(requester_id);
CREATE INDEX idx_neighbor_transactions_status ON public.neighbor_transactions(status);

-- Enable RLS
ALTER TABLE public.neighbor_transactions ENABLE ROW LEVEL SECURITY;

-- Item owners can view transactions for their items
CREATE POLICY "Item owners can view transactions for their items"
ON public.neighbor_transactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.neighbor_items
    WHERE neighbor_items.id = neighbor_transactions.item_id
    AND neighbor_items.owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Requesters can view their own transactions
CREATE POLICY "Requesters can view their own transactions"
ON public.neighbor_transactions
FOR SELECT
USING (
  requester_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Authenticated users can create transaction requests
CREATE POLICY "Users can create transaction requests"
ON public.neighbor_transactions
FOR INSERT
WITH CHECK (
  requester_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Item owners can update transactions for their items
CREATE POLICY "Item owners can update transactions"
ON public.neighbor_transactions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.neighbor_items
    WHERE neighbor_items.id = neighbor_transactions.item_id
    AND neighbor_items.owner_id IN (
      SELECT id FROM public.profiles WHERE user_id = auth.uid()
    )
  )
);

-- Requesters can update their own transactions (e.g., cancel request)
CREATE POLICY "Requesters can update their own transactions"
ON public.neighbor_transactions
FOR UPDATE
USING (
  requester_id IN (
    SELECT id FROM public.profiles WHERE user_id = auth.uid()
  )
);

-- Admins can manage all transactions
CREATE POLICY "Admins can manage all transactions"
ON public.neighbor_transactions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));