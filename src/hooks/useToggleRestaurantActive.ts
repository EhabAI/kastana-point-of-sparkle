import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ToggleParams {
  restaurantId: string;
  isActive: boolean;
}

/**
 * Hook for System Admin to toggle restaurant active status
 */
export function useToggleRestaurantActive() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ restaurantId, isActive }: ToggleParams) => {
      // Update restaurant active status
      const { data, error } = await supabase
        .from("restaurants")
        .update({ is_active: isActive })
        .eq("id", restaurantId)
        .select()
        .single();

      if (error) throw error;

      // Log audit event
      if (user) {
        const { error: auditError } = await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurantId,
          entity_type: "restaurant",
          entity_id: restaurantId,
          action: isActive ? "RESTAURANT_ACTIVATED" : "RESTAURANT_DEACTIVATED",
          details: {
            previous: !isActive,
            next: isActive,
            toggled_at: new Date().toISOString(),
          },
        });

        if (auditError) {
          console.error("Failed to log audit event:", auditError);
        }
      }

      return data;
    },
    onSuccess: (_, { isActive }) => {
      queryClient.invalidateQueries({ queryKey: ["restaurants"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-active-status"] });
      queryClient.invalidateQueries({ queryKey: ["public-restaurant-active-status"] });
      toast({
        title: isActive ? "Restaurant Activated" : "Restaurant Deactivated",
        description: isActive
          ? "Restaurant is now active. Staff can access the system."
          : "Restaurant is now inactive. All access has been blocked.",
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
