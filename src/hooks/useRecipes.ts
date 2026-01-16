import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Recipe {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeLine {
  id: string;
  recipe_id: string;
  inventory_item_id: string;
  qty: number;
  unit_id: string;
  qty_in_base: number;
  inventory_item_name?: string;
  unit_name?: string;
}

export interface RecipeWithLines extends Recipe {
  lines: RecipeLine[];
  menu_item_name?: string;
}

export function useRecipes(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["recipes", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from("menu_item_recipes")
        .select(`
          *,
          menu_items!inner(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      return (data || []).map((r: any) => ({
        ...r,
        menu_item_name: r.menu_items?.name,
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useRecipeByMenuItem(restaurantId: string | undefined, menuItemId: string | undefined) {
  return useQuery({
    queryKey: ["recipe", restaurantId, menuItemId],
    queryFn: async () => {
      if (!restaurantId || !menuItemId) return null;
      
      // First get the recipe
      const { data: recipe, error: recipeError } = await supabase
        .from("menu_item_recipes")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("menu_item_id", menuItemId)
        .maybeSingle();

      if (recipeError) throw recipeError;
      if (!recipe) return null;

      // Then get the lines with inventory item and unit info
      const { data: lines, error: linesError } = await supabase
        .from("menu_item_recipe_lines")
        .select(`
          *,
          inventory_items(name),
          inventory_units(name)
        `)
        .eq("recipe_id", recipe.id);

      if (linesError) throw linesError;

      const formattedLines = (lines || []).map((l: any) => ({
        id: l.id,
        recipe_id: l.recipe_id,
        inventory_item_id: l.inventory_item_id,
        qty: Number(l.qty),
        unit_id: l.unit_id,
        qty_in_base: Number(l.qty_in_base),
        inventory_item_name: l.inventory_items?.name,
        unit_name: l.inventory_units?.name,
      }));

      return {
        ...recipe,
        lines: formattedLines,
      } as RecipeWithLines;
    },
    enabled: !!restaurantId && !!menuItemId,
  });
}

interface UpsertRecipeParams {
  restaurant_id: string;
  menu_item_id: string;
  lines: {
    inventory_item_id: string;
    qty: number;
    unit_id: string;
  }[];
  notes?: string;
  is_active?: boolean;
}

export function useUpsertRecipe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpsertRecipeParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("recipe-upsert", {
        body: params,
      });

      if (response.error) {
        throw new Error(response.error.message || "Failed to save recipe");
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipes", variables.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ["recipe", variables.restaurant_id, variables.menu_item_id] });
      toast({
        title: "Recipe saved",
        description: "The recipe has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
