import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user from the token
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !userData.user) {
      console.error("Invalid token:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = userData.user.id;
    console.log("Caller user ID:", callerId);

    // Parse request body
    const { role_id, is_active, restaurant_id } = await req.json();

    if (!role_id || is_active === undefined || !restaurant_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: role_id, is_active, restaurant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updating cashier status: role_id=${role_id}, is_active=${is_active}, restaurant_id=${restaurant_id}`);

    // Verify caller is the owner of this restaurant
    const { data: callerRole, error: callerRoleError } = await supabase
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", callerId)
      .eq("role", "owner")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (callerRoleError || !callerRole) {
      console.error("Caller is not the owner of this restaurant:", callerRoleError);
      return new Response(
        JSON.stringify({ error: "Not authorized to manage cashiers for this restaurant" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the target role belongs to this restaurant and is a cashier
    const { data: targetRole, error: targetRoleError } = await supabase
      .from("user_roles")
      .select("id, user_id, role, restaurant_id, is_active")
      .eq("id", role_id)
      .eq("restaurant_id", restaurant_id)
      .eq("role", "cashier")
      .maybeSingle();

    if (targetRoleError || !targetRole) {
      console.error("Target cashier not found:", targetRoleError);
      return new Response(
        JSON.stringify({ error: "Cashier not found in this restaurant" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get cashier email for audit log
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", targetRole.user_id)
      .maybeSingle();

    const previousStatus = targetRole.is_active;

    // Update the cashier status
    const { error: updateError } = await supabase
      .from("user_roles")
      .update({ is_active })
      .eq("id", role_id);

    if (updateError) {
      console.error("Failed to update cashier status:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update cashier status" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Cashier status updated successfully: ${previousStatus} -> ${is_active}`);

    // Log the audit entry
    const { error: auditError } = await supabase
      .from("audit_logs")
      .insert({
        user_id: callerId,
        restaurant_id,
        entity_type: "user_role",
        entity_id: role_id,
        action: "CASHIER_STATUS_CHANGED",
        details: {
          cashier_user_id: targetRole.user_id,
          cashier_email: profile?.email || null,
          previous_status: previousStatus,
          new_status: is_active,
        },
      });

    if (auditError) {
      console.error("Failed to log audit entry (non-fatal):", auditError);
    } else {
      console.log("Audit log entry created for CASHIER_STATUS_CHANGED");
    }

    return new Response(
      JSON.stringify({ success: true, is_active }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    console.error("Error in update-cashier-status:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
