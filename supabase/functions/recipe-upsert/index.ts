import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
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
  | "missing_fields"
  | "server_error"
  | "unexpected";

function errorResponse(code: ErrorCode, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code } }),
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
    const { restaurant_id, menu_item_id, lines, notes, is_active = true } = body;

    if (roleData.role === "owner" && roleData.restaurant_id !== restaurant_id) {
      return errorResponse("restaurant_mismatch", 403);
    }

    if (!restaurant_id || !menu_item_id) {
      return errorResponse("missing_fields", 400);
    }

    const { isActive: subscriptionActive } = await checkSubscriptionActive(restaurant_id);
    if (!subscriptionActive) {
      console.error("[recipe-upsert] Restaurant subscription expired");
      return subscriptionExpiredResponse(corsHeaders);
    }

    const { data: existingRecipe } = await supabase
      .from("menu_item_recipes")
      .select("id")
      .eq("restaurant_id", restaurant_id)
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
          restaurant_id,
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
        console.error("[recipe-upsert] Lines insert error:", linesError);
        return errorResponse("server_error", 500);
      }
    }

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
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[recipe-upsert] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
