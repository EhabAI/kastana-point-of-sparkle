-- Create restaurant_tables table
CREATE TABLE public.restaurant_tables (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  table_code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_tables
-- Owners can manage tables for their own restaurant
CREATE POLICY "Owners can view their restaurant tables"
ON public.restaurant_tables
FOR SELECT
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can create tables for their restaurant"
ON public.restaurant_tables
FOR INSERT
WITH CHECK (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their restaurant tables"
ON public.restaurant_tables
FOR UPDATE
USING (
  restaurant_id IN (
    SELECT id FROM public.restaurants WHERE owner_id = auth.uid()
  )
);

-- System admins can view all tables (read-only)
CREATE POLICY "System admins can view all tables"
ON public.restaurant_tables
FOR SELECT
USING (
  public.has_role(auth.uid(), 'system_admin')
);

-- Create index for faster lookups
CREATE INDEX idx_restaurant_tables_restaurant_id ON public.restaurant_tables(restaurant_id);
CREATE INDEX idx_restaurant_tables_table_code ON public.restaurant_tables(table_code);