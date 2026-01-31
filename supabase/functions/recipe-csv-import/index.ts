import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOwnerRestaurantId } from "../_shared/owner-restaurant.ts";
import { validateOwnerContext, createContextErrorResponse } from "../_shared/owner-context-guard.ts";
import { checkSubscriptionActive, subscriptionExpiredResponse } from "../_shared/subscription-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 
  | "unauthorized"
  | "not_authorized"
  | "restaurant_mismatch"
  | "missing_fields"
  | "subscription_expired"
  | "server_error"
  | "unexpected";

// Bilingual error messages
const ERROR_MESSAGES: Record<ErrorCode, { en: string; ar: string }> = {
  unauthorized: { en: "Authentication required", ar: "المصادقة مطلوبة" },
  not_authorized: { en: "You are not authorized to perform this action", ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء" },
  restaurant_mismatch: { en: "Restaurant ownership verification failed", ar: "فشل التحقق من ملكية المطعم" },
  missing_fields: { en: "Required fields are missing", ar: "بعض الحقول المطلوبة غير موجودة" },
  subscription_expired: { en: "Your subscription has expired", ar: "انتهى اشتراكك" },
  server_error: { en: "Server error, please try again", ar: "خطأ في الخادم، يرجى المحاولة مجددًا" },
  unexpected: { en: "An unexpected error occurred", ar: "حدث خطأ غير متوقع" },
};

function errorResponse(code: ErrorCode, status = 400) {
  const messages = ERROR_MESSAGES[code];
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: { code },
      message_en: messages.en,
      message_ar: messages.ar,
    }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

interface RecipeRow {
  menu_item_name: string;
  inventory_item_name: string;
  quantity: number;
  unit: string;
  resolved_inventory_item_id?: string; // Pre-resolved inventory item ID from frontend conflict resolution
}

interface ImportRequest {
  restaurant_id: string;
  branch_id: string;  // Now required
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
    const { restaurant_id, branch_id, rows } = body;

    console.log(`Importing ${rows?.length || 0} rows for restaurant ${restaurant_id}, branch ${branch_id}`);

    // Validate Owner context - both restaurant_id and branch_id required
    const contextValidation = validateOwnerContext({ restaurant_id, branch_id });
    if (!contextValidation.isValid) {
      console.log("Context validation failed:", contextValidation.error);
      return createContextErrorResponse(contextValidation, corsHeaders);
    }

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

    // Validate branch belongs to restaurant
    const { data: branchData, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id")
      .eq("id", branch_id)
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (branchError || !branchData) {
      console.log("Branch validation failed:", branchError);
      return new Response(
        JSON.stringify({
          success: false,
          error: { code: "invalid_branch" },
          message_en: "Branch does not belong to this restaurant",
          message_ar: "الفرع لا ينتمي لهذا المطعم",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check subscription
    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurant_id);
    if (!subscriptionActive) {
      return subscriptionExpiredResponse(corsHeaders);
    }

    if (!rows || rows.length === 0) {
      return errorResponse("missing_fields", 400);
    }

    // Fetch menu items for lookup (restaurant-level)
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

    // Fetch inventory items for lookup - BRANCH LEVEL
    // Inventory items are unique per (restaurant_id, branch_id, name)
    const { data: inventoryItems, error: invError } = await supabase
      .from("inventory_items")
      .select("id, name, base_unit_id")
      .eq("restaurant_id", restaurant_id)
      .eq("branch_id", branch_id);

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
        let inventoryItemId: string;
        
        // If resolved_inventory_item_id is provided, use it directly (conflict was resolved on frontend)
        if (row.resolved_inventory_item_id) {
          inventoryItemId = row.resolved_inventory_item_id;
        } else {
          // Validate inventory item by name lookup (branch-level)
          const invItemKey = row.inventory_item_name.toLowerCase().trim();
          const invItemMatches = inventoryMap.get(invItemKey);
          
          if (!invItemMatches || invItemMatches.length === 0) {
            errors.push({
              menu_item_name: originalMenuItemName,
              inventory_item_name: row.inventory_item_name,
              reason: "Inventory item not found in selected branch",
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
          
          inventoryItemId = invItemMatches[0].id;
        }

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
          inventory_item_id: inventoryItemId,
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
        // Recipes are branch-specific: lookup by (restaurant_id, branch_id, menu_item_id)
        const { data: existingRecipe } = await supabase
          .from("menu_item_recipes")
          .select("id")
          .eq("restaurant_id", restaurant_id)
          .eq("branch_id", branch_id)
          .eq("menu_item_id", menuItemId)
          .maybeSingle();

        let recipeId: string;

        if (existingRecipe) {
          recipeId = existingRecipe.id;
          
          // Delete existing lines for THIS branch's recipe only
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
          // Create new recipe for this specific branch
          const { data: newRecipe, error: createError } = await supabase
            .from("menu_item_recipes")
            .insert({
              restaurant_id,
              menu_item_id: menuItemId,
              branch_id: branch_id,
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
        branch_id,
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
        message_en: recipesFailed === 0 
          ? `Successfully imported ${recipesCreated} recipes`
          : `Imported ${recipesCreated} recipes with ${recipesFailed} failures`,
        message_ar: recipesFailed === 0
          ? `تم استيراد ${recipesCreated} وصفة بنجاح`
          : `تم استيراد ${recipesCreated} وصفة مع ${recipesFailed} أخطاء`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Recipe CSV import error:", error);
    return errorResponse("unexpected", 500);
  }
});
