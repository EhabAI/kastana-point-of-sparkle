import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ToggleParams {
  restaurantId: string;
  isActive: boolean;
}

/**
 * Hook for System Admin to toggle restaurant active status via Edge Function.
 * This atomically updates the restaurant status and all related user_roles,
 * and creates an audit log entry.
 */
export function useToggleRestaurantActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ restaurantId, isActive }: ToggleParams) => {
      // Get the current session for the JWT
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error("Not authenticated");
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke("set-restaurant-active", {
        body: {
          restaurant_id: restaurantId,
          is_active: isActive,
        },
      });

      if (error) {
        console.error("Edge function error:", error);
        throw new Error(error.message || "Failed to update restaurant status");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to update restaurant status");
      }

      return data;
    },
    onSuccess: (data, { isActive }) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-active-status"] });
      queryClient.invalidateQueries({ queryKey: ["public-restaurant-active-status"] });
      
      toast({
        title: isActive ? "Restaurant Activated" : "Restaurant Deactivated",
        description: isActive
          ? "Restaurant is now active. Staff can access the system."
          : `Restaurant is now inactive. ${data.affected_roles || 0} staff account(s) have been blocked.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating restaurant status",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
