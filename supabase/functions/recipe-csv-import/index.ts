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

interface ImportError {
  menu_item_name: string;
  inventory_item_name: string;
  reason: string;
  reason_code: string;
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

    // Fetch menu items for lookup
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, category_id, menu_categories!inner(restaurant_id)")
      .eq("menu_categories.restaurant_id", restaurant_id);

    if (menuError) {
      console.error("Error fetching menu items:", menuError);
      return errorResponse("server_error", 500);
    }

    // Build menu item map (case-insensitive, by name)
    const menuItemMap = new Map<string, { id: string; originalName: string }[]>();
    (menuItems || []).forEach((item: any) => {
      const normalizedName = item.name.toLowerCase().trim();
      if (!menuItemMap.has(normalizedName)) {
        menuItemMap.set(normalizedName, []);
      }
      menuItemMap.get(normalizedName)!.push({ id: item.id, originalName: item.name });
    });

    // Fetch inventory items for lookup
    const { data: inventoryItems, error: invError } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("restaurant_id", restaurant_id);

    if (invError) {
      console.error("Error fetching inventory items:", invError);
      return errorResponse("server_error", 500);
    }

    // Build inventory item map (case-insensitive, by name)
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

    // Fetch units for lookup
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

    // Group rows by menu item
    const groupedByMenuItem = new Map<string, { originalName: string; rows: RecipeRow[] }>();
    for (const row of rows) {
      const key = row.menu_item_name.toLowerCase().trim();
      if (!groupedByMenuItem.has(key)) {
        groupedByMenuItem.set(key, { originalName: row.menu_item_name, rows: [] });
      }
      groupedByMenuItem.get(key)!.rows.push(row);
    }

    console.log(`Processing ${groupedByMenuItem.size} unique menu items`);

    let recipesCreated = 0;
    let recipesFailed = 0;
    const errors: ImportError[] = [];

    // Process each menu item atomically
    for (const [menuItemNameKey, { originalName: originalMenuItemName, rows: menuItemRows }] of groupedByMenuItem) {
      const menuItemMatches = menuItemMap.get(menuItemNameKey);
      
      // Validate menu item exists
      if (!menuItemMatches || menuItemMatches.length === 0) {
        // Add error for each row in this menu item
        menuItemRows.forEach(row => {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: "Menu item not found",
            reason_code: "menu_item_not_found",
          });
        });
        recipesFailed++;
        continue;
      }
      
      // Check for ambiguous menu item name
      if (menuItemMatches.length > 1) {
        menuItemRows.forEach(row => {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: "Multiple menu items found with this name",
            reason_code: "menu_item_not_unique",
          });
        });
        recipesFailed++;
        continue;
      }
      
      const menuItemId = menuItemMatches[0].id;

      // Validate ALL ingredients for this menu item first
      const linesToInsert: {
        inventory_item_id: string;
        qty: number;
        unit_id: string;
        qty_in_base: number;
      }[] = [];
      let hasErrors = false;

      for (const row of menuItemRows) {
        // Validate inventory item
        const invItemKey = row.inventory_item_name.toLowerCase().trim();
        const invItemMatches = inventoryMap.get(invItemKey);
        
        if (!invItemMatches || invItemMatches.length === 0) {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: "Inventory item not found",
            reason_code: "inventory_item_not_found",
          });
          hasErrors = true;
          continue;
        }
        
        if (invItemMatches.length > 1) {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: "Multiple inventory items found with this name",
            reason_code: "inventory_item_not_unique",
          });
          hasErrors = true;
          continue;
        }
        
        const invItem = invItemMatches[0];

        // Validate unit
        const unitId = unitMap.get(row.unit.toLowerCase().trim());
        if (!unitId) {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: `Unit '${row.unit}' not found`,
            reason_code: "unit_not_found",
          });
          hasErrors = true;
          continue;
        }

        // Validate quantity
        if (!row.quantity || row.quantity <= 0 || isNaN(row.quantity)) {
          errors.push({
            menu_item_name: originalMenuItemName,
            inventory_item_name: row.inventory_item_name,
            reason: "Quantity must be a positive number",
            reason_code: "invalid_quantity",
          });
          hasErrors = true;
          continue;
        }

        // Calculate qty_in_base (for now, assume 1:1 conversion)
        const qtyInBase = row.quantity;

        linesToInsert.push({
          inventory_item_id: invItem.id,
          qty: row.quantity,
          unit_id: unitId,
          qty_in_base: qtyInBase,
        });
      }

      // If ANY ingredient failed validation, skip the entire recipe for this menu item
      if (hasErrors) {
        recipesFailed++;
        continue;
      }

      // All ingredients valid - now create/update the recipe atomically
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
          
          // Delete existing lines
          const { error: deleteError } = await supabase
            .from("menu_item_recipe_lines")
            .delete()
            .eq("recipe_id", recipeId);

          if (deleteError) {
            console.error(`Error deleting lines for recipe ${recipeId}:`, deleteError);
            throw deleteError;
          }
          
          // Update recipe timestamp
          await supabase
            .from("menu_item_recipes")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", recipeId);
        } else {
          // Create new recipe
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

        // Insert all recipe lines
        if (linesToInsert.length > 0) {
          const { error: linesError } = await supabase
            .from("menu_item_recipe_lines")
            .insert(linesToInsert.map(line => ({
              restaurant_id,
              recipe_id: recipeId,
              ...line,
            })));

          if (linesError) {
            console.error(`Error inserting lines for ${menuItemNameKey}:`, linesError);
            // Rollback: delete the recipe if lines failed
            if (!existingRecipe) {
              await supabase.from("menu_item_recipes").delete().eq("id", recipeId);
            }
            throw linesError;
          }
        }

        recipesCreated++;
      } catch (error) {
        console.error(`Error processing menu item ${menuItemNameKey}:`, error);
        // Add a generic error for this menu item
        errors.push({
          menu_item_name: originalMenuItemName,
          inventory_item_name: menuItemRows[0]?.inventory_item_name || "",
          reason: "Failed to save recipe to database",
          reason_code: "database_error",
        });
        recipesFailed++;
      }
    }

    // Log audit entry
    await supabase.from("audit_logs").insert({
      restaurant_id,
      user_id: user.id,
      action: "RECIPES_CSV_IMPORTED",
      entity_type: "menu_item_recipe",
      entity_id: null,
      details: {
        total_rows: rows.length,
        recipes_created: recipesCreated,
        recipes_failed: recipesFailed,
        errors_count: errors.length,
      },
    });

    console.log(`Import complete: ${recipesCreated} recipes created, ${recipesFailed} failed, ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: recipesFailed === 0,
        recipes_created: recipesCreated,
        recipes_failed: recipesFailed,
        total_rows: rows.length,
        errors,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recipe CSV import error:", error);
    return errorResponse("unexpected", 500);
  }
});
