-- Add order_notes column to orders table for customer order-level notes
ALTER TABLE public.orders ADD COLUMN order_notes TEXT NULL;