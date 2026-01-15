-- Create function to add default inventory units for new restaurants
CREATE OR REPLACE FUNCTION public.add_default_inventory_units()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.inventory_units (restaurant_id, name, symbol)
  VALUES 
    (NEW.id, 'ml', 'milliliters'),
    (NEW.id, 'g', 'grams'),
    (NEW.id, 'pcs', 'pieces');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to run after new restaurant is inserted
DROP TRIGGER IF EXISTS trigger_add_default_inventory_units ON public.restaurants;
CREATE TRIGGER trigger_add_default_inventory_units
  AFTER INSERT ON public.restaurants
  FOR EACH ROW
  EXECUTE FUNCTION public.add_default_inventory_units();