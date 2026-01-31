-- Drop existing constraint and add updated one with INITIAL_STOCK_IMPORT
ALTER TABLE public.inventory_transactions 
DROP CONSTRAINT inventory_transactions_txn_type_check;

ALTER TABLE public.inventory_transactions 
ADD CONSTRAINT inventory_transactions_txn_type_check 
CHECK (txn_type = ANY (ARRAY[
  'PURCHASE_RECEIPT'::text, 
  'ADJUSTMENT_IN'::text, 
  'ADJUSTMENT_OUT'::text, 
  'WASTE'::text, 
  'TRANSFER_OUT'::text, 
  'TRANSFER_IN'::text, 
  'STOCK_COUNT_ADJUSTMENT'::text, 
  'INITIAL_STOCK'::text,
  'INITIAL_STOCK_IMPORT'::text
]));