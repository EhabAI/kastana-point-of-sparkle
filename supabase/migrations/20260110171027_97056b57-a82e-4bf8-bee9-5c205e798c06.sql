-- ═══════════════════════════════════════════════════════════════════════════════
-- RESTAURANT KILL-SWITCH: is_active column, helper function, and RLS hardening
-- ═══════════════════════════════════════════════════════════════════════════════

-- A) ADD is_active COLUMN TO restaurants TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1) Add the column with default true
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- 2) Backfill existing rows (already true by default, but explicit)
UPDATE public.restaurants SET is_active = true WHERE is_active IS NULL;

-- 3) Create index for performance
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON public.restaurants(is_active);

-- ═══════════════════════════════════════════════════════════════════════════════
-- B) CENTRAL ENFORCEMENT: SECURITY DEFINER function to check restaurant active status
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_restaurant_active(p_restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.restaurants WHERE id = p_restaurant_id),
    false
  );
$$;

-- Helper: get restaurant_id from branch_id (for tables that only have branch_id)
CREATE OR REPLACE FUNCTION public.get_restaurant_id_from_branch(p_branch_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id FROM public.restaurant_branches WHERE id = p_branch_id LIMIT 1;
$$;

-- Helper: check if branch's restaurant is active
CREATE OR REPLACE FUNCTION public.is_branch_restaurant_active(p_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT r.is_active 
     FROM public.restaurants r 
     JOIN public.restaurant_branches rb ON rb.restaurant_id = r.id 
     WHERE rb.id = p_branch_id),
    false
  );
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- C) RLS POLICY HARDENING: Add is_restaurant_active check to all operational tables
-- ═══════════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────────
-- ORDERS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

-- Drop and recreate policies for orders to add active check
DROP POLICY IF EXISTS "Cashiers can insert orders for their open shift" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can update orders for their open shift" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can view orders for their open shift" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can update pending QR orders" ON public.orders;
DROP POLICY IF EXISTS "Cashiers can view pending QR orders in their restaurant" ON public.orders;
DROP POLICY IF EXISTS "Owners can view their restaurant orders" ON public.orders;

CREATE POLICY "Cashiers can insert orders for their open shift" 
ON public.orders FOR INSERT 
WITH CHECK (
  (shift_id IS NOT NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.id = orders.shift_id 
      AND s.restaurant_id = orders.restaurant_id
  ))
);

CREATE POLICY "Cashiers can update orders for their open shift" 
ON public.orders FOR UPDATE 
USING (
  (shift_id IS NOT NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.id = orders.shift_id 
      AND s.restaurant_id = orders.restaurant_id
  ))
)
WITH CHECK (
  (shift_id IS NOT NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.id = orders.shift_id 
      AND s.restaurant_id = orders.restaurant_id
  ))
);

CREATE POLICY "Cashiers can view orders for their open shift" 
ON public.orders FOR SELECT 
USING (
  (shift_id IS NOT NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.id = orders.shift_id 
      AND s.restaurant_id = orders.restaurant_id
  ))
);

CREATE POLICY "Cashiers can update pending QR orders" 
ON public.orders FOR UPDATE 
USING (
  (status = 'pending') 
  AND (source = 'qr') 
  AND (shift_id IS NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    JOIN user_roles ur ON ur.user_id = s.cashier_id AND ur.role = 'cashier'
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.restaurant_id = orders.restaurant_id
  ))
)
WITH CHECK (status = ANY (ARRAY['open', 'confirmed', 'cancelled']));

CREATE POLICY "Cashiers can view pending QR orders in their restaurant" 
ON public.orders FOR SELECT 
USING (
  (status = 'pending') 
  AND (shift_id IS NULL) 
  AND is_restaurant_active(restaurant_id)
  AND (EXISTS (
    SELECT 1 FROM shifts s
    WHERE s.cashier_id = auth.uid() 
      AND s.status = 'open' 
      AND s.restaurant_id = orders.restaurant_id
  ))
);

CREATE POLICY "Owners can view their restaurant orders" 
ON public.orders FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- ORDER_ITEMS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can insert order_items for their shift" ON public.order_items;
DROP POLICY IF EXISTS "Cashiers can update order_items" ON public.order_items;
DROP POLICY IF EXISTS "Cashiers can view order items from pending QR orders" ON public.order_items;
DROP POLICY IF EXISTS "Cashiers can view order_items from their shift" ON public.order_items;
DROP POLICY IF EXISTS "Owners can view their restaurant order_items" ON public.order_items;

