-- =============================================
-- ITEM MODIFIERS SYSTEM
-- =============================================

-- 1. Modifier Groups (e.g., "Size", "Sugar Level", "Extras")
CREATE TABLE public.modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    max_selections INTEGER DEFAULT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Modifier Options (e.g., "Small +0", "Medium +0.50", "Large +1.00")
CREATE TABLE public.modifier_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Link menu items to modifier groups (which items have which modifier groups)
CREATE TABLE public.menu_item_modifier_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    modifier_group_id UUID NOT NULL REFERENCES public.modifier_groups(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(menu_item_id, modifier_group_id)
);

-- 4. Selected modifiers per order item
CREATE TABLE public.order_item_modifiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id UUID NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
    modifier_option_id UUID NOT NULL REFERENCES public.modifier_options(id),
    modifier_name TEXT NOT NULL,
    option_name TEXT NOT NULL,
    price_adjustment NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- RLS POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE public.modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modifier_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_modifier_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_modifiers ENABLE ROW LEVEL SECURITY;

-- modifier_groups policies
CREATE POLICY "Owners can manage their modifier groups" ON public.modifier_groups
    FOR ALL USING (restaurant_id = get_owner_restaurant_id(auth.uid()))
    WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their restaurant modifier groups" ON public.modifier_groups
    FOR SELECT USING (restaurant_id = get_cashier_restaurant_id(auth.uid()));

CREATE POLICY "System admins can do all on modifier_groups" ON public.modifier_groups
    FOR ALL USING (has_role(auth.uid(), 'system_admin'))
    WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- modifier_options policies
CREATE POLICY "Owners can manage modifier options" ON public.modifier_options
    FOR ALL USING (
        modifier_group_id IN (
            SELECT id FROM public.modifier_groups 
            WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
        )
    )
    WITH CHECK (
        modifier_group_id IN (
            SELECT id FROM public.modifier_groups 
            WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "Cashiers can view modifier options" ON public.modifier_options
    FOR SELECT USING (
        modifier_group_id IN (
            SELECT id FROM public.modifier_groups 
            WHERE restaurant_id = get_cashier_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "System admins can do all on modifier_options" ON public.modifier_options
    FOR ALL USING (has_role(auth.uid(), 'system_admin'))
    WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- menu_item_modifier_groups policies
CREATE POLICY "Owners can manage menu item modifier groups" ON public.menu_item_modifier_groups
    FOR ALL USING (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi
            JOIN public.menu_categories mc ON mi.category_id = mc.id
            WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
        )
    )
    WITH CHECK (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi
            JOIN public.menu_categories mc ON mi.category_id = mc.id
            WHERE mc.restaurant_id = get_owner_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "Cashiers can view menu item modifier groups" ON public.menu_item_modifier_groups
    FOR SELECT USING (
        menu_item_id IN (
            SELECT mi.id FROM public.menu_items mi
            JOIN public.menu_categories mc ON mi.category_id = mc.id
            WHERE mc.restaurant_id = get_cashier_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "System admins can do all on menu_item_modifier_groups" ON public.menu_item_modifier_groups
    FOR ALL USING (has_role(auth.uid(), 'system_admin'))
    WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- order_item_modifiers policies
CREATE POLICY "Cashiers can insert order item modifiers" ON public.order_item_modifiers
    FOR INSERT WITH CHECK (
        order_item_id IN (
            SELECT oi.id FROM public.order_items oi
            JOIN public.orders o ON oi.order_id = o.id
            JOIN public.shifts s ON o.shift_id = s.id
            WHERE s.cashier_id = auth.uid() AND s.status = 'open'
        )
    );

CREATE POLICY "Cashiers can view order item modifiers" ON public.order_item_modifiers
    FOR SELECT USING (
        order_item_id IN (
            SELECT oi.id FROM public.order_items oi
            JOIN public.orders o ON oi.order_id = o.id
            JOIN public.shifts s ON o.shift_id = s.id
            WHERE s.cashier_id = auth.uid()
        )
    );

CREATE POLICY "Owners can view their restaurant order item modifiers" ON public.order_item_modifiers
    FOR SELECT USING (
        order_item_id IN (
            SELECT id FROM public.order_items 
            WHERE restaurant_id = get_owner_restaurant_id(auth.uid())
        )
    );

CREATE POLICY "System admins can do all on order_item_modifiers" ON public.order_item_modifiers
    FOR ALL USING (has_role(auth.uid(), 'system_admin'))
    WITH CHECK (has_role(auth.uid(), 'system_admin'));

-- =============================================
-- INDEXES for performance
-- =============================================
CREATE INDEX idx_modifier_groups_restaurant ON public.modifier_groups(restaurant_id);
CREATE INDEX idx_modifier_options_group ON public.modifier_options(modifier_group_id);
CREATE INDEX idx_menu_item_modifier_groups_item ON public.menu_item_modifier_groups(menu_item_id);
CREATE INDEX idx_menu_item_modifier_groups_group ON public.menu_item_modifier_groups(modifier_group_id);
CREATE INDEX idx_order_item_modifiers_item ON public.order_item_modifiers(order_item_id);

-- =============================================
-- TRIGGERS for updated_at
-- =============================================
CREATE TRIGGER update_modifier_groups_updated_at
    BEFORE UPDATE ON public.modifier_groups
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_modifier_options_updated_at
    BEFORE UPDATE ON public.modifier_options
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();