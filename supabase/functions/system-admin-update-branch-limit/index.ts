import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode =
  | "missing_auth"
  | "invalid_token"
  | "not_authorized"
  | "missing_fields"
  | "invalid_format"
  | "restaurant_not_found"
  | "server_error"
  | "unexpected";

function errorResponse(code: ErrorCode, status = 400) {
  return new Response(
    JSON.stringify({ success: false, error: { code } }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("missing_auth", 401);
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return errorResponse("invalid_token", 401);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify system_admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return errorResponse("not_authorized", 403);
    }

    const body = await req.json();
    const { restaurant_id, max_branches_allowed } = body;

    if (!restaurant_id || typeof restaurant_id !== "string") {
      return errorResponse("missing_fields", 400);
    }

    // max_branches_allowed can be null (unlimited) or a positive integer
    let limitValue: number | null = null;
    if (max_branches_allowed !== null && max_branches_allowed !== undefined) {
      const parsed = parseInt(max_branches_allowed, 10);
      if (isNaN(parsed) || parsed < 1) {
        return errorResponse("invalid_format", 400);
      }
      limitValue = parsed;
    }

    // Check restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, max_branches_allowed")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error("Restaurant not found:", restaurantError);
      return errorResponse("restaurant_not_found", 404);
    }

    const previousLimit = restaurant.max_branches_allowed;

    // Update the restaurant
    const { error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ max_branches_allowed: limitValue })
      .eq("id", restaurant_id);

    if (updateError) {
      console.error("Error updating restaurant:", updateError);
      return errorResponse("server_error", 500);
    }

    // Audit log
    await supabaseAdmin.from("audit_logs").insert({
      restaurant_id,
      user_id: user.id,
      action: "RESTAURANT_BRANCH_LIMIT_UPDATED",
      entity_type: "restaurant",
      entity_id: restaurant_id,
      details: {
        previous_limit: previousLimit,
        new_limit: limitValue,
        restaurant_name: restaurant.name,
      },
    });

    console.log(`Branch limit updated for restaurant ${restaurant_id}: ${previousLimit} -> ${limitValue}`);

    return new Response(
      JSON.stringify({
        success: true,
        restaurant_id,
        max_branches_allowed: limitValue,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("unexpected", 500);
  }
});
