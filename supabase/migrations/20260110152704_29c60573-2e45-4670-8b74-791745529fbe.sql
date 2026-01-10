-- ═══════════════════════════════════════════════════════════════════════════
-- QR ORDER FLOW: MARKET-GRADE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════
-- This migration fixes RLS policies to ensure:
-- 1. Anonymous users CANNOT insert/update orders or order_items directly
-- 2. Only service_role (Edge Functions) can create QR orders
-- 3. Cashiers can view and update pending QR orders in their branch
-- 4. All policies use proper roles (authenticated, not public)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- DROP EXISTING PROBLEMATIC POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Orders table
DROP POLICY IF EXISTS "Cashiers can confirm or cancel pending QR orders" ON public.orders;

-- Order items table - drop policies that use public role incorrectly
DROP POLICY IF EXISTS "Cashiers can insert order_items" ON public.order_items;
DROP POLICY IF EXISTS "Cashiers can view order_items from their orders" ON public.order_items;

-- ═══════════════════════════════════════════════════════════════════════════
-- ORDERS TABLE: FIXED POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Cashiers can UPDATE pending QR orders to 'open', 'confirmed', or 'cancelled'
-- This is used by the confirm-qr-order edge function (which uses service_role)
-- and allows setting status to 'open' (not just confirmed/cancelled)
CREATE POLICY "Cashiers can update pending QR orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  -- Order must be pending QR order
  status = 'pending'
  AND source = 'qr'
  AND shift_id IS NULL
  -- Cashier must have open shift in same restaurant
  AND EXISTS (
    SELECT 1 FROM shifts s
    JOIN user_roles ur ON ur.user_id = s.cashier_id AND ur.role = 'cashier'
    WHERE s.cashier_id = auth.uid()
    AND s.status = 'open'
    AND s.restaurant_id = orders.restaurant_id
  )
)
WITH CHECK (
  -- Can only update to these statuses
  status IN ('open', 'confirmed', 'cancelled')
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ORDER_ITEMS TABLE: FIXED POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

-- Cashiers can INSERT order_items for orders in their open shift
-- Role must be 'authenticated', not 'public'
CREATE POLICY "Cashiers can insert order_items for their shift"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (
  order_id IN (
    SELECT orders.id
    FROM orders
    WHERE orders.shift_id IN (
      SELECT shifts.id
      FROM shifts
      WHERE shifts.cashier_id = auth.uid()
      AND shifts.status = 'open'
    )
  )
);

-- Cashiers can SELECT order_items from orders in their shift
-- Role must be 'authenticated', not 'public'
CREATE POLICY "Cashiers can view order_items from their shift"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT orders.id
    FROM orders
    WHERE orders.shift_id IN (
      SELECT shifts.id
      FROM shifts
      WHERE shifts.cashier_id = auth.uid()
    )
  )
);

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Ensure RLS is enabled
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;