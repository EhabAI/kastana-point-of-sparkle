import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { parseEdgeFunctionError } from "@/lib/ownerErrorHandler";

export interface Recipe {
  id: string;
  restaurant_id: string;
  branch_id: string | null;
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

/**
 * Fetch all recipes for a restaurant, optionally filtered by branch
 */
export function useRecipes(restaurantId: string | undefined, branchId?: string | undefined) {
  return useQuery({
    queryKey: ["recipes", restaurantId, branchId],
    queryFn: async () => {
      if (!restaurantId) return [];
      
      let query = supabase
        .from("menu_item_recipes")
        .select(`
          *,
          menu_items!inner(name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      // If branchId is provided, filter by it
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      return (data || []).map((r: any) => ({
        ...r,
        menu_item_name: r.menu_items?.name,
      }));
    },
    enabled: !!restaurantId,
  });
}

/**
 * Fetch a specific recipe by menu item, scoped to branch
 */
export function useRecipeByMenuItem(
  restaurantId: string | undefined, 
  menuItemId: string | undefined,
  branchId?: string | undefined
) {
  return useQuery({
    queryKey: ["recipe", restaurantId, branchId, menuItemId],
    queryFn: async () => {
      if (!restaurantId || !menuItemId) return null;
      
      // Build query - recipe lookup by (restaurant_id, branch_id, menu_item_id)
      let query = supabase
        .from("menu_item_recipes")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("menu_item_id", menuItemId);

      // If branchId is provided, filter by it for branch-specific recipes
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: recipe, error: recipeError } = await query.maybeSingle();

      if (recipeError) throw recipeError;
      if (!recipe) return null;

      // Then get the lines
      const { data: lines, error: linesError } = await supabase
        .from("menu_item_recipe_lines")
        .select("*")
        .eq("recipe_id", recipe.id)
        .eq("restaurant_id", restaurantId);

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
  branch_id: string;
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
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async (params: UpsertRecipeParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("recipe-upsert", {
        body: params,
      });

      if (response.error) {
        // Try to parse bilingual error
        const parsed = parseEdgeFunctionError(response.error, language as "ar" | "en");
        throw new Error(parsed?.title || response.error.message || "Failed to save recipe");
      }

      // Check for API-level errors with bilingual messages
      if (response.data && !response.data.success && response.data.message_en) {
        const errorMsg = language === "ar" ? response.data.message_ar : response.data.message_en;
        throw new Error(errorMsg);
      }

      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["recipes", variables.restaurant_id] });
      queryClient.invalidateQueries({ queryKey: ["recipe", variables.restaurant_id, variables.branch_id, variables.menu_item_id] });
      queryClient.invalidateQueries({ queryKey: ["all-recipes-menu-items", variables.restaurant_id] });
      toast({
        title: language === "ar" ? "تم حفظ الوصفة" : "Recipe saved",
        description: language === "ar" ? "تم حفظ الوصفة بنجاح." : "The recipe has been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
