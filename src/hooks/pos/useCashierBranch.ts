import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CashierBranch {
  id: string;
  name: string;
  code: string | null;
  restaurant_id: string;
}

export function useCashierBranch() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["cashier-branch", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get branch_id from user_roles for cashier
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("branch_id, restaurant_id")
        .eq("user_id", user.id)
        .eq("role", "cashier")
        .maybeSingle();

      if (roleError) throw roleError;
      if (!roleData?.branch_id) return null;

      // Get branch details
      const { data: branch, error: branchError } = await supabase
        .from("restaurant_branches")
        .select("id, name, code, restaurant_id")
        .eq("id", roleData.branch_id)
        .maybeSingle();

      if (branchError) throw branchError;
      return branch as CashierBranch | null;
    },
    enabled: !!user?.id,
  });
}
