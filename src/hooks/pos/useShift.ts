import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCashierRestaurant } from "./useCashierRestaurant";

export function useCurrentShift() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-shift", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("cashier_id", user.id)
        .eq("status", "open")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useOpenShift() {
  const { user } = useAuth();
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (openingCash: number) => {
      if (!user?.id || !restaurant?.id) throw new Error("Missing user or restaurant");

      const { data, error } = await supabase
        .from("shifts")
        .insert({
          cashier_id: user.id,
          restaurant_id: restaurant.id,
          opening_cash: openingCash,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-shift"] });
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shiftId, closingCash }: { shiftId: string; closingCash: number }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update({
          status: "closed",
          closing_cash: closingCash,
          closed_at: new Date().toISOString(),
        })
        .eq("id", shiftId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-shift"] });
    },
  });
}

export function useCashMovement() {
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shiftId,
      type,
      amount,
      reason,
    }: {
      shiftId: string;
      type: "cash_in" | "cash_out";
      amount: number;
      reason?: string;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      const { data, error } = await supabase
        .from("shift_transactions")
        .insert({
          shift_id: shiftId,
          restaurant_id: restaurant.id,
          type,
          amount,
          reason,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-transactions"] });
    },
  });
}

export function useShiftTransactions(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["shift-transactions", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];

      const { data, error } = await supabase
        .from("shift_transactions")
        .select("*")
        .eq("shift_id", shiftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shiftId,
  });
}
