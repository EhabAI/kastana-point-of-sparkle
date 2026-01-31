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
    const { name, logo_url, start_date, period, bonus_months = 0, reason } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return errorResponse("missing_fields", 400);
    }

    if (!period || !PERIOD_MONTHS[period]) {
      return errorResponse("invalid_format", 400);
    }

    const bonusMonthsNum = Math.min(Math.max(Math.floor(Number(bonus_months) || 0), 0), 6);

    const startDateValue = start_date ? new Date(start_date) : new Date();
    const totalMonths = PERIOD_MONTHS[period] + bonusMonthsNum;
    const endDateValue = new Date(startDateValue);
    endDateValue.setMonth(endDateValue.getMonth() + totalMonths);

    const { data: restaurant, error: restaurantError } = await supabaseAdmin
      .from("restaurants")
      .insert({ 
        name: name.trim(), 
        logo_url: logo_url || null,
        is_active: true 
      })
      .select()
      .single();

    if (restaurantError) {
      console.error("Error creating restaurant:", restaurantError);
      return errorResponse("server_error", 500);
    }

    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from("restaurant_subscriptions")
      .insert({
        restaurant_id: restaurant.id,
        start_date: startDateValue.toISOString(),
        period,
        bonus_months: bonusMonthsNum,
        end_date: endDateValue.toISOString(),
        status: "ACTIVE",
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      await supabaseAdmin.from("restaurants").delete().eq("id", restaurant.id);
      return errorResponse("server_error", 500);
    }

    await supabaseAdmin.from("audit_logs").insert({
      restaurant_id: restaurant.id,
      user_id: user.id,
      action: "SUBSCRIPTION_CREATED",
      entity_type: "restaurant",
      entity_id: restaurant.id,
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
        success: true,
        restaurant, 
        subscription,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return errorResponse("unexpected", 500);
  }
});
