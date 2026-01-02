-- Add is_favorite column to menu_items table
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false;