-- A) DATABASE MIGRATION for QR Order Flow Security

-- 1) Fix orders.status constraint to allow all actual statuses used in code
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'confirmed', 'open', 'held', 'paid', 'refunded', 'voided', 'closed', 'cancelled'));

-- 2) Add missing columns to orders: customer_phone and source
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'pos';
ALTER TABLE public.orders ADD CONSTRAINT orders_source_check CHECK (source IN ('pos', 'qr'));

-- 3) REMOVE the dangerous anon policy from order_items
DROP POLICY IF EXISTS "Public can insert order items" ON public.order_items;

-- 4) RLS policies for cashiers to see/update pending QR orders (shift_id NULL but same restaurant)

-- Policy for SELECT: Cashiers with open shift can see pending orders in their restaurant
CREATE POLICY "Cashiers can view pending QR orders in their restaurant"
ON public.orders
FOR SELECT
TO authenticated
USING (
  status = 'pending' 
  AND shift_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- Policy for UPDATE: Cashiers can confirm/cancel pending QR orders
CREATE POLICY "Cashiers can update pending QR orders in their restaurant"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  status = 'pending' 
  AND shift_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
);

-- Policy for SELECT order_items: Cashiers can view items from pending QR orders
CREATE POLICY "Cashiers can view order items from pending QR orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.orders o
    WHERE o.status = 'pending' 
      AND o.shift_id IS NULL 
      AND EXISTS (
        SELECT 1 FROM public.shifts s
        WHERE s.cashier_id = auth.uid()
          AND s.status = 'open'
          AND s.restaurant_id = o.restaurant_id
      )
  )
);