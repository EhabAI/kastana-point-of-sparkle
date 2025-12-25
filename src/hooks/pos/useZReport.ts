import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ZReportData {
  shiftId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  
  // Sales summary
  totalOrders: number;
  totalSales: number;
  totalTax: number;
  totalServiceCharge: number;
  totalDiscounts: number;
  netSales: number;
  
  // Payment breakdown
  cashPayments: number;
  cardPayments: number;
  mobilePayments: number;
  
  // Other
  cancelledOrders: number;
  refundsTotal: number;
  cashIn: number;
  cashOut: number;
  
  // Expected vs actual
  expectedCash: number;
  cashDifference: number;
}

export function useZReport(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["z-report", shiftId],
    queryFn: async (): Promise<ZReportData | null> => {
      if (!shiftId) return null;

      // Get shift data
      const { data: shift, error: shiftError } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", shiftId)
        .single();

      if (shiftError) throw shiftError;

      // Get all orders for this shift
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("*, payments(*)")
        .eq("shift_id", shiftId);

      if (ordersError) throw ordersError;

      // Get refunds for orders in this shift
      const orderIds = orders?.map(o => o.id) || [];
      const { data: refunds, error: refundsError } = await supabase
        .from("refunds")
        .select("*")
        .in("order_id", orderIds.length > 0 ? orderIds : ['00000000-0000-0000-0000-000000000000']);

      if (refundsError) throw refundsError;

      // Get cash movements
      const { data: transactions, error: transError } = await supabase
        .from("shift_transactions")
        .select("*")
        .eq("shift_id", shiftId);

      if (transError) throw transError;

      // Calculate totals
      const paidOrders = orders?.filter(o => o.status === "paid") || [];
      const cancelledOrders = orders?.filter(o => o.status === "cancelled") || [];

      const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const totalTax = paidOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
      const totalServiceCharge = paidOrders.reduce((sum, o) => sum + Number(o.service_charge), 0);
      const totalDiscounts = paidOrders.reduce((sum, o) => sum + Number(o.discount_value || 0), 0);
      const netSales = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

      // Payment breakdown
      const allPayments = paidOrders.flatMap(o => o.payments || []);
      const cashPayments = allPayments
        .filter(p => p.method === "cash")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const cardPayments = allPayments
        .filter(p => p.method === "card")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const mobilePayments = allPayments
        .filter(p => p.method === "mobile")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const refundsTotal = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;

      const cashIn = transactions
        ?.filter(t => t.type === "cash_in")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashOut = transactions
        ?.filter(t => t.type === "cash_out")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const expectedCash = Number(shift.opening_cash) + cashPayments + cashIn - cashOut - refundsTotal;
      const closingCash = shift.closing_cash ? Number(shift.closing_cash) : null;
      const cashDifference = closingCash !== null ? closingCash - expectedCash : 0;

      return {
        shiftId,
        openedAt: shift.opened_at,
        closedAt: shift.closed_at,
        openingCash: Number(shift.opening_cash),
        closingCash,
        totalOrders: paidOrders.length,
        totalSales,
        totalTax,
        totalServiceCharge,
        totalDiscounts,
        netSales,
        cashPayments,
        cardPayments,
        mobilePayments,
        cancelledOrders: cancelledOrders.length,
        refundsTotal,
        cashIn,
        cashOut,
        expectedCash,
        cashDifference,
      };
    },
    enabled: !!shiftId,
  });
}
