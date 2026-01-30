import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Calculate months for each period
const PERIOD_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create client with user's token to verify identity
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client to verify system_admin role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "system_admin")
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Only system admins can renew subscriptions" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body = await req.json();
    const { restaurant_id, period, bonus_months = 0, start_date, reason, notes } = body;

    // Validate required fields
    if (!restaurant_id || typeof restaurant_id !== "string") {
      return new Response(JSON.stringify({ error: "Restaurant ID is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!period || !PERIOD_MONTHS[period]) {
      return new Response(JSON.stringify({ error: "Invalid subscription period. Must be MONTHLY, QUARTERLY, SEMI_ANNUAL, or ANNUAL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bonusMonthsNum = Math.min(Math.max(Math.floor(Number(bonus_months) || 0), 0), 6);

    // Calculate dates - use provided start_date or default to now
    const startDateValue = start_date ? new Date(start_date) : new Date();
    const totalMonths = PERIOD_MONTHS[period] + bonusMonthsNum;
    const endDateValue = new Date(startDateValue);
    endDateValue.setMonth(endDateValue.getMonth() + totalMonths);

    // Check if subscription exists
    const { data: existingSub, error: existingError } = await supabaseAdmin
      .from("restaurant_subscriptions")
      .select("*")
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing subscription:", existingError);
      return new Response(JSON.stringify({ error: "Failed to check subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subscription;

    if (existingSub) {
      // Update existing subscription
      const { data: updatedSub, error: updateError } = await supabaseAdmin
        .from("restaurant_subscriptions")
        .update({
          start_date: startDateValue.toISOString(),
          period,
          bonus_months: bonusMonthsNum,
          end_date: endDateValue.toISOString(),
          status: "ACTIVE",
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("restaurant_id", restaurant_id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating subscription:", updateError);
        return new Response(JSON.stringify({ error: "Failed to renew subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subscription = updatedSub;
    } else {
      // Create new subscription if none exists
      const { data: newSub, error: insertError } = await supabaseAdmin
        .from("restaurant_subscriptions")
        .insert({
          restaurant_id,
          start_date: startDateValue.toISOString(),
          period,
          bonus_months: bonusMonthsNum,
          end_date: endDateValue.toISOString(),
          status: "ACTIVE",
          notes: notes || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating subscription:", insertError);
        return new Response(JSON.stringify({ error: "Failed to create subscription" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      subscription = newSub;
    }

    // Log to audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      restaurant_id,
      user_id: user.id,
      action: "SUBSCRIPTION_RENEWED",
      entity_type: "restaurant",
      entity_id: restaurant_id,
      details: {
        period,
        bonus_months: bonusMonthsNum,
        reason: reason || null,
        start_date: startDateValue.toISOString(),
        end_date: endDateValue.toISOString(),
      },
    });

    return new Response(
      JSON.stringify({ 
        subscription,
        message: "Subscription renewed successfully" 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
