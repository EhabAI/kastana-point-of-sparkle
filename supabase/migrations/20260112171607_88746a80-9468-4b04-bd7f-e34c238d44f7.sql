-- Phase 2B.3.1: Add Average Cost (Weighted Average) columns

-- 1) Add avg_cost column to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS avg_cost numeric DEFAULT 0;

-- 2) Add unit_cost and total_cost columns to inventory_transactions
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS unit_cost numeric,
ADD COLUMN IF NOT EXISTS total_cost numeric;

-- Add comment for documentation
COMMENT ON COLUMN public.inventory_items.avg_cost IS 'Weighted average cost per base unit, updated on purchase receipts';
COMMENT ON COLUMN public.inventory_transactions.unit_cost IS 'Cost per unit at time of transaction';
COMMENT ON COLUMN public.inventory_transactions.total_cost IS 'Total cost = qty_in_base × unit_cost';