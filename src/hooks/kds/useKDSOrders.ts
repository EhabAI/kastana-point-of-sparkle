import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export type KDSOrderStatus = "new" | "in_progress" | "ready";

export interface KDSOrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  voided: boolean;
}

export interface KDSOrder {
  id: string;
  order_number: number;
  source: string;
  status: string;
  table_id: string | null;
  table_name?: string;
  created_at: string;
  order_notes: string | null;
  items: KDSOrderItem[];
}

export function useKDSOrders(restaurantId: string | null, branchId: string | null) {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["kds-orders", restaurantId, branchId],
    queryFn: async () => {
      if (!restaurantId) return [];

      let query = supabase
        .from("orders")
        .select(`
          id,
          order_number,
          source,
          status,
          table_id,
          created_at,
          order_notes,
          restaurant_tables(table_name),
          order_items(id, name, quantity, notes, voided)
        `)
        .eq("restaurant_id", restaurantId)
        .in("status", ["new", "in_progress", "ready"])
        .order("created_at", { ascending: true });

      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching KDS orders:", error);
        throw error;
      }

      return (data || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        source: order.source,
        status: order.status,
        table_id: order.table_id,
        table_name: order.restaurant_tables?.table_name,
        created_at: order.created_at,
        order_notes: order.order_notes,
        items: (order.order_items || []).filter((item: any) => !item.voided),
      })) as KDSOrder[];
    },
    enabled: !!restaurantId,
    refetchInterval: 30000, // Fallback polling every 30s
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel("kds-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log("KDS order update:", payload);
          queryClient.invalidateQueries({ queryKey: ["kds-orders", restaurantId, branchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, branchId, queryClient]);

  return ordersQuery;
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: KDSOrderStatus }) => {
      const { error } = await supabase
        .from("orders")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
    },
  });
}
