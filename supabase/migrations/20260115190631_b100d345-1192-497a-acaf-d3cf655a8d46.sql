-- Drop the existing status check constraint
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new status check constraint that includes KDS statuses
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('open', 'confirmed', 'held', 'paid', 'cancelled', 'voided', 'refunded', 'closed', 'pending', 'new', 'in_progress', 'ready'));