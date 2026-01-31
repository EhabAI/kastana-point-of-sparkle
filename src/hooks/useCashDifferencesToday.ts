import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format } from "date-fns";

/**
 * Cash difference data per closed shift
 */
export interface CashDifferenceRow {
  shiftId: string;
  cashierEmail: string;
  expectedCash: number;
  actualCash: number;
  difference: number;
}

export interface CashDifferencesTodayData {
  rows: CashDifferenceRow[];
  totalDifference: number;
  closedShiftsCount: number;
}

/**
 * Fetches cash differences for all closed shifts on a specific date
 * Used exclusively in Owner Dashboard
 */
export function useCashDifferences(restaurantId: string | undefined, date: Date = new Date(), branchId?: string) {
  return useQuery({
    queryKey: ["cash-differences", restaurantId, branchId, format(date, "yyyy-MM-dd")],
    queryFn: async (): Promise<CashDifferencesTodayData> => {
      if (!restaurantId) {
        return { rows: [], totalDifference: 0, closedShiftsCount: 0 };
      }

      const dayStart = startOfDay(date).toISOString();
      const dayEnd = endOfDay(date).toISOString();

      // Get all closed shifts on selected date with cashier profile
      let shiftsQuery = supabase
        .from("shifts")
        .select(`
          id,
          cashier_id,
          opening_cash,
          closing_cash,
          opened_at,
          closed_at
        `)
        .eq("restaurant_id", restaurantId)
        .eq("status", "closed")
        .gte("closed_at", dayStart)
        .lt("closed_at", dayEnd)
        .order("closed_at", { ascending: false });

      if (branchId) {
        shiftsQuery = shiftsQuery.eq("branch_id", branchId);
      }

      const { data: closedShifts, error: shiftsError } = await shiftsQuery;

      if (shiftsError) {
        console.error("Error fetching closed shifts:", shiftsError);
        return { rows: [], totalDifference: 0, closedShiftsCount: 0 };
      }

      if (!closedShifts || closedShifts.length === 0) {
        return { rows: [], totalDifference: 0, closedShiftsCount: 0 };
      }

      // Get cashier emails
      const cashierIds = [...new Set(closedShifts.map(s => s.cashier_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.email || "Unknown"]) || []);

      // Calculate expected cash for each shift
      const rows: CashDifferenceRow[] = [];

      for (const shift of closedShifts) {
        // Get payments for this shift's orders
        const { data: orders } = await supabase
          .from("orders")
          .select("id, payments(*)")
          .eq("shift_id", shift.id)
          .in("status", ["paid", "refunded"]);

        // Get refunds for this shift's orders
        const orderIds = orders?.map(o => o.id) || [];
        let cashRefunds = 0;
        
        if (orderIds.length > 0) {
          const { data: refunds } = await supabase
            .from("refunds")
            .select("amount, order_id")
            .in("order_id", orderIds);

          // Calculate cash refunds (simplified - assume refund goes to original payment method)
          // For accurate calculation, we'd need payment method on refunds
          // For now, allocate refunds proportionally
          for (const refund of refunds || []) {
            const order = orders?.find(o => o.id === refund.order_id);
            const orderPayments = order?.payments || [];
            const cashPayments = orderPayments.filter(p => p.method === "cash");
            const totalPayments = orderPayments.reduce((s, p) => s + Number(p.amount), 0);
            
            if (totalPayments > 0 && cashPayments.length > 0) {
              const cashPortion = cashPayments.reduce((s, p) => s + Number(p.amount), 0) / totalPayments;
              cashRefunds += Number(refund.amount) * cashPortion;
            } else if (orderPayments.length === 0) {
              // Fallback: assume cash
              cashRefunds += Number(refund.amount);
            }
          }
        }

        // Calculate gross cash payments
        const allPayments = orders?.flatMap(o => o.payments || []) || [];
        const grossCashPayments = allPayments
          .filter(p => p.method === "cash")
          .reduce((sum, p) => sum + Number(p.amount), 0);

        // Get cash movements
        const { data: transactions } = await supabase
          .from("shift_transactions")
          .select("type, amount")
          .eq("shift_id", shift.id);

        const cashIn = transactions
          ?.filter(t => t.type === "cash_in")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
        const cashOut = transactions
          ?.filter(t => t.type === "cash_out")
          .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

        // Expected cash = opening + net cash sales + cash in - cash out
        const netCashPayments = grossCashPayments - cashRefunds;
        const expectedCash = Number(shift.opening_cash || 0) + netCashPayments + cashIn - cashOut;
        const actualCash = Number(shift.closing_cash || 0);
        const difference = actualCash - expectedCash;

        rows.push({
          shiftId: shift.id,
          cashierEmail: profileMap.get(shift.cashier_id) || "Unknown",
          expectedCash,
          actualCash,
          difference,
        });
      }

      const totalDifference = rows.reduce((sum, r) => sum + r.difference, 0);

      return {
        rows,
        totalDifference,
        closedShiftsCount: rows.length,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * @deprecated Use useCashDifferences instead
 * Backwards compatibility wrapper for today's date
 */
export function useCashDifferencesToday(restaurantId: string | undefined) {
  return useCashDifferences(restaurantId, new Date());
}
