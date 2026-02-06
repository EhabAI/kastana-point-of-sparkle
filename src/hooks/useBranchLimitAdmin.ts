import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

export interface RestaurantBranchInfo {
  restaurantId: string;
  maxBranchesAllowed: number | null;
  currentBranchCount: number;
}

export function useRestaurantBranchInfo(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["restaurant-branch-info", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      // Get restaurant info
      const { data: restaurant, error: restaurantError } = await supabase
        .from("restaurants")
        .select("max_branches_allowed")
        .eq("id", restaurantId)
        .single();

      if (restaurantError) throw restaurantError;

      // Count current branches
      const { count, error: countError } = await supabase
        .from("restaurant_branches")
        .select("id", { count: "exact", head: true })
        .eq("restaurant_id", restaurantId);

      if (countError) throw countError;

      return {
        restaurantId,
        maxBranchesAllowed: restaurant?.max_branches_allowed ?? null,
        currentBranchCount: count ?? 0,
      } as RestaurantBranchInfo;
    },
    enabled: !!restaurantId,
  });
}

export function useAllRestaurantsBranchInfo() {
  return useQuery({
    queryKey: ["all-restaurants-branch-info"],
    queryFn: async () => {
      // Get all restaurants with branch limits
      const { data: restaurants, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, max_branches_allowed");

      if (restaurantError) throw restaurantError;

      // Get branch counts per restaurant
      const { data: branches, error: branchError } = await supabase
        .from("restaurant_branches")
        .select("restaurant_id");

      if (branchError) throw branchError;

      // Count branches per restaurant
      const branchCounts = new Map<string, number>();
      branches?.forEach((b) => {
        const current = branchCounts.get(b.restaurant_id) ?? 0;
        branchCounts.set(b.restaurant_id, current + 1);
      });

      // Create map of restaurant info
      const infoMap = new Map<string, RestaurantBranchInfo>();
      restaurants?.forEach((r) => {
        infoMap.set(r.id, {
          restaurantId: r.id,
          maxBranchesAllowed: r.max_branches_allowed,
          currentBranchCount: branchCounts.get(r.id) ?? 0,
        });
      });

      return infoMap;
    },
  });
}

export function useUpdateBranchLimit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      maxBranchesAllowed,
    }: {
      restaurantId: string;
      maxBranchesAllowed: number | null;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "system-admin-update-branch-limit",
        {
          body: {
            restaurant_id: restaurantId,
            max_branches_allowed: maxBranchesAllowed,
          },
        }
      );

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error.code || "Failed to update branch limit");

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-restaurants-branch-info"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-branch-info"] });
      queryClient.invalidateQueries({ queryKey: ["branch-limit"] });
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      toast({ title: t("sa_branch_limit_updated") });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
