-- ============================================================
-- FIX RLS POLICIES ON public.orders
-- Remove unsafe public role grants, replace with authenticated
-- ============================================================

-- A) DROP UNSAFE POLICIES (granted to public role)
DROP POLICY IF EXISTS "Cashiers can insert orders in their open shift" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can update orders in their shifts" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can view orders from their shifts" ON public.orders;

-- B) DROP AND RECREATE QR PENDING POLICIES (to ensure correct shift_id IS NULL check)
DROP POLICY IF EXISTS "Cashiers can view pending QR orders in their restaurant" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can confirm or cancel pending QR orders" ON public.orders;

-- ============================================================
-- C) CREATE SAFE CASHIER POLICIES (authenticated only)
-- ============================================================

-- 1) Cashier SELECT orders for their open shift (normal POS flow)
CREATE POLICY "Cashiers can view orders for their open shift"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  orders.shift_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.id = orders.shift_id
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- 2) Cashier INSERT orders for their open shift (POS created orders only)
CREATE POLICY "Cashiers can insert orders for their open shift"
ON public.orders
AS PERMISSIVE
FOR INSERT
TO authenticated
WITH CHECK (
  orders.shift_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.id = orders.shift_id
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- 3) Cashier UPDATE orders for their open shift (normal POS updates)
CREATE POLICY "Cashiers can update orders for their open shift"
ON public.orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  orders.shift_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.id = orders.shift_id
      AND s.restaurant_id = orders.restaurant_id
  )
)
WITH CHECK (
  orders.shift_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.id = orders.shift_id
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- ============================================================
-- D) QR PENDING POLICIES (shift_id = NULL flow)
-- ============================================================

-- 4) View pending QR orders in cashier's restaurant
CREATE POLICY "Cashiers can view pending QR orders in their restaurant"
ON public.orders
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (
  status = 'pending'
  AND orders.shift_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- 5) Confirm/Reject pending QR orders (pending -> confirmed/cancelled only)
CREATE POLICY "Cashiers can confirm or cancel pending QR orders"
ON public.orders
AS PERMISSIVE
FOR UPDATE
TO authenticated
USING (
  status = 'pending'
  AND orders.shift_id IS NULL
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
)
WITH CHECK (
  status IN ('confirmed', 'cancelled')
);