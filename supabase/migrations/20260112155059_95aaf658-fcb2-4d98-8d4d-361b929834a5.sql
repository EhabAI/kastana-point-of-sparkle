-- =====================================================
-- INVENTORY MANAGEMENT SYSTEM - Phase 2A
-- Branch-level inventory, ledger-based, no direct stock edits
-- =====================================================

-- 1) inventory_units - Standard and custom units per restaurant
CREATE TABLE IF NOT EXISTS public.inventory_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, name)
);

ALTER TABLE public.inventory_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their inventory units"
  ON public.inventory_units FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their restaurant inventory units"
  ON public.inventory_units FOR SELECT
  USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on inventory_units"
  ON public.inventory_units FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 2) inventory_unit_conversions - Convert between units
CREATE TABLE IF NOT EXISTS public.inventory_unit_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  from_unit_id uuid NOT NULL REFERENCES public.inventory_units(id) ON DELETE CASCADE,
  to_unit_id uuid NOT NULL REFERENCES public.inventory_units(id) ON DELETE CASCADE,
  multiplier numeric NOT NULL CHECK (multiplier > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, from_unit_id, to_unit_id)
);

ALTER TABLE public.inventory_unit_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their unit conversions"
  ON public.inventory_unit_conversions FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their restaurant unit conversions"
  ON public.inventory_unit_conversions FOR SELECT
  USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on inventory_unit_conversions"
  ON public.inventory_unit_conversions FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 3) inventory_items - Track inventory at branch level
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  base_unit_id uuid NOT NULL REFERENCES public.inventory_units(id),
  min_level numeric NOT NULL DEFAULT 0 CHECK (min_level >= 0),
  reorder_point numeric NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(restaurant_id, branch_id, name)
);

ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their inventory items"
  ON public.inventory_items FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their branch inventory items"
  ON public.inventory_items FOR SELECT
  USING (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ));

CREATE POLICY "System admins can do all on inventory_items"
  ON public.inventory_items FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 4) inventory_transactions - LEDGER (immutable audit trail)
CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  txn_type text NOT NULL CHECK (txn_type IN (
    'PURCHASE_RECEIPT', 
    'ADJUSTMENT_IN', 
    'ADJUSTMENT_OUT', 
    'WASTE', 
    'TRANSFER_OUT', 
    'TRANSFER_IN', 
    'STOCK_COUNT_ADJUSTMENT',
    'INITIAL_STOCK'
  )),
  qty numeric NOT NULL CHECK (qty != 0),
  unit_id uuid NOT NULL REFERENCES public.inventory_units(id),
  qty_in_base numeric NOT NULL,
  reference_type text,
  reference_id uuid,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_branch ON public.inventory_transactions(branch_id);
CREATE INDEX idx_inventory_transactions_type ON public.inventory_transactions(txn_type);
CREATE INDEX idx_inventory_transactions_created_at ON public.inventory_transactions(created_at DESC);

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Transactions are read-only for owners (insert via edge function with service role)
CREATE POLICY "Owners can view their inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their branch inventory transactions"
  ON public.inventory_transactions FOR SELECT
  USING (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ));

CREATE POLICY "System admins can do all on inventory_transactions"
  ON public.inventory_transactions FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 5) inventory_stock_levels - CACHE table for current stock
CREATE TABLE IF NOT EXISTS public.inventory_stock_levels (
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  on_hand_base numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id, branch_id, item_id)
);

CREATE INDEX idx_inventory_stock_levels_branch ON public.inventory_stock_levels(branch_id);
CREATE INDEX idx_inventory_stock_levels_low_stock ON public.inventory_stock_levels(on_hand_base);

ALTER TABLE public.inventory_stock_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their stock levels"
  ON public.inventory_stock_levels FOR SELECT
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their branch stock levels"
  ON public.inventory_stock_levels FOR SELECT
  USING (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ));

CREATE POLICY "System admins can do all on inventory_stock_levels"
  ON public.inventory_stock_levels FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 6) suppliers - Track suppliers per restaurant
CREATE TABLE IF NOT EXISTS public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  email text,
  address text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their suppliers"
  ON public.suppliers FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their restaurant suppliers"
  ON public.suppliers FOR SELECT
  USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on suppliers"
  ON public.suppliers FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 7) purchase_receipts - Record incoming purchases
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
  receipt_no text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_receipts_branch ON public.purchase_receipts(branch_id);
