import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

export interface OpenOrder {
  id: string;
  order_number: number;
  status: string;
  total: number;
  subtotal: number;
  created_at: string;
  notes: string | null;
  order_notes: string | null;
  order_items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes: string | null;
    voided: boolean;
  }[];
}

export function useOpenOrders(branchId: string | undefined) {
  return useQuery({
    queryKey: ["open-orders", branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, total, subtotal, created_at, notes, order_notes, order_items(id, name, quantity, price, notes, voided)")
        .eq("branch_id", branchId)
        .in("status", ["open", "confirmed"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as OpenOrder[];
    },
    enabled: !!branchId,
  });
}

export function useMoveOrderToTable() {
  const queryClient = useQueryClient();
  const { data: restaurant } = useCashierRestaurant();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      tableId, 
      tableName,
      previousTableId,
      previousTableName,
    }: { 
      orderId: string; 
      tableId: string;
      tableName: string;
      previousTableId?: string;
      previousTableName?: string;
    }) => {
      // Update order notes to reflect new table
      const { data, error } = await supabase
        .from("orders")
        .update({ 
          notes: `table:${tableId}`,
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, tableName, previousTableName };
    },
    onSuccess: async (data) => {
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
          action: "ORDER_TABLE_CHANGED",
          details: { 
            order_number: data.order_number,
            from_table: data.previousTableName || "None",
            to_table: data.tableName,
          } as unknown as Json,
        });
      }
    },
  });
}
