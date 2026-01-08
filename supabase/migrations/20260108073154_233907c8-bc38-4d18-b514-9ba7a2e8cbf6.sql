-- Drop the existing UPDATE policy for pending QR orders (has incorrect WITH CHECK logic)
DROP POLICY IF EXISTS "Cashiers can update pending QR orders in their restaurant" ON public.orders;

-- Create the correct UPDATE policy that allows status transitions from pending to confirmed/cancelled
CREATE POLICY "Cashiers can confirm or cancel pending QR orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  -- Can only update orders that are currently pending AND belong to cashier's restaurant
  status = 'pending'
  AND EXISTS (
    SELECT 1
    FROM public.shifts s
    WHERE s.cashier_id = auth.uid()
      AND s.status = 'open'
      AND s.restaurant_id = orders.restaurant_id
  )
)
WITH CHECK (
  -- Only allow setting status to confirmed or cancelled
  status IN ('confirmed', 'cancelled')
);