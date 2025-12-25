-- Create restaurant_settings table for tax/fee configuration
CREATE TABLE public.restaurant_settings (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE UNIQUE,
    tax_rate numeric NOT NULL DEFAULT 0.16,
    service_charge_rate numeric NOT NULL DEFAULT 0,
    rounding_enabled boolean NOT NULL DEFAULT false,
    currency text NOT NULL DEFAULT 'JOD',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create shifts table
CREATE TABLE public.shifts (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    cashier_id uuid NOT NULL,
    opened_at timestamp with time zone NOT NULL DEFAULT now(),
    closed_at timestamp with time zone,
    opening_cash numeric NOT NULL DEFAULT 0,
    closing_cash numeric,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create shift_transactions table for cash in/out
CREATE TABLE public.shift_transactions (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    type text NOT NULL CHECK (type IN ('cash_in', 'cash_out')),
    amount numeric NOT NULL,
    reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create orders table
CREATE TABLE public.orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    shift_id uuid NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
    order_number serial,
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'held', 'closed', 'cancelled')),
    subtotal numeric NOT NULL DEFAULT 0,
    discount_type text CHECK (discount_type IN ('percent', 'fixed')),
    discount_value numeric DEFAULT 0,
    tax_rate numeric NOT NULL DEFAULT 0.16,
    tax_amount numeric NOT NULL DEFAULT 0,
    service_charge numeric NOT NULL DEFAULT 0,
    total numeric NOT NULL DEFAULT 0,
    notes text,
    cancelled_reason text,
    invoice_uuid uuid DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create order_items table
CREATE TABLE public.order_items (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
    name text NOT NULL,
    price numeric NOT NULL,
    quantity integer NOT NULL DEFAULT 1,
    notes text,
    voided boolean NOT NULL DEFAULT false,
    void_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create payments table
CREATE TABLE public.payments (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    method text NOT NULL CHECK (method IN ('cash', 'visa', 'cliq', 'zain_cash', 'orange_money', 'umniah_wallet')),
    amount numeric NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create refunds table
CREATE TABLE public.refunds (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    reason text,
    refund_type text NOT NULL DEFAULT 'full' CHECK (refund_type IN ('full', 'partial')),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    details jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for restaurant_settings
CREATE POLICY "System admins can do all on restaurant_settings"
ON public.restaurant_settings FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant settings"
ON public.restaurant_settings FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can insert their restaurant settings"
ON public.restaurant_settings FOR INSERT
WITH CHECK (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can update their restaurant settings"
ON public.restaurant_settings FOR UPDATE
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

-- RLS policies for shifts
CREATE POLICY "System admins can do all on shifts"
ON public.shifts FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant shifts"
ON public.shifts FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their own shifts"
ON public.shifts FOR SELECT
USING (cashier_id = auth.uid());

CREATE POLICY "Cashiers can insert their own shifts"
ON public.shifts FOR INSERT
WITH CHECK (cashier_id = auth.uid() AND has_role(auth.uid(), 'cashier'));

CREATE POLICY "Cashiers can update their own shifts"
ON public.shifts FOR UPDATE
USING (cashier_id = auth.uid() AND has_role(auth.uid(), 'cashier'));

-- RLS policies for shift_transactions
CREATE POLICY "System admins can do all on shift_transactions"
ON public.shift_transactions FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant shift_transactions"
ON public.shift_transactions FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view their shift transactions"
ON public.shift_transactions FOR SELECT
USING (shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid()));

CREATE POLICY "Cashiers can insert shift transactions"
ON public.shift_transactions FOR INSERT
WITH CHECK (shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid() AND status = 'open'));

-- RLS policies for orders
CREATE POLICY "System admins can do all on orders"
ON public.orders FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant orders"
ON public.orders FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view orders from their shifts"
ON public.orders FOR SELECT
USING (shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid()));

CREATE POLICY "Cashiers can insert orders in their open shift"
ON public.orders FOR INSERT
WITH CHECK (shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid() AND status = 'open'));

CREATE POLICY "Cashiers can update orders in their shifts"
ON public.orders FOR UPDATE
USING (shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid()));

-- RLS policies for order_items
CREATE POLICY "System admins can do all on order_items"
ON public.order_items FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant order_items"
ON public.order_items FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view order_items from their orders"
ON public.order_items FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

CREATE POLICY "Cashiers can insert order_items"
ON public.order_items FOR INSERT
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid() AND status = 'open')));

CREATE POLICY "Cashiers can update order_items"
ON public.order_items FOR UPDATE
USING (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

-- RLS policies for payments
CREATE POLICY "System admins can do all on payments"
ON public.payments FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant payments"
ON public.payments FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view payments from their orders"
ON public.payments FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

CREATE POLICY "Cashiers can insert payments"
ON public.payments FOR INSERT
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

-- RLS policies for refunds
CREATE POLICY "System admins can do all on refunds"
ON public.refunds FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant refunds"
ON public.refunds FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can view refunds from their orders"
ON public.refunds FOR SELECT
USING (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

CREATE POLICY "Cashiers can insert refunds"
ON public.refunds FOR INSERT
WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE shift_id IN (SELECT id FROM public.shifts WHERE cashier_id = auth.uid())));

-- RLS policies for audit_logs
CREATE POLICY "System admins can do all on audit_logs"
ON public.audit_logs FOR ALL
USING (has_role(auth.uid(), 'system_admin'))
WITH CHECK (has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant audit_logs"
ON public.audit_logs FOR SELECT
USING (restaurant_id = get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Cashiers can insert audit_logs"
ON public.audit_logs FOR INSERT
WITH CHECK (user_id = auth.uid() AND has_role(auth.uid(), 'cashier'));

-- Create triggers for updated_at
CREATE TRIGGER update_restaurant_settings_updated_at
    BEFORE UPDATE ON public.restaurant_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_shifts_restaurant_id ON public.shifts(restaurant_id);
CREATE INDEX idx_shifts_cashier_id ON public.shifts(cashier_id);
CREATE INDEX idx_shifts_status ON public.shifts(status);
CREATE INDEX idx_orders_restaurant_id ON public.orders(restaurant_id);
CREATE INDEX idx_orders_shift_id ON public.orders(shift_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX idx_audit_logs_restaurant_id ON public.audit_logs(restaurant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);