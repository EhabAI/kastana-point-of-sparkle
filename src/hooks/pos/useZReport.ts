import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Z Report Data Structure - Market-Correct Accounting
 * 
 * Accounting Logic:
 * - Gross = All paid/refunded orders BEFORE deducting refunds
 * - Net/Adjusted = Gross MINUS refunds (what actually stays in business)
 * 
 * Example Sanity Check:
 * - 3 orders: 10 JOD, 20 JOD, 30 JOD (total 60 JOD gross)
 * - 1 refund of 15 JOD on the 20 JOD order
 * - Adjusted total = 60 - 15 = 45 JOD
 * - If all paid by cash: Gross cash = 60, Refund allocated to cash = 15, Net cash = 45
 */
export interface ZReportData {
  shiftId: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  
  // Orders count
  totalOrders: number;
  cancelledOrders: number;
  refundCount: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // GROSS SALES (Before Refunds) - What was originally sold
  // ═══════════════════════════════════════════════════════════════════
  grossSales: number;          // Sum of all order totals (before refunds)
  grossNetSales: number;       // Sum of order subtotals (before tax/service)
  grossTax: number;            // Sum of order tax amounts
  grossServiceCharge: number;  // Sum of order service charges
  totalDiscounts: number;      // Sum of order discounts (already applied in order totals)
  
  // Gross payment breakdown
  grossCashPayments: number;
  grossCardPayments: number;
  grossMobilePayments: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // REFUNDS SECTION - What was returned
  // ═══════════════════════════════════════════════════════════════════
  refundsTotal: number;        // Total refunded amount
  refundTax: number;           // Estimated tax portion of refunds
  refundServiceCharge: number; // Estimated service charge portion
  refundSubtotal: number;      // Estimated subtotal portion
  
  // Refund allocation by payment method
  cashRefunds: number;
  cardRefunds: number;
  mobileRefunds: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // ADJUSTED TOTALS (After Refunds) - What business actually keeps
  // ═══════════════════════════════════════════════════════════════════
  adjustedSales: number;       // Gross sales - refunds total
  adjustedNetSales: number;    // Gross net sales - refund subtotal
  adjustedTax: number;         // Gross tax - refund tax
  adjustedServiceCharge: number;
  
  // Net payment totals (after refunds)
  netCashPayments: number;
  netCardPayments: number;
  netMobilePayments: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // CASH DRAWER
  // ═══════════════════════════════════════════════════════════════════
  cashIn: number;
  cashOut: number;
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

      // ═══════════════════════════════════════════════════════════════════
      // PAYMENT METHOD BUCKETING
      // ═══════════════════════════════════════════════════════════════════
      const MOBILE_METHODS = ["cliq", "zain_cash", "orange_money", "umniah_wallet"];

      const getPaymentBucket = (method: string): "cash" | "card" | "mobile" | null => {
        if (method === "cash") return "cash";
        if (method === "visa") return "card";
        if (MOBILE_METHODS.includes(method)) return "mobile";
        return null;
      };

      // ═══════════════════════════════════════════════════════════════════
      // ORDER CATEGORIZATION
      // ═══════════════════════════════════════════════════════════════════
      // Include both "paid" and "refunded" orders in gross calculations
      // "refunded" status means full refund was processed on that order
      const paidOrders = orders?.filter(o => o.status === "paid" || o.status === "refunded") || [];
      const cancelledOrders = orders?.filter(o => o.status === "cancelled") || [];

      // ═══════════════════════════════════════════════════════════════════
      // GROSS CALCULATIONS (Before Refunds)
      // ═══════════════════════════════════════════════════════════════════
      const grossSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const grossTax = paidOrders.reduce((sum, o) => sum + Number(o.tax_amount), 0);
      const grossServiceCharge = paidOrders.reduce((sum, o) => sum + Number(o.service_charge), 0);
      
      // Calculate discount amounts correctly based on discount_type
      // If percentage: discount_amount = subtotal * (discount_value / 100)
      // If fixed: discount_amount = discount_value
      const totalDiscounts = paidOrders.reduce((sum, o) => {
        const discountValue = Number(o.discount_value || 0);
        if (discountValue <= 0) return sum;
        
        if (o.discount_type === "percentage") {
          // Percentage discount: calculate actual amount from subtotal
          const subtotal = Number(o.subtotal);
          return sum + (subtotal * discountValue / 100);
        } else {
          // Fixed discount: use discount_value directly
          return sum + discountValue;
        }
      }, 0);
      
      const grossNetSales = paidOrders.reduce((sum, o) => sum + Number(o.subtotal), 0);

      // Gross payment breakdown by method
      const allPayments = paidOrders.flatMap(o => o.payments || []);
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

      // ═══════════════════════════════════════════════════════════════════
      // REFUND ALLOCATION
      // ═══════════════════════════════════════════════════════════════════
      // Build order map for refund allocation
      const orderMap = new Map(paidOrders.map(o => [o.id, o]));

      const refundCount = refunds?.length || 0;
      const refundsTotal = refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      let cashRefunds = 0;
      let cardRefunds = 0;
      let mobileRefunds = 0;
      let refundTax = 0;
      let refundServiceCharge = 0;
      let refundSubtotal = 0;

