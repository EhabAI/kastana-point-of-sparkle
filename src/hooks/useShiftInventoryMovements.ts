import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Inventory movement summary for a shift period
 * Groups transactions by type and calculates IN/OUT totals
 */
export interface InventoryMovementSummary {
  txnType: string;
  totalIn: number;
  totalOut: number;
  netMovement: number;
  transactionCount: number;
}

export interface ShiftInventoryData {
  movements: InventoryMovementSummary[];
  totalIn: number;
  totalOut: number;
  netMovement: number;
}

/**
 * Fetches inventory movements for a specific shift period
 * Used in Z Report to show daily inventory summary
 */
export function useShiftInventoryMovements(
  shiftId: string | undefined,
  restaurantId: string | undefined,
  branchId: string | undefined
) {
  return useQuery({
    queryKey: ["shift-inventory-movements", shiftId, restaurantId, branchId],
    queryFn: async (): Promise<ShiftInventoryData | null> => {
      if (!shiftId || !restaurantId) return null;

      // First get the shift to know the time period
      const { data: shift, error: shiftError } = await supabase
        .from("shifts")
        .select("opened_at, closed_at")
        .eq("id", shiftId)
        .single();

      if (shiftError || !shift) {
        console.error("Error fetching shift:", shiftError);
        return null;
      }

      // Build query for inventory transactions during shift period
      let query = supabase
        .from("inventory_transactions")
        .select("txn_type, qty, qty_in_base")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", shift.opened_at);

      // If shift is closed, limit to that period
      if (shift.closed_at) {
        query = query.lte("created_at", shift.closed_at);
      }

      // Filter by branch if specified
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data: transactions, error: txnError } = await query;

      if (txnError) {
        console.error("Error fetching inventory transactions:", txnError);
        return null;
      }

      // Group by transaction type and calculate IN/OUT
      const movementMap = new Map<string, InventoryMovementSummary>();

      (transactions || []).forEach((tx: any) => {
        const type = tx.txn_type;
        const qty = Number(tx.qty_in_base || tx.qty);

        if (!movementMap.has(type)) {
          movementMap.set(type, {
            txnType: type,
            totalIn: 0,
            totalOut: 0,
            netMovement: 0,
            transactionCount: 0,
          });
        }

        const entry = movementMap.get(type)!;
        entry.transactionCount += 1;

        if (qty > 0) {
          entry.totalIn += qty;
        } else {
          entry.totalOut += Math.abs(qty);
        }
        entry.netMovement += qty;
      });

      const movements = Array.from(movementMap.values());

      // Calculate totals
      const totalIn = movements.reduce((sum, m) => sum + m.totalIn, 0);
      const totalOut = movements.reduce((sum, m) => sum + m.totalOut, 0);
      const netMovement = movements.reduce((sum, m) => sum + m.netMovement, 0);

      return {
        movements,
        totalIn,
        totalOut,
        netMovement,
      };
    },
    enabled: !!shiftId && !!restaurantId,
  });
}
