-- Add max_branches_allowed column to restaurants table
-- NULL means unlimited, integer is the hard maximum
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS max_branches_allowed integer DEFAULT NULL;