CREATE INDEX idx_purchase_receipts_received ON public.purchase_receipts(received_at DESC);

ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their purchase receipts"
  ON public.purchase_receipts FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their branch purchase receipts"
  ON public.purchase_receipts FOR SELECT
  USING (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ));

CREATE POLICY "System admins can do all on purchase_receipts"
  ON public.purchase_receipts FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 8) purchase_receipt_lines - Line items for each receipt
CREATE TABLE IF NOT EXISTS public.purchase_receipt_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  qty numeric NOT NULL CHECK (qty > 0),
  unit_id uuid NOT NULL REFERENCES public.inventory_units(id),
  unit_cost numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_receipt_lines_receipt ON public.purchase_receipt_lines(receipt_id);

ALTER TABLE public.purchase_receipt_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their purchase receipt lines"
  ON public.purchase_receipt_lines FOR ALL
  USING (receipt_id IN (
    SELECT id FROM purchase_receipts WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
  ))
  WITH CHECK (receipt_id IN (
    SELECT id FROM purchase_receipts WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
  ));

CREATE POLICY "Cashiers can view their branch purchase receipt lines"
  ON public.purchase_receipt_lines FOR SELECT
  USING (receipt_id IN (
    SELECT id FROM purchase_receipts WHERE branch_id IN (
      SELECT ur.branch_id FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
    )
  ));

CREATE POLICY "System admins can do all on purchase_receipt_lines"
  ON public.purchase_receipt_lines FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 9) stock_counts - Physical inventory counts
CREATE TABLE IF NOT EXISTS public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED')),
  notes text,
  created_by uuid NOT NULL,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz
);

CREATE INDEX idx_stock_counts_branch ON public.stock_counts(branch_id);
CREATE INDEX idx_stock_counts_status ON public.stock_counts(status);

ALTER TABLE public.stock_counts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their stock counts"
  ON public.stock_counts FOR ALL
  USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their branch stock counts"
  ON public.stock_counts FOR SELECT
  USING (branch_id IN (
    SELECT ur.branch_id FROM user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
  ));

CREATE POLICY "System admins can do all on stock_counts"
  ON public.stock_counts FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- 10) stock_count_lines - Line items for each stock count
CREATE TABLE IF NOT EXISTS public.stock_count_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  expected_base numeric NOT NULL DEFAULT 0,
  actual_base numeric NOT NULL DEFAULT 0,
  variance_base numeric GENERATED ALWAYS AS (actual_base - expected_base) STORED,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_stock_count_lines_count ON public.stock_count_lines(stock_count_id);

ALTER TABLE public.stock_count_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their stock count lines"
  ON public.stock_count_lines FOR ALL
  USING (stock_count_id IN (
    SELECT id FROM stock_counts WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
  ))
  WITH CHECK (stock_count_id IN (
    SELECT id FROM stock_counts WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
  ));

CREATE POLICY "Cashiers can view their branch stock count lines"
  ON public.stock_count_lines FOR SELECT
  USING (stock_count_id IN (
    SELECT id FROM stock_counts WHERE branch_id IN (
      SELECT ur.branch_id FROM user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'cashier'
    )
  ));

CREATE POLICY "System admins can do all on stock_count_lines"
  ON public.stock_count_lines FOR ALL
  USING (has_role(auth.uid(), 'system_admin'))
  WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- Insert default units for new restaurants (triggered on restaurant creation)
CREATE OR REPLACE FUNCTION public.create_default_inventory_units()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_units (restaurant_id, name, symbol) VALUES
    (NEW.id, 'piece', 'pc'),
    (NEW.id, 'kilogram', 'kg'),
    (NEW.id, 'gram', 'g'),
    (NEW.id, 'liter', 'L'),
    (NEW.id, 'milliliter', 'ml'),
    (NEW.id, 'box', 'box'),
    (NEW.id, 'carton', 'ctn'),
    (NEW.id, 'bag', 'bag');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new restaurants
DROP TRIGGER IF EXISTS create_default_units_trigger ON public.restaurants;
CREATE TRIGGER create_default_units_trigger
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_inventory_units();

-- Add audit log actions for inventory
-- (audit_logs table already exists, just ensure the actions work)