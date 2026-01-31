import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode = 
  | "missing_auth"
  | "invalid_token"
  | "not_authorized"
  | "invalid_input"
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

interface RequestBody {
  restaurant_id: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return errorResponse("missing_auth", 401);
    }

    const jwt = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("JWT verification failed:", userError);
      return errorResponse("invalid_token", 401);
    }

    console.log(`User ${user.id} authenticated successfully`);

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not a system admin:", roleError);
      return errorResponse("not_authorized", 403);
    }

    console.log(`User ${user.id} verified as system_admin`);

    const body: RequestBody = await req.json();
    const { restaurant_id, is_active } = body;

    if (!restaurant_id || typeof is_active !== "boolean") {
      return errorResponse("invalid_input", 400);
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurant_id)) {
      return errorResponse("invalid_format", 400);
    }

    console.log(`Setting restaurant ${restaurant_id} is_active to ${is_active}`);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, is_active")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error("Restaurant not found:", restaurantError);
      return errorResponse("restaurant_not_found", 404);
    }

    const previousStatus = restaurant.is_active;

    const { error: updateRestaurantError } = await supabaseAdmin
      .from("restaurants")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", restaurant_id);

    if (updateRestaurantError) {
      console.error("Failed to update restaurant:", updateRestaurantError);
      return errorResponse("server_error", 500);
    }

    console.log(`Restaurant ${restaurant_id} is_active updated from ${previousStatus} to ${is_active}`);

    const { data: updatedRoles, error: updateRolesError } = await supabaseAdmin
      .from("user_roles")
      .update({ is_active })
      .eq("restaurant_id", restaurant_id)
      .in("role", ["owner", "cashier"])
      .select("id, user_id, role");

    if (updateRolesError) {
      console.error("Failed to update user roles:", updateRolesError);
    } else {
      console.log(`Updated ${updatedRoles?.length || 0} user roles to is_active=${is_active}`);
    }

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurant_id,
      entity_type: "restaurant",
      entity_id: restaurant_id,
      action: "RESTAURANT_STATUS_CHANGED",
      details: {
        restaurant_id,
        restaurant_name: restaurant.name,
        previous_status: previousStatus,
        new_status: is_active,
        affected_roles: updatedRoles?.length || 0,
        changed_at: new Date().toISOString(),
      },
    });

    if (auditError) {
      console.error("Failed to create audit log:", auditError);
    } else {
      console.log("Audit log created successfully");
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant_id,
        is_active,
        affected_roles: updatedRoles?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
