-- Add discount settings columns to restaurant_settings table
ALTER TABLE public.restaurant_settings 
ADD COLUMN IF NOT EXISTS discounts_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS max_discount_value numeric DEFAULT NULL;