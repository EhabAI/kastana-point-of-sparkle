import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { restaurant_id } = await req.json();

    if (!restaurant_id) {
      return new Response(
        JSON.stringify({ 
          error: "Restaurant context is missing",
          error_ar: "سياق المطعم غير محدد" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user has owner access to this restaurant
    const { data: ownerRole, error: roleError } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("restaurant_id", restaurant_id)
      .eq("role", "owner")
      .maybeSingle();

    if (roleError || !ownerRole) {
      return new Response(
        JSON.stringify({ error: "You don't have owner access to this restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const deleted: Record<string, number> = {};
    let total = 0;

    // 1. Delete menu_item_recipe_lines (depends on recipes)
    const { data: recipeLines, error: recipeLinesError } = await supabase
      .from("menu_item_recipe_lines")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!recipeLinesError) {
      deleted.menu_item_recipe_lines = recipeLines?.length || 0;
      total += deleted.menu_item_recipe_lines;
    }

    // 2. Delete menu_item_recipes
    const { data: recipes, error: recipesError } = await supabase
      .from("menu_item_recipes")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!recipesError) {
      deleted.menu_item_recipes = recipes?.length || 0;
      total += deleted.menu_item_recipes;
    }

    // 3. Delete inventory_variance_tags
    const { data: varianceTags, error: varianceTagsError } = await supabase
      .from("inventory_variance_tags")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!varianceTagsError) {
      deleted.inventory_variance_tags = varianceTags?.length || 0;
      total += deleted.inventory_variance_tags;
    }

    // 4. Delete inventory_transactions
    const { data: invTxns, error: invTxnsError } = await supabase
      .from("inventory_transactions")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!invTxnsError) {
      deleted.inventory_transactions = invTxns?.length || 0;
      total += deleted.inventory_transactions;
    }

    // 5. Delete inventory_stock_levels
    const { data: stockLevels, error: stockLevelsError } = await supabase
      .from("inventory_stock_levels")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("item_id");
    
    if (!stockLevelsError) {
      deleted.inventory_stock_levels = stockLevels?.length || 0;
      total += deleted.inventory_stock_levels;
    }

    // 6. Delete purchase_receipt_lines (depends on purchase_receipts)
    const { data: purchaseReceipts } = await supabase
      .from("purchase_receipts")
      .select("id")
      .eq("restaurant_id", restaurant_id);
    
    if (purchaseReceipts && purchaseReceipts.length > 0) {
      const receiptIds = purchaseReceipts.map(r => r.id);
      const { data: receiptLines, error: receiptLinesError } = await supabase
        .from("purchase_receipt_lines")
        .delete()
        .in("receipt_id", receiptIds)
        .select("id");
      
      if (!receiptLinesError) {
        deleted.purchase_receipt_lines = receiptLines?.length || 0;
        total += deleted.purchase_receipt_lines;
      }
    }

    // 7. Delete purchase_receipts
    const { data: receipts, error: receiptsError } = await supabase
      .from("purchase_receipts")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!receiptsError) {
      deleted.purchase_receipts = receipts?.length || 0;
      total += deleted.purchase_receipts;
    }

    // 8. Delete inventory_items
    const { data: invItems, error: invItemsError } = await supabase
      .from("inventory_items")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!invItemsError) {
      deleted.inventory_items = invItems?.length || 0;
      total += deleted.inventory_items;
    }

    // 9. Delete inventory_unit_conversions
    const { data: unitConversions, error: unitConversionsError } = await supabase
      .from("inventory_unit_conversions")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!unitConversionsError) {
      deleted.inventory_unit_conversions = unitConversions?.length || 0;
      total += deleted.inventory_unit_conversions;
    }

    // 10. Delete inventory_units
    const { data: invUnits, error: invUnitsError } = await supabase
      .from("inventory_units")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!invUnitsError) {
      deleted.inventory_units = invUnits?.length || 0;
      total += deleted.inventory_units;
    }

    // 11. Get menu categories to find menu items
    const { data: categories } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("restaurant_id", restaurant_id);

    const categoryIds = categories?.map(c => c.id) || [];

    if (categoryIds.length > 0) {
      // 12. Get menu items
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("id")
        .in("category_id", categoryIds);

      const menuItemIds = menuItems?.map(m => m.id) || [];

      if (menuItemIds.length > 0) {
        // 13. Delete combo_items
        const { data: comboItems, error: comboItemsError } = await supabase
          .from("combo_items")
          .delete()
          .in("combo_id", menuItemIds)
          .select("id");
        
        if (!comboItemsError) {
          deleted.combo_items = comboItems?.length || 0;
          total += deleted.combo_items;
        }

        // 14. Delete menu_item_modifier_groups
        const { data: modifierGroups, error: modifierGroupsError } = await supabase
          .from("menu_item_modifier_groups")
          .delete()
          .in("menu_item_id", menuItemIds)
          .select("id");
        
        if (!modifierGroupsError) {
          deleted.menu_item_modifier_groups = modifierGroups?.length || 0;
          total += deleted.menu_item_modifier_groups;
        }

        // 15. Delete branch_menu_items
        const { data: branchMenuItems, error: branchMenuItemsError } = await supabase
          .from("branch_menu_items")
          .delete()
          .in("menu_item_id", menuItemIds)
          .select("id");
        
        if (!branchMenuItemsError) {
          deleted.branch_menu_items = branchMenuItems?.length || 0;
          total += deleted.branch_menu_items;
        }

        // 16. Nullify menu_item_id in order_items (preserve order history)
        const { data: updatedOrderItems, error: orderItemsError } = await supabase
          .from("order_items")
          .update({ menu_item_id: null })
          .in("menu_item_id", menuItemIds)
          .select("id");
        
        if (!orderItemsError && updatedOrderItems) {
          deleted.order_items_nullified = updatedOrderItems.length;
        }

        // 17. Delete menu_items
        const { data: deletedMenuItems, error: menuItemsError } = await supabase
          .from("menu_items")
          .delete()
          .in("category_id", categoryIds)
          .select("id");
        
        if (!menuItemsError) {
          deleted.menu_items = deletedMenuItems?.length || 0;
          total += deleted.menu_items;
        }
      }

      // 18. Delete branch_menu_categories
      const { data: branchCategories, error: branchCategoriesError } = await supabase
        .from("branch_menu_categories")
        .delete()
        .in("category_id", categoryIds)
        .select("id");
      
      if (!branchCategoriesError) {
        deleted.branch_menu_categories = branchCategories?.length || 0;
        total += deleted.branch_menu_categories;
      }

      // 19. Delete menu_categories
      const { data: deletedCategories, error: categoriesError } = await supabase
        .from("menu_categories")
        .delete()
        .eq("restaurant_id", restaurant_id)
        .select("id");
      
      if (!categoriesError) {
        deleted.menu_categories = deletedCategories?.length || 0;
        total += deleted.menu_categories;
      }
    }

    // 20. Delete modifier_options (depends on modifier_groups)
    const { data: modGroups } = await supabase
      .from("modifier_groups")
      .select("id")
      .eq("restaurant_id", restaurant_id);

    if (modGroups && modGroups.length > 0) {
      const modGroupIds = modGroups.map(g => g.id);
      
      const { data: modOptions, error: modOptionsError } = await supabase
        .from("modifier_options")
        .delete()
        .in("modifier_group_id", modGroupIds)
        .select("id");
      
      if (!modOptionsError) {
        deleted.modifier_options = modOptions?.length || 0;
        total += deleted.modifier_options;
      }
    }

    // 21. Delete modifier_groups
    const { data: deletedModGroups, error: modGroupsError } = await supabase
      .from("modifier_groups")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!modGroupsError) {
      deleted.modifier_groups = deletedModGroups?.length || 0;
      total += deleted.modifier_groups;
    }

    // 22. Delete cashiers and kitchen staff (user_roles only, not auth users)
    const { data: staffRoles, error: staffRolesError } = await supabase
      .from("user_roles")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .in("role", ["cashier", "kitchen"])
      .select("id");
    
    if (!staffRolesError) {
      deleted.staff_roles = staffRoles?.length || 0;
      total += deleted.staff_roles;
    }

    // 23. Delete suppliers
    const { data: suppliers, error: suppliersError } = await supabase
      .from("suppliers")
      .delete()
      .eq("restaurant_id", restaurant_id)
      .select("id");
    
    if (!suppliersError) {
      deleted.suppliers = suppliers?.length || 0;
      total += deleted.suppliers;
    }

    deleted.total = total;

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted,
        message: `Successfully deleted ${total} records`
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Owner data reset error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
