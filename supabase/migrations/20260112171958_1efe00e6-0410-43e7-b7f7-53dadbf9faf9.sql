-- Phase 2B.3.2: Add COGS and Profit columns to order_items

-- Add cogs and profit columns to order_items
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS cogs numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit numeric DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN public.order_items.cogs IS 'Cost of Goods Sold - snapshot of ingredient costs at time of payment';
COMMENT ON COLUMN public.order_items.profit IS 'Profit = total_price - cogs, calculated at time of payment';