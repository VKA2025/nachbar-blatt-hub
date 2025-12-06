-- Tabelle für Button-Klick-Tracking
CREATE TABLE public.flyer_button_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  flyer_title text NOT NULL,
  info_type text,
  button_name text NOT NULL,
  user_email text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS aktivieren
ALTER TABLE public.flyer_button_clicks ENABLE ROW LEVEL SECURITY;

-- Jeder eingeloggte Nutzer kann Klicks einfügen
CREATE POLICY "Authenticated users can insert clicks"
ON public.flyer_button_clicks
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Admins können alle Klicks sehen
CREATE POLICY "Admins can view all clicks"
ON public.flyer_button_clicks
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Index für schnelle Abfragen
CREATE INDEX flyer_button_clicks_created_at_idx ON public.flyer_button_clicks (created_at DESC);
CREATE INDEX flyer_button_clicks_flyer_title_idx ON public.flyer_button_clicks (flyer_title);