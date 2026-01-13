import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ToggleRequest {
  restaurantId: string;
  enabled: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      console.error("[toggle-inventory-module] Missing authorization header");
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user token for auth validation
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate JWT and get user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("[toggle-inventory-module] Auth error:", authError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service role client for DB operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check user role - ONLY system_admin can toggle this flag
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      console.error("[toggle-inventory-module] Unauthorized - not a system_admin:", user.id);
      return new Response(
        JSON.stringify({ success: false, error: "Only System Admins can toggle the inventory module" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body: ToggleRequest = await req.json();
    const { restaurantId, enabled } = body;

    // Validate required fields
    if (!restaurantId || typeof enabled !== "boolean") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields: restaurantId (string), enabled (boolean)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate restaurant exists
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .select("id, name")
      .eq("id", restaurantId)
      .single();

    if (restaurantError || !restaurant) {
      console.error("[toggle-inventory-module] Restaurant not found:", restaurantId);
      return new Response(
        JSON.stringify({ success: false, error: "Restaurant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if settings exist for this restaurant
    const { data: existingSettings, error: settingsCheckError } = await supabase
      .from("restaurant_settings")
      .select("id, inventory_enabled")
      .eq("restaurant_id", restaurantId)
      .maybeSingle();

    if (settingsCheckError) {
      console.error("[toggle-inventory-module] Settings check error:", settingsCheckError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to check restaurant settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const previousValue = existingSettings?.inventory_enabled ?? false;

    // Skip if no change needed
    if (previousValue === enabled) {
      console.log(`[toggle-inventory-module] No change needed - already ${enabled ? "enabled" : "disabled"}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          changed: false,
          inventory_enabled: enabled,
          message: `Inventory module is already ${enabled ? "enabled" : "disabled"}` 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from("restaurant_settings")
        .update({ 
          inventory_enabled: enabled,
          updated_at: new Date().toISOString()
        })
        .eq("restaurant_id", restaurantId);

      if (updateError) {
        console.error("[toggle-inventory-module] Update error:", updateError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to update settings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Insert new settings row
      const { error: insertError } = await supabase
        .from("restaurant_settings")
        .insert({
          restaurant_id: restaurantId,
          inventory_enabled: enabled,
        });

      if (insertError) {
        console.error("[toggle-inventory-module] Insert error:", insertError);
        return new Response(
          JSON.stringify({ success: false, error: "Failed to create settings" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Write audit log
    const action = enabled ? "INVENTORY_MODULE_ENABLED" : "INVENTORY_MODULE_DISABLED";
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      restaurant_id: restaurantId,
      entity_type: "restaurant_settings",
      entity_id: restaurantId,
      action: action,
      details: {
        system_admin_id: user.id,
        restaurant_id: restaurantId,
        restaurant_name: restaurant.name,
        previous_value: previousValue,
        new_value: enabled,
        timestamp: new Date().toISOString(),
      },
    });

    console.log(`[toggle-inventory-module] Success: ${action} for restaurant ${restaurantId} by admin ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        changed: true,
        inventory_enabled: enabled,
        message: `Inventory module ${enabled ? "enabled" : "disabled"} for restaurant: ${restaurant.name}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[toggle-inventory-module] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
