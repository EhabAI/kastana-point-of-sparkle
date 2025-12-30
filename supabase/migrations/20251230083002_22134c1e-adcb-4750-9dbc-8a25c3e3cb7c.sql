-- Make shift_id nullable for QR orders (which don't have a shift)
ALTER TABLE public.orders ALTER COLUMN shift_id DROP NOT NULL;