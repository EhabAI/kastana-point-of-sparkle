import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("No authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.log("User auth error:", userError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check user role - must be owner or system_admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "system_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      console.log("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Forbidden: Owner access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ImportRequest = await req.json();
    const { restaurant_id, rows } = body;

    console.log(`Importing ${rows.length} rows for restaurant ${restaurant_id}`);

    // Validate restaurant_id matches user's restaurant (for owners)
    if (roleData.role === "owner" && roleData.restaurant_id !== restaurant_id) {
      return new Response(JSON.stringify({ error: "Forbidden: Restaurant mismatch" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!restaurant_id || !rows || rows.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all menu items for the restaurant
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, category_id, menu_categories!inner(restaurant_id)")
      .eq("menu_categories.restaurant_id", restaurant_id);

    if (menuError) {
      console.error("Error fetching menu items:", menuError);
      throw menuError;
    }

    // Create name to id map for menu items (case-insensitive, trimmed)
    // Also track duplicates
    const menuItemMap = new Map<string, { id: string; originalName: string }[]>();
    (menuItems || []).forEach((item: any) => {
      const normalizedName = item.name.toLowerCase().trim();
      if (!menuItemMap.has(normalizedName)) {
        menuItemMap.set(normalizedName, []);
      }
      menuItemMap.get(normalizedName)!.push({ id: item.id, originalName: item.name });
    });

    // Fetch all inventory items for the restaurant
    const { data: inventoryItems, error: invError } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("restaurant_id", restaurant_id);

    if (invError) {
      console.error("Error fetching inventory items:", invError);
      throw invError;
    }

    // Create name to inventory item map (case-insensitive, trimmed)
    // Also track duplicates
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

    // Fetch all units for the restaurant
    const { data: units, error: unitsError } = await supabase
      .from("inventory_units")
      .select("id, name, symbol")
      .eq("restaurant_id", restaurant_id);

    if (unitsError) {
      console.error("Error fetching units:", unitsError);
      throw unitsError;
    }

    // Create name/symbol to unit id map
    const unitMap = new Map<string, string>();
    (units || []).forEach((unit: any) => {
      unitMap.set(unit.name.toLowerCase().trim(), unit.id);
      if (unit.symbol) {
        unitMap.set(unit.symbol.toLowerCase().trim(), unit.id);
      }
    });

    // Group rows by menu_item_name
    const groupedByMenuItem = new Map<string, RecipeRow[]>();
    for (const row of rows) {
      const key = row.menu_item_name.toLowerCase().trim();
      if (!groupedByMenuItem.has(key)) {
        groupedByMenuItem.set(key, []);
      }
      groupedByMenuItem.get(key)!.push(row);
    }

    console.log(`Processing ${groupedByMenuItem.size} unique menu items`);

    // Track results
    let menuItemsUpdated = 0;
    let recipeLinesInserted = 0;
    const errors: string[] = [];

    // Process each menu item group
    for (const [menuItemNameKey, menuItemRows] of groupedByMenuItem) {
      const menuItemMatches = menuItemMap.get(menuItemNameKey);
      const originalMenuItemName = menuItemRows[0].menu_item_name;
      
      // Check if menu item not found
      if (!menuItemMatches || menuItemMatches.length === 0) {
        errors.push(`صنف القائمة غير موجود: "${originalMenuItemName}"`);
        continue;
      }
      
      // Check for duplicate menu item names
      if (menuItemMatches.length > 1) {
        errors.push(`اسم صنف القائمة غير فريد: "${originalMenuItemName}"`);
        continue;
      }
      
      const menuItemId = menuItemMatches[0].id;

      try {
        // Check if recipe already exists for this menu item
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
            throw createError || new Error("Failed to create recipe");
          }

          recipeId = newRecipe.id;
        }

        // Prepare and insert recipe lines
        const linesToInsert: any[] = [];
        let lineErrors = false;

        for (const row of menuItemRows) {
          const invItemKey = row.inventory_item_name.toLowerCase().trim();
          const invItemMatches = inventoryMap.get(invItemKey);
          
          // Check if inventory item not found
          if (!invItemMatches || invItemMatches.length === 0) {
            errors.push(`صنف المخزون غير موجود: "${row.inventory_item_name}" (لصنف القائمة "${row.menu_item_name}")`);
            lineErrors = true;
            continue;
          }
          
          // Check for duplicate inventory item names
          if (invItemMatches.length > 1) {
            errors.push(`اسم صنف المخزون غير فريد: "${row.inventory_item_name}" (لصنف القائمة "${row.menu_item_name}")`);
            lineErrors = true;
            continue;
          }
          
          const invItem = invItemMatches[0];

          const unitId = unitMap.get(row.unit.toLowerCase().trim());
          if (!unitId) {
            errors.push(`الوحدة غير موجودة: "${row.unit}" (لصنف القائمة "${row.menu_item_name}")`);
            lineErrors = true;
            continue;
          }

          // Calculate qty_in_base (simple: if same unit, use qty)
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
            errors.push(`فشل إدراج سطور الوصفة لـ "${originalMenuItemName}": ${linesError.message}`);
            continue;
          }

          recipeLinesInserted += linesToInsert.length;
        }

        if (!lineErrors) {
          menuItemsUpdated++;
        }
      } catch (error) {
        console.error(`Error processing menu item ${menuItemNameKey}:`, error);
        errors.push(`خطأ في معالجة "${originalMenuItemName}": ${error instanceof Error ? error.message : "خطأ غير معروف"}`);
      }
    }

    // Write audit log
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
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Recipe CSV import error:", error);
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
