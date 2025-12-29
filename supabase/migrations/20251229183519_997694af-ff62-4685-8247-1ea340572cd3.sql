-- ========================
-- 1) RESTAURANT BRANCHES TABLE
-- ========================
CREATE TABLE public.restaurant_branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    address text,
    phone text,
    is_active boolean NOT NULL DEFAULT true,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (restaurant_id, name)
);

-- Partial unique index: only one default branch per restaurant
CREATE UNIQUE INDEX idx_one_default_branch_per_restaurant 
ON public.restaurant_branches (restaurant_id) 
WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.restaurant_branches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for restaurant_branches
CREATE POLICY "Owners can view their restaurant branches"
ON public.restaurant_branches FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can insert branches to their restaurant"
ON public.restaurant_branches FOR INSERT
WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can update their restaurant branches"
ON public.restaurant_branches FOR UPDATE
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can delete their restaurant branches"
ON public.restaurant_branches FOR DELETE
USING (restaurant_id = get_owner_restaurant_id(auth.uid()) AND is_default = false);

CREATE POLICY "Cashiers can view their restaurant branches"
ON public.restaurant_branches FOR SELECT
USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on branches"
ON public.restaurant_branches FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Public can view active branches"
ON public.restaurant_branches FOR SELECT
USING (is_active = true);

-- ========================
-- 2) BRANCH MENU ITEMS (OVERRIDES)
-- ========================
CREATE TABLE public.branch_menu_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
    menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    price numeric(10,3),
    is_available boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    promo_price numeric(10,3),
    promo_label text,
    promo_start timestamptz,
    promo_end timestamptz,
    sort_order integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (branch_id, menu_item_id)
);

ALTER TABLE public.branch_menu_items ENABLE ROW LEVEL SECURITY;

-- RLS for branch_menu_items
CREATE POLICY "Owners can view their branch menu items"
ON public.branch_menu_items FOR SELECT
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
));

CREATE POLICY "Owners can insert branch menu items"
ON public.branch_menu_items FOR INSERT
WITH CHECK (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
));

CREATE POLICY "Owners can update branch menu items"
ON public.branch_menu_items FOR UPDATE
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
));

CREATE POLICY "Owners can delete branch menu items"
ON public.branch_menu_items FOR DELETE
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
));

CREATE POLICY "Cashiers can view their branch menu items"
ON public.branch_menu_items FOR SELECT
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_cashier_restaurant_id(auth.uid())
));

CREATE POLICY "System admins can do all on branch_menu_items"
ON public.branch_menu_items FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Public can view active available branch items"
ON public.branch_menu_items FOR SELECT
USING (
    is_active = true 
    AND is_available = true 
    AND branch_id IN (SELECT id FROM public.restaurant_branches WHERE is_active = true)
);

-- ========================
-- 3) BRANCH MENU CATEGORIES
-- ========================
CREATE TABLE public.branch_menu_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.restaurant_branches(id) ON DELETE CASCADE,
    category_id uuid NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
    is_active boolean NOT NULL DEFAULT true,
    sort_order integer,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (branch_id, category_id)
);

ALTER TABLE public.branch_menu_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their branch categories"
ON public.branch_menu_categories FOR ALL
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
))
WITH CHECK (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
));

CREATE POLICY "Cashiers can view their branch categories"
ON public.branch_menu_categories FOR SELECT
USING (branch_id IN (
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = get_cashier_restaurant_id(auth.uid())
));

CREATE POLICY "System admins can do all on branch_menu_categories"
ON public.branch_menu_categories FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Public can view active branch categories"
ON public.branch_menu_categories FOR SELECT
USING (
    is_active = true 
    AND branch_id IN (SELECT id FROM public.restaurant_branches WHERE is_active = true)
);

-- ========================
-- 4) ADD branch_id TO OPERATIONAL TABLES
-- ========================

-- Add to orders
ALTER TABLE public.orders ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- Add to payments
ALTER TABLE public.payments ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- Add to shifts
ALTER TABLE public.shifts ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- Add to shift_transactions
ALTER TABLE public.shift_transactions ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- Add to refunds
ALTER TABLE public.refunds ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- Add to restaurant_tables
ALTER TABLE public.restaurant_tables ADD COLUMN branch_id uuid REFERENCES public.restaurant_branches(id);

-- ========================
-- 5) HELPER FUNCTION: Get default branch for restaurant
-- ========================
CREATE OR REPLACE FUNCTION public.get_restaurant_default_branch(p_restaurant_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.restaurant_branches 
    WHERE restaurant_id = p_restaurant_id AND is_default = true 
    LIMIT 1;
$$;

-- ========================
-- 6) TRIGGER: Create default branch for new restaurants
-- ========================
CREATE OR REPLACE FUNCTION public.create_default_branch_for_restaurant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.restaurant_branches (restaurant_id, name, is_default)
    VALUES (NEW.id, 'Main Branch', true);
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_create_default_branch
AFTER INSERT ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.create_default_branch_for_restaurant();

