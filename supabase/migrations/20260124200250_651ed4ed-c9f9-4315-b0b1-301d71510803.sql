-- Add kitchen_sent_at column to order_items table
-- This tracks when each item was sent to the kitchen
-- NULL means the item has not been sent yet (PENDING)
-- A timestamp means the item has been sent (SENT)

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS kitchen_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add an index for efficient querying of unsent items
CREATE INDEX IF NOT EXISTS idx_order_items_kitchen_sent_at 
ON public.order_items(order_id, kitchen_sent_at) 
WHERE kitchen_sent_at IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.order_items.kitchen_sent_at IS 'Timestamp when item was sent to kitchen. NULL = pending, timestamp = sent';