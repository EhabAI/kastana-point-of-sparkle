-- Remove direct UPDATE capability for cashiers on pending QR orders
-- Edge Functions (service role) will handle all status transitions

DROP POLICY IF EXISTS "Cashiers can update pending QR orders" ON public.orders;