import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TableCheckoutParams {
  orderIds: string[];
  payments: Array<{ method: string; amount: number }>;
  tableId?: string;
}

interface TableCheckoutResult {
  success: boolean;
  orders: Array<{ id: string; order_number: number }>;
  combinedTotal: number;
  paymentTotal: number;
  change: number;
}

/**
 * Hook for completing table checkout (group pay) - pays all orders on a table at once
 * 
 * Key behaviors:
 * - Accepts array of order IDs to pay together
 * - Single payment flow for combined total
 * - Each order remains separate in database
 * - Atomic: all orders paid or none
 */
export function useTableCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, payments, tableId }: TableCheckoutParams): Promise<TableCheckoutResult> => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const response = await supabase.functions.invoke("complete-table-payment", {
        body: { orderIds, payments, tableId },
      });

      if (response.error) {
        console.error("[useTableCheckout] Edge function error:", response.error);
        throw new Error(response.error.message || "Table checkout failed");
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || "Table checkout failed");
      }

      return response.data as TableCheckoutResult;
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}
