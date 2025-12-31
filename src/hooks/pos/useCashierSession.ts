import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
    queryFn: async (): Promise<CashierSession | null> => {
      if (!user?.id) return null;

      // Get cashier role with restaurant and branch info from user_roles
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("restaurant_id, branch_id")
        .eq("user_id", user.id)
        .eq("role", "cashier")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData?.restaurant_id) return null;

      // Fetch restaurant and branch in parallel
      const [restaurantResult, branchResult] = await Promise.all([
        supabase
          .from("restaurants")
          .select("id, name, logo_url")
          .eq("id", roleData.restaurant_id)
          .maybeSingle(),
        roleData.branch_id
          ? supabase
              .from("restaurant_branches")
              .select("id, name, code, restaurant_id")
              .eq("id", roleData.branch_id)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (restaurantResult.error) throw restaurantResult.error;
      if (!restaurantResult.data) return null;

      if (branchResult.error) throw branchResult.error;
      if (!branchResult.data) return null;

      return {
        restaurant: restaurantResult.data,
        branch: branchResult.data,
      };
    },
    enabled: !!user?.id,
  });
}
