-- Enable RLS (safe if already enabled)
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- Allow cashiers to DELETE order_items on their currently OPEN order (POS flow)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'order_items'
      AND policyname = 'Cashiers can delete order_items for their open shift'
  ) THEN
    CREATE POLICY "Cashiers can delete order_items for their open shift"
    ON public.order_items
    FOR DELETE
    USING (
      is_restaurant_active(restaurant_id)
      AND EXISTS (
        SELECT 1
        FROM public.orders o
        JOIN public.shifts s ON s.id = o.shift_id
        WHERE o.id = order_items.order_id
          AND o.status = 'open'
          AND s.cashier_id = auth.uid()
          AND s.status = 'open'
      )
    );
  END IF;
END $$;

-- Allow cashiers to DELETE modifiers that belong to items on their currently OPEN order
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public'
      AND tablename = 'order_item_modifiers'
      AND policyname = 'Cashiers can delete order_item_modifiers for their open shift'
  ) THEN
    CREATE POLICY "Cashiers can delete order_item_modifiers for their open shift"
    ON public.order_item_modifiers
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1
        FROM public.order_items oi
        JOIN public.orders o ON o.id = oi.order_id
        JOIN public.shifts s ON s.id = o.shift_id
        WHERE oi.id = order_item_modifiers.order_item_id
          AND o.status = 'open'
          AND s.cashier_id = auth.uid()
          AND s.status = 'open'
      )
    );
  END IF;
END $$;