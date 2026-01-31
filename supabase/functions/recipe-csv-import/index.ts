import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOwnerRestaurantId } from "../_shared/owner-restaurant.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 
  | "unauthorized"
  | "not_authorized"
  | "restaurant_mismatch"
  | "missing_fields"
  | "server_error"
  | "unexpected";

function errorResponse(code: ErrorCode, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface RecipeRow {
  menu_item_name: string;
  inventory_item_name: string;
  quantity: number;
  unit: string;
}

interface ImportRequest {
  restaurant_id: string;
  rows: RecipeRow[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return errorResponse("unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log("User auth error:", userError);
      return errorResponse("unauthorized", 401);
    }

    // Check user role - allow owner or system_admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["owner", "system_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.log("Role check error:", roleError);
      return errorResponse("not_authorized", 403);
    }

    const body: ImportRequest = await req.json();
    const { restaurant_id, rows } = body;

    console.log(`Importing ${rows.length} rows for restaurant ${restaurant_id}`);

    // For owners, validate restaurant ownership using the shared helper
    if (roleData.role === "owner") {
      const { restaurantId: resolvedId, error: resolveError } = await resolveOwnerRestaurantId({
        supabaseAdmin: supabase,
        userId: user.id,
        requestedRestaurantId: restaurant_id,
      });

      if (resolveError || !resolvedId) {
        console.log("Restaurant resolution error:", resolveError);
        return errorResponse("restaurant_mismatch", 403);
      }
    }

    if (!restaurant_id || !rows || rows.length === 0) {
      return errorResponse("missing_fields", 400);
    }

    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, category_id, menu_categories!inner(restaurant_id)")
      .eq("menu_categories.restaurant_id", restaurant_id);

    if (menuError) {
      console.error("Error fetching menu items:", menuError);
      return errorResponse("server_error", 500);
    }

    const menuItemMap = new Map<string, { id: string; originalName: string }[]>();
    (menuItems || []).forEach((item: any) => {
      const normalizedName = item.name.toLowerCase().trim();
      if (!menuItemMap.has(normalizedName)) {
        menuItemMap.set(normalizedName, []);
      }
      menuItemMap.get(normalizedName)!.push({ id: item.id, originalName: item.name });
    });

    const { data: inventoryItems, error: invError } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("restaurant_id", restaurant_id);

    if (invError) {
      console.error("Error fetching inventory items:", invError);
      return errorResponse("server_error", 500);
    }

    const inventoryMap = new Map<string, { id: string; base_unit_id: string; originalName: string }[]>();
    (inventoryItems || []).forEach((item: any) => {
      const normalizedName = item.name.toLowerCase().trim();
      if (!inventoryMap.has(normalizedName)) {
        inventoryMap.set(normalizedName, []);
      }
      inventoryMap.get(normalizedName)!.push({ 
        id: item.id, 
        base_unit_id: item.base_unit_id,
        originalName: item.name 
      });
    });

    const { data: units, error: unitsError } = await supabase
      .from("inventory_units")
      .select("id, name, symbol")
      .eq("restaurant_id", restaurant_id);

    if (unitsError) {
      console.error("Error fetching units:", unitsError);
      return errorResponse("server_error", 500);
    }

    const unitMap = new Map<string, string>();
    (units || []).forEach((unit: any) => {
      unitMap.set(unit.name.toLowerCase().trim(), unit.id);
      if (unit.symbol) {
        unitMap.set(unit.symbol.toLowerCase().trim(), unit.id);
      }
    });

    const groupedByMenuItem = new Map<string, RecipeRow[]>();
    for (const row of rows) {
      const key = row.menu_item_name.toLowerCase().trim();
      if (!groupedByMenuItem.has(key)) {
        groupedByMenuItem.set(key, []);
      }
      groupedByMenuItem.get(key)!.push(row);
    }

    console.log(`Processing ${groupedByMenuItem.size} unique menu items`);

    let menuItemsUpdated = 0;
    let recipeLinesInserted = 0;
    const errors: { code: string; params: Record<string, string> }[] = [];

    for (const [menuItemNameKey, menuItemRows] of groupedByMenuItem) {
      const menuItemMatches = menuItemMap.get(menuItemNameKey);
      const originalMenuItemName = menuItemRows[0].menu_item_name;
      
      if (!menuItemMatches || menuItemMatches.length === 0) {
        errors.push({ code: "menu_item_not_found", params: { name: originalMenuItemName } });
        continue;
      }
      
      if (menuItemMatches.length > 1) {
        errors.push({ code: "menu_item_not_unique", params: { name: originalMenuItemName } });
        continue;
      }
      
      const menuItemId = menuItemMatches[0].id;

      try {
        const { data: existingRecipe } = await supabase
          .from("menu_item_recipes")
          .select("id")
          .eq("restaurant_id", restaurant_id)
          .eq("menu_item_id", menuItemId)
          .maybeSingle();

        let recipeId: string;

        if (existingRecipe) {
          recipeId = existingRecipe.id;
          
          const { error: deleteError } = await supabase
            .from("menu_item_recipe_lines")
            .delete()
            .eq("recipe_id", recipeId);

          if (deleteError) {
            console.error(`Error deleting lines for recipe ${recipeId}:`, deleteError);
            throw deleteError;
          }
          
          await supabase
            .from("menu_item_recipes")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", recipeId);
        } else {
          const { data: newRecipe, error: createError } = await supabase
            .from("menu_item_recipes")
            .insert({
              restaurant_id,
              menu_item_id: menuItemId,
              is_active: true,
            })
            .select("id")
            .single();

          if (createError || !newRecipe) {
            console.error(`Error creating recipe for ${menuItemNameKey}:`, createError);
            throw createError;
          }

          recipeId = newRecipe.id;
        }

        const linesToInsert: any[] = [];
        let lineErrors = false;

        for (const row of menuItemRows) {
          const invItemKey = row.inventory_item_name.toLowerCase().trim();
          const invItemMatches = inventoryMap.get(invItemKey);
          
          if (!invItemMatches || invItemMatches.length === 0) {
            errors.push({ code: "inventory_item_not_found", params: { invName: row.inventory_item_name, menuName: row.menu_item_name } });
            lineErrors = true;
            continue;
          }
          
          if (invItemMatches.length > 1) {
            errors.push({ code: "inventory_item_not_unique", params: { invName: row.inventory_item_name, menuName: row.menu_item_name } });
            lineErrors = true;
            continue;
          }
          
          const invItem = invItemMatches[0];

          const unitId = unitMap.get(row.unit.toLowerCase().trim());
          if (!unitId) {
            errors.push({ code: "unit_not_found", params: { unit: row.unit, menuName: row.menu_item_name } });
            lineErrors = true;
            continue;
          }

          const qtyInBase = unitId === invItem.base_unit_id ? row.quantity : row.quantity;

          linesToInsert.push({
            restaurant_id,
            recipe_id: recipeId,
            inventory_item_id: invItem.id,
            qty: row.quantity,
            unit_id: unitId,
            qty_in_base: qtyInBase,
          });
        }

        if (linesToInsert.length > 0) {
          const { error: linesError } = await supabase
            .from("menu_item_recipe_lines")
            .insert(linesToInsert);

          if (linesError) {
            console.error(`Error inserting lines for ${menuItemNameKey}:`, linesError);
            errors.push({ code: "recipe_lines_insert_failed", params: { name: originalMenuItemName } });
            continue;
          }

          recipeLinesInserted += linesToInsert.length;
        }

        if (!lineErrors) {
          menuItemsUpdated++;
        }
      } catch (error) {
        console.error(`Error processing menu item ${menuItemNameKey}:`, error);
        errors.push({ code: "recipe_process_failed", params: { name: originalMenuItemName } });
      }
    }

    await supabase.from("audit_logs").insert({
      restaurant_id,
      user_id: user.id,
      action: "RECIPES_CSV_IMPORTED",
      entity_type: "menu_item_recipe",
      entity_id: null,
      details: {
        total_rows: rows.length,
        menu_items_updated: menuItemsUpdated,
        recipe_lines_inserted: recipeLinesInserted,
        errors_count: errors.length,
      },
    });

    console.log(`Import complete: ${menuItemsUpdated} menu items updated, ${recipeLinesInserted} lines inserted, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        menu_items_updated: menuItemsUpdated,
        recipe_lines_inserted: recipeLinesInserted,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recipe CSV import error:", error);
    return errorResponse("unexpected", 500);
  }
});
