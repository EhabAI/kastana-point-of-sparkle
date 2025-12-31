-- Add wallet_enabled column to branch_payment_methods
ALTER TABLE public.branch_payment_methods 
ADD COLUMN wallet_enabled boolean NOT NULL DEFAULT false;