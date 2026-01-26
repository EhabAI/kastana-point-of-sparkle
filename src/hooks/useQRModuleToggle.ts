import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Hook to get all restaurants' QR Order status
export function useAllRestaurantsQRStatus() {
  return useQuery({
    queryKey: ["all-restaurants-qr-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("restaurant_id, qr_order_enabled");

      if (error) throw error;

      const statusMap = new Map<string, boolean>();
      (data || []).forEach((row) => {
        statusMap.set(row.restaurant_id, row.qr_order_enabled ?? false);
      });

      return statusMap;
    },
  });
}

// Hook to check if QR Order is enabled for a specific restaurant (authenticated user)
export function useQROrderEnabled(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["qr-order-enabled", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return false;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("qr_order_enabled")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching QR order enabled status:", error);
        return false;
      }

      return data?.qr_order_enabled ?? false;
    },
    enabled: !!restaurantId,
  });
}

// Hook for public access to check QR enabled (uses RPC function)
export function usePublicQROrderEnabled(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["public-qr-order-enabled", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return false;

      const { data, error } = await supabase.rpc("public_is_qr_enabled", {
        p_restaurant_id: restaurantId,
      });

      if (error) {
        console.error("Error fetching public QR order enabled status:", error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!restaurantId,
    staleTime: 30000,
  });
}

// Hook to toggle QR Order module for a restaurant (System Admin only)
export function useToggleQRModule() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ restaurantId, enabled }: { restaurantId: string; enabled: boolean }) => {
      const { data, error } = await supabase.functions.invoke("toggle-qr-module", {
        body: { restaurantId, enabled },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["all-restaurants-qr-status"] });
      queryClient.invalidateQueries({ queryKey: ["qr-order-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["public-qr-order-enabled"] });
      queryClient.invalidateQueries({ queryKey: ["restaurant-settings"] });
      toast({
        title: variables.enabled ? "QR Order Enabled" : "QR Order Disabled",
        description: `QR Order module has been ${variables.enabled ? "activated" : "deactivated"}.`,
      });
    },
    onError: (error) => {
      console.error("Toggle QR module error:", error);
      toast({
        title: "Error",
        description: "Failed to update QR Order setting.",
        variant: "destructive",
      });
    },
  });
}
