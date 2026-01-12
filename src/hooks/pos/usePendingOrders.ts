import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Use secure edge function - handles JWT auth, shift validation, and audit logging
      const { data, error } = await supabase.functions.invoke("confirm-qr-order", {
        body: { order_id: orderId },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Audit logging is handled by edge function
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}

export function useRejectPendingOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      // Reason is now required
      if (!reason.trim()) {
        throw new Error("Rejection reason is required");
      }
      
      // Use secure edge function instead of direct update
      const { data, error } = await supabase.functions.invoke("reject-qr-order", {
        body: { order_id: orderId, reason: reason.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      // Audit logging is handled by edge function
      queryClient.invalidateQueries({ queryKey: ["pending-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
    },
  });
}