      /**
       * Refund Allocation Logic:
       * 
       * Since refunds table doesn't store payment_method, we derive it from the
       * original order's payment(s):
       * - Single payment: allocate full refund to that method
       * - Multiple payments: proportional allocation by payment amount
       * 
       * Tax/Service/Subtotal estimation:
       * - Use ratio of refund amount to order total to estimate portions
       * - Example: Order 100 JOD (Tax 16 JOD), Refund 50 JOD → Refund tax ≈ 8 JOD
       */
      (refunds || []).forEach(refund => {
        const order = orderMap.get(refund.order_id);
        if (!order) return;

        const refundAmount = Number(refund.amount);
        const orderTotal = Number(order.total);
        const orderPayments = order.payments || [];

        const supportedOrderPayments = orderPayments.filter(p => getPaymentBucket(p.method) !== null);
        const supportedPaymentSum = supportedOrderPayments.reduce((s, p) => s + Number(p.amount), 0);

        // Allocate refund to payment methods
        if (supportedOrderPayments.length === 0 || supportedPaymentSum === 0) {
          // Fallback: assume cash (conservative for drawer calculation)
          cashRefunds += refundAmount;
        } else if (supportedOrderPayments.length === 1) {
          const bucket = getPaymentBucket(supportedOrderPayments[0].method);
          if (bucket === "cash") cashRefunds += refundAmount;
          else if (bucket === "card") cardRefunds += refundAmount;
          else if (bucket === "mobile") mobileRefunds += refundAmount;
        } else {
          // Proportional allocation for split payments
          supportedOrderPayments.forEach(p => {
            const proportion = Number(p.amount) / supportedPaymentSum;
            const allocated = refundAmount * proportion;
            const bucket = getPaymentBucket(p.method);
            if (bucket === "cash") cashRefunds += allocated;
            else if (bucket === "card") cardRefunds += allocated;
            else if (bucket === "mobile") mobileRefunds += allocated;
          });
        }

        // Estimate refund breakdown (tax, service, subtotal) proportionally
        // This is the best-available method without schema changes
        if (orderTotal > 0) {
          const ratio = refundAmount / orderTotal;
          refundTax += Number(order.tax_amount) * ratio;
          refundServiceCharge += Number(order.service_charge) * ratio;
          refundSubtotal += Number(order.subtotal) * ratio;
        }
      });

      // ═══════════════════════════════════════════════════════════════════
      // ADJUSTED CALCULATIONS (After Refunds)
      // ═══════════════════════════════════════════════════════════════════
      // IMPORTANT: Do NOT clamp to zero - negative values reveal data mismatches
      // that accounting must surface for investigation
      const adjustedSales = grossSales - refundsTotal;
      const adjustedNetSales = grossNetSales - refundSubtotal;
      const adjustedTax = grossTax - refundTax;
      const adjustedServiceCharge = grossServiceCharge - refundServiceCharge;

      // Net payment totals - allow negative to reveal over-refund situations
      const netCashPayments = grossCashPayments - cashRefunds;
      const netCardPayments = grossCardPayments - cardRefunds;
      const netMobilePayments = grossMobilePayments - mobileRefunds;

      // ═══════════════════════════════════════════════════════════════════
      // CASH DRAWER RECONCILIATION
      // ═══════════════════════════════════════════════════════════════════
      const cashIn = transactions
        ?.filter(t => t.type === "cash_in")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const cashOut = transactions
        ?.filter(t => t.type === "cash_out")
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      /**
       * Expected Cash Calculation (Market Standard):
       * Opening + Net Cash Sales (after refunds) + Cash In - Cash Out
       * 
       * Note: cashRefunds are already subtracted from netCashPayments,
       * so we use netCashPayments directly (not double-subtract).
       */
      const expectedCash = Number(shift.opening_cash) + netCashPayments + cashIn - cashOut;
      const closingCash = shift.closing_cash !== null ? Number(shift.closing_cash) : null;
      const cashDifference = closingCash !== null ? closingCash - expectedCash : 0;

      return {
        shiftId,
        openedAt: shift.opened_at,
        closedAt: shift.closed_at,
        openingCash: Number(shift.opening_cash),
        closingCash,
        
        totalOrders: paidOrders.length,
        cancelledOrders: cancelledOrders.length,
        refundCount,
        
        // Gross
        grossSales,
        grossNetSales,
        grossTax,
        grossServiceCharge,
        totalDiscounts,
        grossCashPayments,
        grossCardPayments,
        grossMobilePayments,
        
        // Refunds
        refundsTotal,
        refundTax,
        refundServiceCharge,
        refundSubtotal,
        cashRefunds,
        cardRefunds,
        mobileRefunds,
        
        // Adjusted
        adjustedSales,
        adjustedNetSales,
        adjustedTax,
        adjustedServiceCharge,
        netCashPayments,
        netCardPayments,
        netMobilePayments,
        
        // Cash drawer
        cashIn,
        cashOut,
        expectedCash,
        cashDifference,
      };
    },
    enabled: !!shiftId,
  });
}
