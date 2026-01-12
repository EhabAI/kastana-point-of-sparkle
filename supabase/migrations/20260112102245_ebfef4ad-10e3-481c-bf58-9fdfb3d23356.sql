-- FINAL HARDENING: QR pending must be Edge-only (no direct UPDATE by cashier)
DROP POLICY IF EXISTS "Cashiers can update pending QR orders" ON public.orders;

-- Keep SELECT policy (cashiers can view pending QR orders) as-is.
-- Ensure Edge Functions (service role) handle confirm/reject/open transitions.