CREATE POLICY "Cashiers can insert order_items for their shift" 
ON public.order_items FOR INSERT 
WITH CHECK (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s
      WHERE s.cashier_id = auth.uid() AND s.status = 'open'
    )
  ))
);

CREATE POLICY "Cashiers can update order_items" 
ON public.order_items FOR UPDATE 
USING (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Cashiers can view order items from pending QR orders" 
ON public.order_items FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.status = 'pending' 
      AND o.shift_id IS NULL 
      AND (EXISTS (
        SELECT 1 FROM shifts s
        WHERE s.cashier_id = auth.uid() 
          AND s.status = 'open' 
          AND s.restaurant_id = o.restaurant_id
      ))
  ))
);

CREATE POLICY "Cashiers can view order_items from their shift" 
ON public.order_items FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Owners can view their restaurant order_items" 
ON public.order_items FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- PAYMENTS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Cashiers can view payments from their orders" ON public.payments;
DROP POLICY IF EXISTS "Owners can view their restaurant payments" ON public.payments;

CREATE POLICY "Cashiers can insert payments" 
ON public.payments FOR INSERT 
WITH CHECK (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Cashiers can view payments from their orders" 
ON public.payments FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Owners can view their restaurant payments" 
ON public.payments FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- REFUNDS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can insert refunds" ON public.refunds;
DROP POLICY IF EXISTS "Cashiers can view refunds from their orders" ON public.refunds;
DROP POLICY IF EXISTS "Owners can view their restaurant refunds" ON public.refunds;

CREATE POLICY "Cashiers can insert refunds" 
ON public.refunds FOR INSERT 
WITH CHECK (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Cashiers can view refunds from their orders" 
ON public.refunds FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (order_id IN (
    SELECT o.id FROM orders o
    WHERE o.shift_id IN (
      SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
    )
  ))
);

CREATE POLICY "Owners can view their restaurant refunds" 
ON public.refunds FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- SHIFTS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can insert their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Cashiers can update their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Cashiers can view their own shifts" ON public.shifts;
DROP POLICY IF EXISTS "Owners can view their restaurant shifts" ON public.shifts;

CREATE POLICY "Cashiers can insert their own shifts" 
ON public.shifts FOR INSERT 
WITH CHECK (
  (cashier_id = auth.uid()) 
  AND has_role(auth.uid(), 'cashier')
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Cashiers can update their own shifts" 
ON public.shifts FOR UPDATE 
USING (
  (cashier_id = auth.uid()) 
  AND has_role(auth.uid(), 'cashier')
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Cashiers can view their own shifts" 
ON public.shifts FOR SELECT 
USING (
  (cashier_id = auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can view their restaurant shifts" 
ON public.shifts FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- SHIFT_TRANSACTIONS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can insert shift transactions" ON public.shift_transactions;
DROP POLICY IF EXISTS "Cashiers can view their shift transactions" ON public.shift_transactions;
DROP POLICY IF EXISTS "Owners can view their restaurant shift_transactions" ON public.shift_transactions;

CREATE POLICY "Cashiers can insert shift transactions" 
ON public.shift_transactions FOR INSERT 
WITH CHECK (
  is_restaurant_active(restaurant_id)
  AND (shift_id IN (
    SELECT s.id FROM shifts s
    WHERE s.cashier_id = auth.uid() AND s.status = 'open'
  ))
);

CREATE POLICY "Cashiers can view their shift transactions" 
ON public.shift_transactions FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (shift_id IN (
    SELECT s.id FROM shifts s WHERE s.cashier_id = auth.uid()
  ))
);

CREATE POLICY "Owners can view their restaurant shift_transactions" 
ON public.shift_transactions FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- RESTAURANT_TABLES TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can view their branch tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can view their restaurant tables" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can create tables for their restaurant" ON public.restaurant_tables;
DROP POLICY IF EXISTS "Owners can update their restaurant tables" ON public.restaurant_tables;

CREATE POLICY "Cashiers can view their branch tables" 
ON public.restaurant_tables FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ))
);

CREATE POLICY "Owners can view their restaurant tables" 
ON public.restaurant_tables FOR SELECT 
USING (
  is_restaurant_active(restaurant_id)
  AND (restaurant_id IN (
    SELECT r.id FROM restaurants r WHERE r.owner_id = auth.uid()
  ))
);

CREATE POLICY "Owners can create tables for their restaurant" 
ON public.restaurant_tables FOR INSERT 
WITH CHECK (
  is_restaurant_active(restaurant_id)
  AND (restaurant_id IN (
    SELECT r.id FROM restaurants r WHERE r.owner_id = auth.uid()
  ))
);

CREATE POLICY "Owners can update their restaurant tables" 
ON public.restaurant_tables FOR UPDATE 
USING (
  is_restaurant_active(restaurant_id)
  AND (restaurant_id IN (
    SELECT r.id FROM restaurants r WHERE r.owner_id = auth.uid()
  ))
);

-- ───────────────────────────────────────────────────────────────────────────────
-- MENU_CATEGORIES TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can view their restaurant categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners can view their restaurant categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners can insert categories to their restaurant" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners can update their restaurant categories" ON public.menu_categories;
DROP POLICY IF EXISTS "Owners can delete their restaurant categories" ON public.menu_categories;

CREATE POLICY "Cashiers can view their restaurant categories" 
ON public.menu_categories FOR SELECT 
USING (
  restaurant_id = get_cashier_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can view their restaurant categories" 
ON public.menu_categories FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can insert categories to their restaurant" 
ON public.menu_categories FOR INSERT 
WITH CHECK (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can update their restaurant categories" 
ON public.menu_categories FOR UPDATE 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can delete their restaurant categories" 
ON public.menu_categories FOR DELETE 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

-- ───────────────────────────────────────────────────────────────────────────────
-- MENU_ITEMS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can view their restaurant menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can view their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can insert menu items to their categories" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can update their menu items" ON public.menu_items;
DROP POLICY IF EXISTS "Owners can delete their menu items" ON public.menu_items;

CREATE POLICY "Cashiers can view their restaurant menu items" 
ON public.menu_items FOR SELECT 
USING (
  (category_id IN (
    SELECT mc.id FROM menu_categories mc
    WHERE mc.restaurant_id = get_cashier_restaurant_id(auth.uid())
      AND is_restaurant_active(mc.restaurant_id)
  ))
);

CREATE POLICY "Owners can view their menu items" 
ON public.menu_items FOR SELECT 
USING (
  (category_id IN (
    SELECT mc.id FROM menu_categories mc
    WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
      AND is_restaurant_active(mc.restaurant_id)
  ))
);

CREATE POLICY "Owners can insert menu items to their categories" 
ON public.menu_items FOR INSERT 
WITH CHECK (
  (category_id IN (
    SELECT mc.id FROM menu_categories mc
    WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
      AND is_restaurant_active(mc.restaurant_id)
  ))
);

CREATE POLICY "Owners can update their menu items" 
ON public.menu_items FOR UPDATE 
USING (
  (category_id IN (
    SELECT mc.id FROM menu_categories mc
    WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
      AND is_restaurant_active(mc.restaurant_id)
  ))
);

CREATE POLICY "Owners can delete their menu items" 
ON public.menu_items FOR DELETE 
USING (
  (category_id IN (
    SELECT mc.id FROM menu_categories mc
    WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
      AND is_restaurant_active(mc.restaurant_id)
  ))
);

-- ───────────────────────────────────────────────────────────────────────────────
-- RESTAURANT_SETTINGS TABLE
-- ───────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Cashiers can view their restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Owners can view their restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Owners can insert their restaurant settings" ON public.restaurant_settings;
DROP POLICY IF EXISTS "Owners can update their restaurant settings" ON public.restaurant_settings;

CREATE POLICY "Cashiers can view their restaurant settings" 
ON public.restaurant_settings FOR SELECT 
USING (
  restaurant_id = get_cashier_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can view their restaurant settings" 
ON public.restaurant_settings FOR SELECT 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can insert their restaurant settings" 
ON public.restaurant_settings FOR INSERT 
WITH CHECK (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);

CREATE POLICY "Owners can update their restaurant settings" 
ON public.restaurant_settings FOR UPDATE 
USING (
  restaurant_id = get_owner_restaurant_id(auth.uid())
  AND is_restaurant_active(restaurant_id)
);