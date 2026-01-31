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
  | "subscription_expired"
  | "restaurant_mismatch"
  | "branch_mismatch"
  | "missing_fields"
  | "invalid_menu_item"
  | "invalid_inventory_item"
  | "server_error"
  | "unexpected";

// Bilingual error messages
const ERROR_MESSAGES: Record<ErrorCode, { en: string; ar: string }> = {
  unauthorized: { en: "Authentication required", ar: "المصادقة مطلوبة" },
  not_authorized: { en: "You are not authorized to perform this action", ar: "ليس لديك صلاحية لتنفيذ هذا الإجراء" },
  subscription_expired: { en: "Your subscription has expired", ar: "انتهى اشتراكك" },
  restaurant_mismatch: { en: "Restaurant ownership verification failed", ar: "فشل التحقق من ملكية المطعم" },
  branch_mismatch: { en: "Branch does not belong to this restaurant", ar: "الفرع لا ينتمي لهذا المطعم" },
  missing_fields: { en: "Required fields are missing", ar: "بعض الحقول المطلوبة غير موجودة" },
  invalid_menu_item: { en: "Menu item not found in this restaurant", ar: "الصنف غير موجود في هذا المطعم" },
  invalid_inventory_item: { en: "One or more inventory items do not belong to the selected branch", ar: "عنصر أو أكثر من المخزون لا ينتمي للفرع المحدد" },
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

interface RecipeLine {
  inventory_item_id: string;
  qty: number;
  unit_id: string;
}

interface RecipeRequest {
  restaurant_id: string;
  branch_id: string;
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("unauthorized", 401);
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return errorResponse("unauthorized", 401);
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .in("role", ["owner", "system_admin"])
      .maybeSingle();

    if (roleError || !roleData) {
      return errorResponse("not_authorized", 403);
    }

    const body: RecipeRequest = await req.json();
    const { restaurant_id, branch_id, menu_item_id, lines, notes, is_active = true } = body;

    // Validate Owner context - both restaurant_id and branch_id required
    const contextValidation = validateOwnerContext({ restaurant_id, branch_id });
    if (!contextValidation.isValid) {
      console.log("[recipe-upsert] Context validation failed:", contextValidation.error);
      return createContextErrorResponse(contextValidation, corsHeaders);
    }

    if (!menu_item_id) {
      return errorResponse("missing_fields", 400);
    }

    // For owners, validate restaurant ownership using the shared helper
    let resolvedRestaurantId = restaurant_id;
    if (roleData.role === "owner") {
      const { restaurantId: resolvedId, error: resolveError } = await resolveOwnerRestaurantId({
        supabaseAdmin: supabase,
        userId: user.id,
        requestedRestaurantId: restaurant_id,
      });

      if (resolveError || !resolvedId) {
        console.log("[recipe-upsert] Restaurant resolution error:", resolveError);
        return errorResponse("restaurant_mismatch", 403);
      }
      resolvedRestaurantId = resolvedId;
    }

    // Validate branch belongs to restaurant
    const { data: branchData, error: branchError } = await supabase
      .from("restaurant_branches")
      .select("id")
      .eq("id", branch_id)
      .eq("restaurant_id", resolvedRestaurantId)
      .maybeSingle();

    if (branchError || !branchData) {
      console.log("[recipe-upsert] Branch validation failed:", branchError);
      return errorResponse("branch_mismatch", 400);
    }

    // Check subscription using resolved restaurant ID
    const { isActive: subscriptionActive } = await checkSubscriptionActive(resolvedRestaurantId);
    if (!subscriptionActive) {
      console.error("[recipe-upsert] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    // Validate menu item belongs to restaurant
    const { data: menuItem, error: menuItemError } = await supabase
      .from("menu_items")
      .select("id, menu_categories!inner(restaurant_id)")
      .eq("id", menu_item_id)
      .eq("menu_categories.restaurant_id", resolvedRestaurantId)
      .maybeSingle();

    if (menuItemError || !menuItem) {
      console.log("[recipe-upsert] Menu item not found:", menuItemError);
      return errorResponse("invalid_menu_item", 400);
    }

    // Validate inventory items belong to the selected branch
    if (lines && lines.length > 0) {
      const inventoryItemIds = lines.map(l => l.inventory_item_id);
      
      const { data: inventoryItems, error: invError } = await supabase
        .from("inventory_items")
        .select("id, base_unit_id")
        .in("id", inventoryItemIds)
        .eq("restaurant_id", resolvedRestaurantId)
        .eq("branch_id", branch_id);

      if (invError) {
        console.error("[recipe-upsert] Inventory items error:", invError);
        return errorResponse("server_error", 500);
      }

      // Check all items were found in the correct branch
      if (!inventoryItems || inventoryItems.length !== inventoryItemIds.length) {
        console.log("[recipe-upsert] Inventory item mismatch:", inventoryItems?.length, "vs", inventoryItemIds.length);
        return errorResponse("invalid_inventory_item", 400);
      }
    }

    // Look for existing recipe by (restaurant_id, branch_id, menu_item_id)
    const { data: existingRecipe } = await supabase
      .from("menu_item_recipes")
      .select("id")
      .eq("restaurant_id", resolvedRestaurantId)
      .eq("branch_id", branch_id)
      .eq("menu_item_id", menu_item_id)
      .maybeSingle();

    let recipeId: string;
    let isNew = false;

    if (existingRecipe) {
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
        console.error("[recipe-upsert] Update error:", updateError);
        return errorResponse("server_error", 500);
      }

      const { error: deleteError } = await supabase
        .from("menu_item_recipe_lines")
        .delete()
        .eq("recipe_id", recipeId);

      if (deleteError) {
        console.error("[recipe-upsert] Delete lines error:", deleteError);
        return errorResponse("server_error", 500);
      }
    } else {
      isNew = true;
      const { data: newRecipe, error: insertError } = await supabase
        .from("menu_item_recipes")
        .insert({
          restaurant_id: resolvedRestaurantId,
          branch_id: branch_id,
          menu_item_id,
          notes,
          is_active,
        })
        .select("id")
        .single();

      if (insertError || !newRecipe) {
        console.error("[recipe-upsert] Insert error:", insertError);
        return errorResponse("server_error", 500);
      }

      recipeId = newRecipe.id;
    }

    if (lines && lines.length > 0) {
      const inventoryItemIds = lines.map(l => l.inventory_item_id);
      
      const { data: inventoryItems, error: invError } = await supabase
        .from("inventory_items")
        .select("id, base_unit_id")
        .in("id", inventoryItemIds);

      if (invError) {
        console.error("[recipe-upsert] Inventory items error:", invError);
        return errorResponse("server_error", 500);
      }

      const inventoryMap = new Map(inventoryItems?.map(i => [i.id, i.base_unit_id]) || []);

      const linesToInsert = lines.map(line => {
        const baseUnitId = inventoryMap.get(line.inventory_item_id);
        const qtyInBase = line.unit_id === baseUnitId ? line.qty : line.qty;
        
        return {
          restaurant_id: resolvedRestaurantId,
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
        console.error("[recipe-upsert] Lines insert error:", linesError);
        return errorResponse("server_error", 500);
      }
    }

    await supabase.from("audit_logs").insert({
      restaurant_id: resolvedRestaurantId,
      user_id: user.id,
      action: isNew ? "RECIPE_CREATED" : "RECIPE_UPDATED",
      entity_type: "menu_item_recipe",
      entity_id: recipeId,
      details: {
        branch_id,
        menu_item_id,
        lines_count: lines?.length || 0,
      },
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        recipe_id: recipeId, 
        is_new: isNew,
        message_en: isNew ? "Recipe created successfully" : "Recipe updated successfully",
        message_ar: isNew ? "تم إنشاء الوصفة بنجاح" : "تم تحديث الوصفة بنجاح",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[recipe-upsert] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