-- ========================
-- 7) TRIGGER: Create branch_menu_items for new menu items
-- ========================
CREATE OR REPLACE FUNCTION public.create_branch_overrides_for_new_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_restaurant_id uuid;
BEGIN
    -- Get restaurant_id from the category
    SELECT restaurant_id INTO v_restaurant_id
    FROM public.menu_categories
    WHERE id = NEW.category_id;
    
    -- Insert overrides for all branches of this restaurant
    INSERT INTO public.branch_menu_items (branch_id, menu_item_id, price, is_available, is_active)
    SELECT rb.id, NEW.id, NEW.price, NEW.is_available, true
    FROM public.restaurant_branches rb
    WHERE rb.restaurant_id = v_restaurant_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_create_branch_overrides_for_item
AFTER INSERT ON public.menu_items
FOR EACH ROW
EXECUTE FUNCTION public.create_branch_overrides_for_new_item();

-- ========================
-- 8) TRIGGER: Create branch_menu_items for new branches
-- ========================
CREATE OR REPLACE FUNCTION public.create_overrides_for_new_branch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Create item overrides for all menu items of this restaurant
    INSERT INTO public.branch_menu_items (branch_id, menu_item_id, price, is_available, is_active)
    SELECT NEW.id, mi.id, mi.price, mi.is_available, true
    FROM public.menu_items mi
    JOIN public.menu_categories mc ON mi.category_id = mc.id
    WHERE mc.restaurant_id = NEW.restaurant_id;
    
    -- Create category overrides for all categories of this restaurant
    INSERT INTO public.branch_menu_categories (branch_id, category_id, is_active, sort_order)
    SELECT NEW.id, mc.id, mc.is_active, mc.sort_order
    FROM public.menu_categories mc
    WHERE mc.restaurant_id = NEW.restaurant_id;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER tr_create_overrides_for_branch
AFTER INSERT ON public.restaurant_branches
FOR EACH ROW
EXECUTE FUNCTION public.create_overrides_for_new_branch();

-- ========================
-- 9) BACKFILL: Create default branch for existing restaurants
-- ========================
INSERT INTO public.restaurant_branches (restaurant_id, name, is_default)
SELECT id, 'Main Branch', true
FROM public.restaurants
WHERE NOT EXISTS (
    SELECT 1 FROM public.restaurant_branches rb WHERE rb.restaurant_id = restaurants.id
);

-- ========================
-- 10) BACKFILL: Create branch_menu_items for existing items
-- ========================
INSERT INTO public.branch_menu_items (branch_id, menu_item_id, price, is_available, is_active)
SELECT rb.id, mi.id, mi.price, mi.is_available, true
FROM public.menu_items mi
JOIN public.menu_categories mc ON mi.category_id = mc.id
JOIN public.restaurant_branches rb ON rb.restaurant_id = mc.restaurant_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.branch_menu_items bmi 
    WHERE bmi.branch_id = rb.id AND bmi.menu_item_id = mi.id
);

-- ========================
-- 11) BACKFILL: Create branch_menu_categories for existing categories
-- ========================
INSERT INTO public.branch_menu_categories (branch_id, category_id, is_active, sort_order)
SELECT rb.id, mc.id, mc.is_active, mc.sort_order
FROM public.menu_categories mc
JOIN public.restaurant_branches rb ON rb.restaurant_id = mc.restaurant_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.branch_menu_categories bmc 
    WHERE bmc.branch_id = rb.id AND bmc.category_id = mc.id
);

-- ========================
-- 12) BACKFILL: Set branch_id on existing operational records
-- ========================
UPDATE public.orders o
SET branch_id = (SELECT get_restaurant_default_branch(o.restaurant_id))
WHERE o.branch_id IS NULL;

UPDATE public.payments p
SET branch_id = (
    SELECT o.branch_id FROM public.orders o WHERE o.id = p.order_id
)
WHERE p.branch_id IS NULL;

UPDATE public.shifts s
SET branch_id = (SELECT get_restaurant_default_branch(s.restaurant_id))
WHERE s.branch_id IS NULL;

UPDATE public.shift_transactions st
SET branch_id = (
    SELECT s.branch_id FROM public.shifts s WHERE s.id = st.shift_id
)
WHERE st.branch_id IS NULL;

UPDATE public.refunds r
SET branch_id = (
    SELECT o.branch_id FROM public.orders o WHERE o.id = r.order_id
)
WHERE r.branch_id IS NULL;

UPDATE public.restaurant_tables rt
SET branch_id = (SELECT get_restaurant_default_branch(rt.restaurant_id))
WHERE rt.branch_id IS NULL;

-- ========================
-- 13) UPDATED_AT TRIGGERS
-- ========================
CREATE TRIGGER update_restaurant_branches_updated_at
BEFORE UPDATE ON public.restaurant_branches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_menu_items_updated_at
BEFORE UPDATE ON public.branch_menu_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_menu_categories_updated_at
BEFORE UPDATE ON public.branch_menu_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();