import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Check if a restaurant's subscription is active
 * Uses the is_restaurant_active RPC function which checks both:
 * - restaurant.is_active flag
 * - Valid subscription in restaurant_subscriptions (end_date >= now())
 * 
 * @param restaurantId - The restaurant ID to check
 * @returns { isActive: boolean, error?: string }
 */
export async function checkSubscriptionActive(
  restaurantId: string
): Promise<{ isActive: boolean; error?: string }> {
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const { data, error } = await supabaseAdmin.rpc("is_restaurant_active", {
      p_restaurant_id: restaurantId,
    });

    if (error) {
      console.error("[subscription-guard] RPC error:", error);
      return { isActive: false, error: error.message };
    }

    return { isActive: data === true };
  } catch (e) {
    console.error("[subscription-guard] Exception:", e);
    return { isActive: false, error: "Failed to check subscription status" };
  }
}

/**
 * Returns a 403 response for expired subscriptions
 * Consistent format across all edge functions
 */
export function subscriptionExpiredResponse(corsHeaders: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: "Subscription expired",
      code: "SUBSCRIPTION_EXPIRED",
    }),
    {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}
