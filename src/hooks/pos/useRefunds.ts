import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierBranch } from "./useCashierBranch";

/**
 * Atomic refund creation - prevents double refunds via race conditions.
 * This hook calls the create-refund edge function which:
 * 1. Validates JWT and user role (cashier/owner)
 * 2. Validates restaurant is active
 * 3. Atomically calculates refundable amount
 * 4. Inserts refund record
 * 5. Updates order status to 'refunded' if fully refunded
 */
export function useCreateRefund() {
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
      if (!reason?.trim()) throw new Error("Refund reason is required");

      // Call the atomic edge function
      const { data, error } = await supabase.functions.invoke("create-refund", {
        body: { 
          orderId, 
          amount, 
          refundType, 
          reason: reason.trim(),
          branchId: branch?.id || null,
        },
      });

      if (error) {
        console.error("[useCreateRefund] Edge function error:", error);
        throw new Error(error.message || "Refund failed");
      }

      if (!data?.success) {
        console.error("[useCreateRefund] Refund rejected:", data?.error);
        throw new Error(data?.error || "Refund failed");
      }

      return {
        refund: data.refund,
        totalRefunded: data.totalRefunded,
        remainingRefundable: data.remainingRefundable,
        isFullyRefunded: data.isFullyRefunded,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
    },
  });
}
