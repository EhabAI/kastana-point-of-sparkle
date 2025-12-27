-- Add capacity column to restaurant_tables
ALTER TABLE public.restaurant_tables 
ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 4;