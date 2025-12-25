import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";

export function useCreateRefund() {
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      amount,
      refundType,
      reason,
    }: {
      orderId: string;
      amount: number;
      refundType: "full" | "partial";
      reason?: string;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      // Create the refund record
      const { data: refund, error: refundError } = await supabase
        .from("refunds")
        .insert({
          order_id: orderId,
          restaurant_id: restaurant.id,
          amount,
          refund_type: refundType,
          reason,
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Update order status to refunded
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "refunded" })
        .eq("id", orderId);

      if (orderError) throw orderError;

      return refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}
