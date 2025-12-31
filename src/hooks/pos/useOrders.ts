import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";

export function useCurrentOrder(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["current-order", shiftId],
    queryFn: async () => {
      if (!shiftId) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
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

export function useHeldOrders(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["held-orders", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];

      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("shift_id", shiftId)
        .eq("status", "held")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
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
        .select("*, order_items(*), payments(*)")
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
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      shiftId, 
      taxRate, 
      branchId, 
      notes 
    }: { 
      shiftId: string; 
      taxRate: number; 
      branchId?: string;
      notes?: string;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      const { data, error } = await supabase
        .from("orders")
        .insert({
          shift_id: shiftId,
          restaurant_id: restaurant.id,
          branch_id: branchId || null,
          status: "open",
          tax_rate: taxRate,
          order_notes: notes || null,
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
    },
  });
}
