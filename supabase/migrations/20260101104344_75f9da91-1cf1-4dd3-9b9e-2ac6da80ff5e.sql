-- Add table_id column to orders table for proper table mapping
ALTER TABLE public.orders 
ADD COLUMN table_id uuid REFERENCES public.restaurant_tables(id);

-- Create index for efficient lookups
CREATE INDEX idx_orders_table_id ON public.orders(table_id) WHERE table_id IS NOT NULL;

-- Backfill existing orders by extracting table_id from notes (one-time migration)
UPDATE public.orders 
SET table_id = (
  CASE 
    WHEN notes ~ 'table:[a-f0-9-]+' 
    THEN (regexp_match(notes, 'table:([a-f0-9-]+)'))[1]::uuid
    ELSE NULL
  END
)
WHERE notes IS NOT NULL AND notes ~ 'table:';

-- Add comment explaining the column
COMMENT ON COLUMN public.orders.table_id IS 'Reference to restaurant_tables for dine-in orders. NULL for takeaway/delivery.';