import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  restaurant_id: string;
  is_active: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid Authorization header");
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // User client to verify the JWT
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      console.error("JWT verification failed:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} authenticated successfully`);

    // 2. Check if user is system_admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("User is not a system admin:", roleError);
      return new Response(
        JSON.stringify({ error: "Forbidden: Only system admins can perform this action" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`User ${user.id} verified as system_admin`);

    // 3. Parse request body
    const body: RequestBody = await req.json();
    const { restaurant_id, is_active } = body;

    if (!restaurant_id || typeof is_active !== "boolean") {
      return new Response(
        JSON.stringify({ error: "Invalid request: restaurant_id and is_active are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(restaurant_id)) {
      return new Response(
        JSON.stringify({ error: "Invalid restaurant_id format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Setting restaurant ${restaurant_id} is_active to ${is_active}`);

    // 4. Check if restaurant exists
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, is_active")
      .eq("id", restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error("Restaurant not found:", restaurantError);
      return new Response(
        JSON.stringify({ error: "Restaurant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const previousStatus = restaurant.is_active;

    // 5. Update restaurant is_active status
    const { error: updateRestaurantError } = await supabaseAdmin
      .from("restaurants")
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq("id", restaurant_id);

    if (updateRestaurantError) {
      console.error("Failed to update restaurant:", updateRestaurantError);
      return new Response(
        JSON.stringify({ error: "Failed to update restaurant status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Restaurant ${restaurant_id} is_active updated from ${previousStatus} to ${is_active}`);

    // 6. Update all related user_roles for this restaurant (owners and cashiers)
    // When restaurant becomes inactive, deactivate all user roles
    // When restaurant becomes active, reactivate all user roles
    const { data: updatedRoles, error: updateRolesError } = await supabaseAdmin
      .from("user_roles")
      .update({ is_active })
      .eq("restaurant_id", restaurant_id)
      .in("role", ["owner", "cashier"])
      .select("id, user_id, role");

    if (updateRolesError) {
      console.error("Failed to update user roles:", updateRolesError);
      // Don't fail the entire operation, but log it
    } else {
      console.log(`Updated ${updatedRoles?.length || 0} user roles to is_active=${is_active}`);
    }

    // 7. Insert audit log entry
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
      // Don't fail the operation for audit log errors
    } else {
      console.log("Audit log created successfully");
    }

    // 8. Return success response
    return new Response(
      JSON.stringify({
        success: true,
        message: is_active
          ? "Restaurant activated successfully"
          : "Restaurant deactivated successfully",
        restaurant_id,
        is_active,
        affected_roles: updatedRoles?.length || 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
