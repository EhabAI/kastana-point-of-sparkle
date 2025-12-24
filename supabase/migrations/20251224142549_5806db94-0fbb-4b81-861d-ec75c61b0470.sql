-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('system_admin', 'owner');

-- Create user_roles table (following security best practices - roles separate from profile)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create restaurants table
CREATE TABLE public.restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_categories table
CREATE TABLE public.menu_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create menu_items table
CREATE TABLE public.menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.menu_categories(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    is_available BOOLEAN NOT NULL DEFAULT true,
    is_offer BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Security definer function to get owner's restaurant ID
CREATE OR REPLACE FUNCTION public.get_owner_restaurant_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.restaurants WHERE owner_id = _user_id LIMIT 1
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can insert roles"
ON public.user_roles FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can update roles"
ON public.user_roles FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "System admins can delete roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'));

-- RLS Policies for restaurants
CREATE POLICY "System admins can do all on restaurants"
ON public.restaurants FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'))
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their own restaurant"
ON public.restaurants FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Owners can update their own restaurant"
ON public.restaurants FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

-- RLS Policies for menu_categories
CREATE POLICY "System admins can do all on categories"
ON public.menu_categories FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'))
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their restaurant categories"
ON public.menu_categories FOR SELECT
TO authenticated
USING (restaurant_id = public.get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can insert categories to their restaurant"
ON public.menu_categories FOR INSERT
TO authenticated
WITH CHECK (restaurant_id = public.get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can update their restaurant categories"
ON public.menu_categories FOR UPDATE
TO authenticated
USING (restaurant_id = public.get_owner_restaurant_id(auth.uid()));

CREATE POLICY "Owners can delete their restaurant categories"
ON public.menu_categories FOR DELETE
TO authenticated
USING (restaurant_id = public.get_owner_restaurant_id(auth.uid()));

-- RLS Policies for menu_items
CREATE POLICY "System admins can do all on menu items"
ON public.menu_items FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'system_admin'))
WITH CHECK (public.has_role(auth.uid(), 'system_admin'));

CREATE POLICY "Owners can view their menu items"
ON public.menu_items FOR SELECT
TO authenticated
USING (
    category_id IN (
        SELECT id FROM public.menu_categories 
        WHERE restaurant_id = public.get_owner_restaurant_id(auth.uid())
    )
);

CREATE POLICY "Owners can insert menu items to their categories"
ON public.menu_items FOR INSERT
TO authenticated
WITH CHECK (
    category_id IN (
        SELECT id FROM public.menu_categories 
        WHERE restaurant_id = public.get_owner_restaurant_id(auth.uid())
    )
);

CREATE POLICY "Owners can update their menu items"
ON public.menu_items FOR UPDATE
TO authenticated
USING (
    category_id IN (
        SELECT id FROM public.menu_categories 
        WHERE restaurant_id = public.get_owner_restaurant_id(auth.uid())
    )
);

CREATE POLICY "Owners can delete their menu items"
ON public.menu_items FOR DELETE
TO authenticated
USING (
    category_id IN (
        SELECT id FROM public.menu_categories 
        WHERE restaurant_id = public.get_owner_restaurant_id(auth.uid())
    )
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_restaurants_updated_at
    BEFORE UPDATE ON public.restaurants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_categories_updated_at
    BEFORE UPDATE ON public.menu_categories
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON public.menu_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();