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
  | "restaurant_not_found"
  | "owner_not_found"
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
  owner_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[system-admin-assign-owner] Missing or invalid Authorization header");
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

    // Verify user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("[system-admin-assign-owner] JWT verification failed:", userError);
      return errorResponse("invalid_token", 401);
    }

    console.log(`[system-admin-assign-owner] User ${user.id} authenticated`);

    // Check system admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[system-admin-assign-owner] User is not a system admin");
      return errorResponse("not_authorized", 403);
    }

    console.log(`[system-admin-assign-owner] User ${user.id} verified as system_admin`);

    // Parse request body
    const body: RequestBody = await req.json();
    const { restaurant_id, owner_id } = body;

    if (!restaurant_id || !owner_id) {
      return errorResponse("invalid_input", 400);
    }

    // Verify restaurant exists and get current owner
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, owner_id")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error("[system-admin-assign-owner] Restaurant not found:", restaurant_id);
      return errorResponse("restaurant_not_found", 404);
    }

    const previousOwnerId = restaurant.owner_id;

    // Verify owner exists and has owner role
    const { data: ownerRole, error: ownerRoleError } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("user_id", owner_id)
      .eq("role", "owner")
      .maybeSingle();

    if (ownerRoleError || !ownerRole) {
      console.error("[system-admin-assign-owner] Owner not found or not an owner:", owner_id);
      return errorResponse("owner_not_found", 404);
    }

    // Get owner email for audit log
    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", owner_id)
      .maybeSingle();

    // Update restaurant with new owner
    const { data: updatedRestaurant, error: updateError } = await supabaseAdmin
      .from("restaurants")
      .update({ 
        owner_id, 
        updated_at: new Date().toISOString() 
      })
      .eq("id", restaurant_id)
      .select()
      .single();

    if (updateError) {
      console.error("[system-admin-assign-owner] Failed to update restaurant:", updateError);
      return errorResponse("server_error", 500);
    }

    console.log(`[system-admin-assign-owner] Restaurant ${restaurant_id} assigned to owner ${owner_id}`);

    // Create audit log
    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurant_id,
      entity_type: "restaurant",
      entity_id: restaurant_id,
      action: "OWNER_ASSIGNED",
      details: {
        restaurant_id,
        restaurant_name: restaurant.name,
        previous_owner_id: previousOwnerId,
        new_owner_id: owner_id,
        new_owner_email: ownerProfile?.email || null,
        assigned_at: new Date().toISOString(),
        assigned_by: user.id,
      },
    });

    if (auditError) {
      console.error("[system-admin-assign-owner] Failed to create audit log:", auditError);
      // Non-fatal - continue
    }

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: updatedRestaurant,
        previous_owner_id: previousOwnerId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[system-admin-assign-owner] Unexpected error:", error);
    return errorResponse("unexpected", 500);
  }
});
