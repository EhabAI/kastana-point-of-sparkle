import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RecipeLine {
  inventory_item_id: string;
  qty: number;
  unit_id: string;
}

interface RecipeRequest {
  restaurant_id: string;
  menu_item_id: string;
  lines: RecipeLine[];
  notes?: string;
  is_active?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role - must be owner
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "system_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RecipeRequest = await req.json();
    const { restaurant_id, menu_item_id, lines, notes, is_active = true } = body;

    // Validate restaurant_id matches user's restaurant (for owners)
    if (roleData.role === "owner" && roleData.restaurant_id !== restaurant_id) {
      return new Response(JSON.stringify({ error: "Forbidden: Restaurant mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate required fields
    if (!restaurant_id || !menu_item_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if recipe exists
    const { data: existingRecipe } = await supabase
      .from("menu_item_recipes")
      .select("id")
      .eq("restaurant_id", restaurant_id)
      .eq("menu_item_id", menu_item_id)
      .maybeSingle();

    let recipeId: string;
    let isNew = false;

    if (existingRecipe) {
      // Update existing recipe
      recipeId = existingRecipe.id;
      
      const { error: updateError } = await supabase
        .from("menu_item_recipes")
        .update({
          notes,
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", recipeId);

      if (updateError) {
        throw updateError;
      }

      // Delete old lines
      const { error: deleteError } = await supabase
        .from("menu_item_recipe_lines")
        .delete()
        .eq("recipe_id", recipeId);

      if (deleteError) {
        throw deleteError;
      }
    } else {
      // Create new recipe
      isNew = true;
      const { data: newRecipe, error: insertError } = await supabase
        .from("menu_item_recipes")
        .insert({
          restaurant_id,
          menu_item_id,
          notes,
          is_active,
        })
        .select("id")
        .single();

      if (insertError || !newRecipe) {
        throw insertError || new Error("Failed to create recipe");
      }

      recipeId = newRecipe.id;
    }

    // Fetch inventory items to get base_unit_id for qty_in_base calculation
    if (lines && lines.length > 0) {
      const inventoryItemIds = lines.map(l => l.inventory_item_id);
      
      const { data: inventoryItems, error: invError } = await supabase
        .from("inventory_items")
        .select("id, base_unit_id")
        .in("id", inventoryItemIds);

      if (invError) {
        throw invError;
      }

      const inventoryMap = new Map(inventoryItems?.map(i => [i.id, i.base_unit_id]) || []);

      // Calculate qty_in_base for each line
      // For now, if unit_id matches base_unit_id, qty_in_base = qty
      // Otherwise, we'd need unit conversion table (future enhancement)
      const linesToInsert = lines.map(line => {
        const baseUnitId = inventoryMap.get(line.inventory_item_id);
        // Simple calculation: if same unit, qty_in_base = qty
        // In future, implement unit conversion lookup
        const qtyInBase = line.unit_id === baseUnitId ? line.qty : line.qty;
        
        return {
          restaurant_id,
          recipe_id: recipeId,
          inventory_item_id: line.inventory_item_id,
          qty: line.qty,
          unit_id: line.unit_id,
          qty_in_base: qtyInBase,
        };
      });

      const { error: linesError } = await supabase
        .from("menu_item_recipe_lines")
        .insert(linesToInsert);

      if (linesError) {
        throw linesError;
      }
    }

    // Write audit log
    await supabase.from("audit_logs").insert({
      restaurant_id,
      user_id: user.id,
      action: isNew ? "RECIPE_CREATED" : "RECIPE_UPDATED",
      entity_type: "menu_item_recipe",
      entity_id: recipeId,
      details: {
        menu_item_id,
        lines_count: lines?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({ success: true, recipe_id: recipeId, is_new: isNew }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Recipe upsert error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
