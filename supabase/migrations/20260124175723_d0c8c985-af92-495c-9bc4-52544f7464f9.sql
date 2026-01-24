-- Add notes column to restaurant_subscriptions table
ALTER TABLE public.restaurant_subscriptions 
ADD COLUMN notes text;