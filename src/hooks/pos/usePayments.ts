import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";

export type PaymentMethod = string;

export function useAddPayment() {
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      method,
      amount,
    }: {
      orderId: string;
      method: PaymentMethod;
      amount: number;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      const { data, error } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          restaurant_id: restaurant.id,
          method,
          amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}

export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}
