import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { useCashierBranch } from "./useCashierBranch";

export function useCreateRefund() {
  const { data: restaurant } = useCashierRestaurant();
  const { data: branch } = useCashierBranch();
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
      reason: string;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");
      if (!reason?.trim()) throw new Error("Refund reason is required");

      // Check order status - only allow refunds on paid orders
      const { data: order, error: orderCheckError } = await supabase
        .from("orders")
        .select("id, status, total")
        .eq("id", orderId)
        .single();

      if (orderCheckError) throw orderCheckError;
      if (!order) throw new Error("Order not found");
      if (order.status !== "paid") throw new Error("Can only refund paid orders");

      // Get existing refunds to prevent double refund
      const { data: existingRefunds, error: refundsError } = await supabase
        .from("refunds")
        .select("amount")
        .eq("order_id", orderId);

      if (refundsError) throw refundsError;

      const totalRefunded = existingRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      const maxRefundable = Number(order.total) - totalRefunded;

      if (amount > maxRefundable) {
        throw new Error(`Cannot refund more than ${maxRefundable.toFixed(2)}. Already refunded: ${totalRefunded.toFixed(2)}`);
      }

      if (amount <= 0) {
        throw new Error("Refund amount must be greater than zero");
      }

      // Create the refund record
      const { data: refund, error: refundError } = await supabase
        .from("refunds")
        .insert({
          order_id: orderId,
          restaurant_id: restaurant.id,
          branch_id: branch?.id || null,
          amount,
          refund_type: refundType,
          reason: reason.trim(),
        })
        .select()
        .single();

      if (refundError) throw refundError;

      // Update order status to refunded only if fully refunded
      const newTotalRefunded = totalRefunded + amount;
      if (newTotalRefunded >= Number(order.total)) {
        const { error: orderError } = await supabase
          .from("orders")
          .update({ status: "refunded" })
          .eq("id", orderId);

        if (orderError) throw orderError;
      }

      return refund;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}
