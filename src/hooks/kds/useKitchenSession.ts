import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useKitchenSession() {
  const { user } = useAuth();

  const restaurantQuery = useQuery({
    queryKey: ["kitchen-restaurant", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .rpc("get_kitchen_restaurant_id", { _user_id: user.id });

      if (error) {
        console.error("Error fetching kitchen restaurant:", error);
        return null;
      }
      return data as string;
    },
    enabled: !!user?.id,
  });

  const branchQuery = useQuery({
    queryKey: ["kitchen-branch", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("branch_id")
        .eq("user_id", user.id)
        .eq("role", "kitchen")
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("Error fetching kitchen branch:", error);
        return null;
      }
      return data?.branch_id as string | null;
    },
    enabled: !!user?.id,
  });

  return {
    restaurantId: restaurantQuery.data,
    branchId: branchQuery.data,
    isLoading: restaurantQuery.isLoading || branchQuery.isLoading,
    // IMPORTANT: callers can rely on this to know the kitchen session has been
    // *resolved* (even if restaurantId/branchId end up null).
    isFetched: restaurantQuery.isFetched && branchQuery.isFetched,
  };
}
