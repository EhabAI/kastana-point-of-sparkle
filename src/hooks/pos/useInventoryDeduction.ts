import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DeductionWarning {
  inventory_item_id: string;
  name: string;
  current_on_hand: number;
  required: number;
  new_on_hand: number;
}

export interface DeductionResult {
  success: boolean;
  warnings: DeductionWarning[];
  error: string | null;
  deducted_count: number;
  cogs_computed: boolean;
}

/**
 * Hook to trigger inventory deduction after successful payment.
 * This should be called AFTER payment is confirmed successful.
 * The deduction is non-blocking - if it fails, payment is still valid.
 */
export function useInventoryDeduction() {
  return useMutation({
    mutationFn: async (orderId: string): Promise<DeductionResult> => {
      try {
        const { data, error } = await supabase.functions.invoke("inventory-deduct-for-order", {
          body: { order_id: orderId },
        });

        if (error) {
          console.error("[useInventoryDeduction] Edge function error:", error);
          return {
            success: false,
            warnings: [],
            error: error.message || "Inventory deduction failed",
            deducted_count: 0,
            cogs_computed: false,
          };
        }

        return data as DeductionResult;
      } catch (err) {
        console.error("[useInventoryDeduction] Unexpected error:", err);
        return {
          success: false,
          warnings: [],
          error: err instanceof Error ? err.message : "Unexpected error",
          deducted_count: 0,
          cogs_computed: false,
        };
      }
    },
  });
}
