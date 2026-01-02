import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCurrentOrder(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["current-order", shiftId],
    queryFn: async () => {
      if (!shiftId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*, order_item_modifiers(*))")
        .eq("shift_id", shiftId)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!shiftId,
  });
}

export interface HeldOrder {
  id: string;
  order_number: number;
  status: string;
  created_at: string;
  total: number;
  subtotal: number;
  notes: string | null;
  order_notes: string | null;
  table_id: string | null;
  order_items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
    notes: string | null;
    voided: boolean;
  }[];
}

export function useHeldOrders(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["held-orders", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, status, created_at, total, subtotal, notes, order_notes, table_id, order_items(id, name, quantity, price, notes, voided)")
        .eq("shift_id", shiftId)
        .eq("status", "held")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as HeldOrder[];
    },
    enabled: !!shiftId,
  });
}

export function useRecentOrders(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["recent-orders", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*), payments(*), refunds(*)")
        .eq("shift_id", shiftId)
        .in("status", ["paid", "refunded"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!shiftId,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      shiftId, 
      taxRate, 
      branchId,
      restaurantId,
      orderType,
      tableId,
      customerInfo,
    }: { 
      shiftId: string; 
      taxRate: number; 
      branchId?: string;
      restaurantId: string;
      orderType?: string;
      tableId?: string | null;
      customerInfo?: { name: string; phone: string };
    }) => {

      // Build notes from order type and customer info (NOT table - use table_id column)
      const noteParts: string[] = [];
      
      if (orderType && !tableId) {
        noteParts.push(`type:${orderType}`);
      }
      
      // Add customer info for takeaway orders
      if (customerInfo && (customerInfo.name || customerInfo.phone)) {
        noteParts.push(`customer:${customerInfo.name}|${customerInfo.phone}`);
      }

      const notes = noteParts.length > 0 ? noteParts.join(";") : null;

      const { data, error } = await supabase
        .from("orders")
        .insert({
          shift_id: shiftId,
          restaurant_id: restaurantId,
          branch_id: branchId || null,
          status: "open",
          tax_rate: taxRate,
          order_notes: notes,
          table_id: tableId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      updates,
    }: {
      orderId: string;
      updates: {
        subtotal?: number;
        discount_type?: string | null;
        discount_value?: number | null;
        tax_amount?: number;
        service_charge?: number;
        total?: number;
        status?: string;
        notes?: string | null;
        cancelled_reason?: string | null;
      };
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["held-orders"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}

export function useHoldOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "held" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["held-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    },
  });
}

export function useResumeOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "open" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["held-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "cancelled", cancelled_reason: reason })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["held-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
    },
  });
}

export function useVoidOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      if (!reason?.trim()) {
        throw new Error("Void reason is required");
      }

      // Check order status - only allow void on open orders
      const { data: order, error: checkError } = await supabase
        .from("orders")
        .select("id, status, order_number, total")
        .eq("id", orderId)
        .single();

      if (checkError) throw checkError;
      if (!order) throw new Error("Order not found");
      if (order.status !== "open") {
        throw new Error("Can only void open orders");
      }

      const { data, error } = await supabase
        .from("orders")
        .update({ status: "voided", cancelled_reason: reason.trim() })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return { ...data, order_number: order.order_number, total: order.total };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["held-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
    },
  });
}

export function useReopenOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "open" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
    },
  });
}
