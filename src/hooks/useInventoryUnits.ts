import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryUnit {
  id: string;
  name: string;
  symbol: string | null;
}

// Core units that should always exist
export const DEFAULT_INVENTORY_UNITS: { name: string; symbol: string }[] = [
  // Core units
  { name: "pcs", symbol: "pcs" },
  { name: "kg", symbol: "kg" },
  { name: "g", symbol: "g" },
  { name: "liter", symbol: "L" },
  { name: "ml", symbol: "ml" },
  // Drinks & consumption units
  { name: "bottle", symbol: "btl" },
  { name: "can", symbol: "can" },
  { name: "cup", symbol: "cup" },
  // Packaging units
  { name: "pack", symbol: "pk" },
  { name: "box", symbol: "box" },
];

/**
 * Get all inventory units for a restaurant
 */
export function useInventoryUnits(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["inventory-units", restaurantId],
    queryFn: async (): Promise<InventoryUnit[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_units")
        .select("id, name, symbol")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (error) {
        console.error("Error fetching units:", error);
        return [];
      }

      return data || [];
    },
    enabled: !!restaurantId,
  });
}

/**
 * Create a single inventory unit
 */
export function useCreateInventoryUnit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      name,
      symbol,
    }: {
      restaurantId: string;
      name: string;
      symbol?: string;
    }): Promise<InventoryUnit> => {
      const { data, error } = await supabase
        .from("inventory_units")
        .insert({
          restaurant_id: restaurantId,
          name: name.toLowerCase().trim(),
          symbol: symbol || name.toLowerCase().trim(),
        })
        .select("id, name, symbol")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-units", variables.restaurantId] });
    },
  });
}

/**
 * Seed default inventory units for a restaurant if they don't exist.
 * This is idempotent - it won't create duplicates.
 */
export function useSeedDefaultUnits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (restaurantId: string): Promise<{ created: number; existing: number }> => {
      // First, get existing units
      const { data: existingUnits, error: fetchError } = await supabase
        .from("inventory_units")
        .select("name")
        .eq("restaurant_id", restaurantId);

      if (fetchError) throw fetchError;

      const existingNames = new Set((existingUnits || []).map((u) => u.name.toLowerCase()));
      
      // Filter units that need to be created
      const unitsToCreate = DEFAULT_INVENTORY_UNITS.filter(
        (unit) => !existingNames.has(unit.name.toLowerCase())
      );

      if (unitsToCreate.length === 0) {
        return { created: 0, existing: existingUnits?.length || 0 };
      }

      // Insert missing units
      const { error: insertError } = await supabase
        .from("inventory_units")
        .insert(
          unitsToCreate.map((unit) => ({
            restaurant_id: restaurantId,
            name: unit.name,
            symbol: unit.symbol,
          }))
        );

      if (insertError) throw insertError;

      return { created: unitsToCreate.length, existing: existingNames.size };
    },
    onSuccess: (_, restaurantId) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-units", restaurantId] });
    },
  });
}

/**
 * Get or create a unit by name for a restaurant.
 * Returns the unit ID. Creates the unit if it doesn't exist.
 */
export async function getOrCreateUnit(
  restaurantId: string,
  unitName: string
): Promise<{ id: string; name: string; created: boolean }> {
  const normalizedName = unitName.toLowerCase().trim();

  // Try to find existing unit
  const { data: existing, error: fetchError } = await supabase
    .from("inventory_units")
    .select("id, name")
    .eq("restaurant_id", restaurantId)
    .ilike("name", normalizedName)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (existing) {
    return { id: existing.id, name: existing.name, created: false };
  }

  // Create the unit
  const defaultUnit = DEFAULT_INVENTORY_UNITS.find(
    (u) => u.name.toLowerCase() === normalizedName
  );

  const { data: newUnit, error: insertError } = await supabase
    .from("inventory_units")
    .insert({
      restaurant_id: restaurantId,
      name: normalizedName,
      symbol: defaultUnit?.symbol || normalizedName,
    })
    .select("id, name")
    .single();

  if (insertError) throw insertError;

  return { id: newUnit.id, name: newUnit.name, created: true };
}
