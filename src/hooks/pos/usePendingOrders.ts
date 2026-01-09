import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface PendingOrder {
  id: string;
  order_number: number;
  status: string;
  total: number;
  created_at: string;
  notes: string | null;
  table_id: string | null;
  order_items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

export function usePendingOrders(branchId: string | undefined) {
  return useQuery({
    queryKey: ["pending-orders", branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, created_at, notes, table_id, order_items(id, name, quantity, price)")
        .eq("branch_id", branchId)
        .eq("status", "pending")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as PendingOrder[];
    },
    enabled: !!branchId,
    refetchInterval: 10000, // Poll every 10 seconds for new QR orders
  });
}

export function useConfirmPendingOrder() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("confirm-qr-order", {
        body: { order_id: orderId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });

      // Log to audit
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order",
          entity_id: data.id,
          action: "ORDER_CONFIRMED",
          details: { order_number: data.order_number } as unknown as Json,
        });
      }
    },
  });
}

export function useRejectPendingOrder() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason?: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: "cancelled",
          cancelled_reason: reason || "Rejected by cashier",
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });

      // Log to audit
      if (user?.id && restaurant?.id) {
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          entity_type: "order",
          entity_id: data.id,
          action: "ORDER_REJECTED",
          details: {
            order_number: data.order_number,
            reason: data.cancelled_reason,
          } as unknown as Json,
        });
      }
    },
  });
}
