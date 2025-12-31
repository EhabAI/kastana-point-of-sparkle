import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export class NoCashierRoleError extends Error {
  constructor() {
    super("NO_CASHIER_ROLE");
    this.name = "NoCashierRoleError";
  }
}

export interface CashierSession {
  restaurant: {
    id: string;
    name: string;
    logo_url: string | null;
  };
  branch: {
    id: string;
    name: string;
    code: string | null;
    restaurant_id: string;
  };
}

export function useCashierSession() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cashier-session", user?.id],
    queryFn: async (): Promise<CashierSession> => {
      if (!user?.id) throw new NoCashierRoleError();

      // Get cashier role with restaurant and branch info from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("restaurant_id, branch_id")
        .eq("user_id", user.id)
        .eq("role", "cashier")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData?.restaurant_id || !roleData?.branch_id) {
        throw new NoCashierRoleError();
      }

      // Fetch restaurant via RPC (bypasses RLS) and branch in parallel
      const [restaurantResult, branchResult] = await Promise.all([
        supabase.rpc("get_public_restaurant", { p_restaurant_id: roleData.restaurant_id }),
        supabase
          .from("restaurant_branches")
          .select("id, name, code, restaurant_id")
          .eq("id", roleData.branch_id)
          .maybeSingle(),
      ]);

      if (restaurantResult.error) throw restaurantResult.error;
      if (!restaurantResult.data || restaurantResult.data.length === 0) {
        throw new Error("Restaurant not found");
      }

      if (branchResult.error) throw branchResult.error;
      if (!branchResult.data) {
        throw new Error("Branch not found");
      }

      // RPC returns array, get first row
      const restaurant = Array.isArray(restaurantResult.data) 
        ? restaurantResult.data[0] 
        : restaurantResult.data;

      return {
        restaurant,
        branch: branchResult.data,
      };
    },
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      // Don't retry if no cashier role
      if (error instanceof NoCashierRoleError) return false;
      return failureCount < 3;
    },
  });
}
