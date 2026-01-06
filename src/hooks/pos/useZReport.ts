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

      // Supported payment methods only (Phase 1)
      // cash → cash bucket
      // visa → card bucket
      // cliq, zain_cash, orange_money, umniah_wallet → mobile bucket
      const SUPPORTED_METHODS = ["cash", "visa", "cliq", "zain_cash", "orange_money", "umniah_wallet"] as const;
      const MOBILE_METHODS = ["cliq", "zain_cash", "orange_money", "umniah_wallet"];

      const getPaymentBucket = (method: string): "cash" | "card" | "mobile" | null => {
        if (method === "cash") return "cash";
        if (method === "visa") return "card";
        if (MOBILE_METHODS.includes(method)) return "mobile";
        // Unsupported method - ignore safely
        return null;
      };

      // Calculate totals
      const paidOrders = orders?.filter(o => o.status === "paid" || o.status === "refunded") || [];
      const cancelledOrders = orders?.filter(o => o.status === "cancelled") || [];

      // Gross totals (before refunds)
      const grossTotalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const grossTotalTax = paidOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
      const grossTotalServiceCharge = paidOrders.reduce((sum, o) => sum + Number(o.service_charge), 0);
      const totalDiscounts = paidOrders.reduce((sum, o) => sum + Number(o.discount_value || 0), 0);
      const grossNetSales = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

      // Gross payment breakdown
      const allPayments = paidOrders.flatMap(o => o.payments || []);
      // Filter to only supported payment methods
      const supportedPayments = allPayments.filter(p => getPaymentBucket(p.method) !== null);
      
      const grossCashPayments = supportedPayments
        .filter(p => getPaymentBucket(p.method) === "cash")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const grossCardPayments = supportedPayments
        .filter(p => getPaymentBucket(p.method) === "card")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const grossMobilePayments = supportedPayments
        .filter(p => getPaymentBucket(p.method) === "mobile")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      // Build order map for refund allocation
      const orderMap = new Map(paidOrders.map(o => [o.id, o]));

      // Calculate refund allocations
      const refundsTotal = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      let cashRefundsAllocated = 0;
      let cardRefundsAllocated = 0;
      let mobileRefundsAllocated = 0;
      let refundTaxTotal = 0;
      let refundServiceTotal = 0;
      let refundSubtotalTotal = 0;

      (refunds || []).forEach(refund => {
        const order = orderMap.get(refund.order_id);
        if (!order) return; // Ignore refunds for orders not in this shift

        const refundAmount = Number(refund.amount);
        const orderTotal = Number(order.total);
        const orderPayments = order.payments || [];

        // Filter to only supported payment methods for this order
        const supportedOrderPayments = orderPayments.filter(p => getPaymentBucket(p.method) !== null);
        const supportedPaymentSum = supportedOrderPayments.reduce((s, p) => s + Number(p.amount), 0);

        // Allocate refund to payment methods proportionally
        if (supportedOrderPayments.length === 0 || supportedPaymentSum === 0) {
          // Fallback: allocate to cash
          cashRefundsAllocated += refundAmount;
        } else if (supportedOrderPayments.length === 1) {
          // Single payment: full refund to that method
          const bucket = getPaymentBucket(supportedOrderPayments[0].method);
          if (bucket === "cash") cashRefundsAllocated += refundAmount;
          else if (bucket === "card") cardRefundsAllocated += refundAmount;
          else if (bucket === "mobile") mobileRefundsAllocated += refundAmount;
        } else {
          // Multiple payments: proportional allocation
          supportedOrderPayments.forEach(p => {
            const proportion = Number(p.amount) / supportedPaymentSum;
            const allocated = refundAmount * proportion;
            const bucket = getPaymentBucket(p.method);
            if (bucket === "cash") cashRefundsAllocated += allocated;
            else if (bucket === "card") cardRefundsAllocated += allocated;
            else if (bucket === "mobile") mobileRefundsAllocated += allocated;
          });
        }

        // Estimate refund parts for tax, service charge, subtotal
        if (orderTotal > 0) {
          refundTaxTotal += refundAmount * (Number(order.tax_amount) / orderTotal);
          refundServiceTotal += refundAmount * (Number(order.service_charge) / orderTotal);
          refundSubtotalTotal += refundAmount * (Number(order.subtotal) / orderTotal);
        }
      });

      // Net payment totals (after refunds)
      const cashPayments = Math.max(0, grossCashPayments - cashRefundsAllocated);
      const cardPayments = Math.max(0, grossCardPayments - cardRefundsAllocated);
      const mobilePayments = Math.max(0, grossMobilePayments - mobileRefundsAllocated);

      // Net sales totals (after refunds)
      const totalSales = Math.max(0, grossTotalSales - refundsTotal);
      const totalTax = Math.max(0, grossTotalTax - refundTaxTotal);
      const totalServiceCharge = Math.max(0, grossTotalServiceCharge - refundServiceTotal);
      const netSales = Math.max(0, grossNetSales - refundSubtotalTotal);

      const cashIn = transactions
        ?.filter(t => t.type === "cash_in")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashOut = transactions
        ?.filter(t => t.type === "cash_out")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Expected cash uses net cash payments (after refunds allocated to cash)
      const expectedCash = Number(shift.opening_cash) + cashPayments + cashIn - cashOut;
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
