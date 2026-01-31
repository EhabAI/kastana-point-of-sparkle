import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ResolveOwnerRestaurantArgs = {
  supabaseAdmin: SupabaseClient;
  userId: string;
  requestedRestaurantId?: string | null;
};

/**
 * Resolve which restaurant an OWNER-scoped function should operate on.
 *
 * Priority:
 * 1) Explicit restaurant id passed from client (validated via restaurants.owner_id)
 * 2) user_roles.owner.restaurant_id (legacy)
 * 3) First restaurant owned by the user (fallback)
 */
export async function resolveOwnerRestaurantId({
  supabaseAdmin,
  userId,
  requestedRestaurantId,
}: ResolveOwnerRestaurantArgs): Promise<{ restaurantId: string | null; error?: string }> {
  // 1) Explicit restaurant id from client
  if (requestedRestaurantId) {
    const { data, error } = await supabaseAdmin
      .from("restaurants")
      .select("id")
      .eq("id", requestedRestaurantId)
      .eq("owner_id", userId)
      .maybeSingle();

    if (error) {
      console.error("[owner-restaurant] Failed to validate restaurant ownership:", error);
      return { restaurantId: null, error: "server_error" };
    }

    if (!data?.id) {
      return { restaurantId: null, error: "not_authorized" };
    }

    return { restaurantId: data.id as string };
  }

  // 2) Legacy: user_roles (some projects store owner restaurant_id here)
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("restaurant_id")
    .eq("user_id", userId)
    .eq("role", "owner")
    .not("restaurant_id", "is", null)
    .maybeSingle();

  if (roleError) {
    console.error("[owner-restaurant] Failed to read user_roles:", roleError);
    // Don't fail hard; fall back to restaurants.owner_id.
  } else if (roleData?.restaurant_id) {
    return { restaurantId: roleData.restaurant_id as string };
  }

  // 3) Fallback: first restaurant owned by user
  const { data: ownedRestaurants, error: ownedError } = await supabaseAdmin
    .from("restaurants")
    .select("id")
    .eq("owner_id", userId)
    .order("created_at", { ascending: true })
    .limit(1);

  if (ownedError) {
    console.error("[owner-restaurant] Failed to resolve owned restaurants:", ownedError);
    return { restaurantId: null, error: "server_error" };
  }

  const firstId = ownedRestaurants?.[0]?.id as string | undefined;
  if (!firstId) return { restaurantId: null, error: "not_authorized" };
  return { restaurantId: firstId };
}
