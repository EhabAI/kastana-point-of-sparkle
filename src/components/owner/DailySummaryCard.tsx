/**
 * Daily Summary Card Component
 * Displays a clear daily summary for restaurant owners
 * Redesigned for at-a-glance clarity with key metrics prominent
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { startOfDay, endOfDay, format } from "date-fns";
import { formatJOD, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Calendar as CalendarIcon,
  ClipboardList,
  Wallet,
  ChevronDown,
  TrendingUp,
  ShoppingCart,
  RotateCcw,
  HelpCircle
} from "lucide-react";
import en from "@/locales/en";
import ar from "@/locales/ar";

const translations = { en, ar } as const;

interface DailySummaryCardProps {
  restaurantId: string;
  currency?: string;
}

export function DailySummaryCard({ restaurantId, currency = "JOD" }: DailySummaryCardProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { selectedBranch } = useBranchContextSafe();
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [detailsOpen, setDetailsOpen] = useState(false);
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary-card", restaurantId, selectedBranch?.id, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();
      
      // Today's orders
      let ordersQuery = supabase
        .from("orders")
        .select("id, total, subtotal, status, discount_value")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      if (selectedBranch?.id) {
        ordersQuery = ordersQuery.eq("branch_id", selectedBranch.id);
      }
      
      const { data: todayOrders } = await ordersQuery;
      
      // Today's refunds with reasons
      let refundsQuery = supabase
        .from("refunds")
        .select("amount, reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      if (selectedBranch?.id) {
        refundsQuery = refundsQuery.eq("branch_id", selectedBranch.id);
      }
      
      const { data: todayRefunds } = await refundsQuery;
      
      // Today's payments
      let paymentsQuery = supabase
        .from("payments")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      if (selectedBranch?.id) {
        paymentsQuery = paymentsQuery.eq("branch_id", selectedBranch.id);
      }
      
      const { data: todayPayments } = await paymentsQuery;
      
      // Get top seller today - join via order_id to filter by branch
      const orderIds = todayOrders?.filter(o => o.status === "paid").map(o => o.id) || [];
      let topSeller: { name: string; quantity: number }[] | null = null;
      
      if (orderIds.length > 0) {
        const { data } = await supabase
          .from("order_items")
          .select("name, quantity")
          .eq("voided", false)
          .in("order_id", orderIds);
        topSeller = data;
      }
      
      // Calculate stats
      const paidOrders = todayOrders?.filter(o => o.status === "paid") || [];
      const refundedOrders = todayOrders?.filter(o => o.status === "refunded") || [];
      
      // Gross sales (total of all paid orders before any deductions)
      const grossSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      
      // Refunds
      const refundCount = todayRefunds?.length || 0;
      const refundTotal = todayRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      // Top refund reason
      const refundReasons = todayRefunds?.reduce((acc, r) => {
        const reason = r.reason || t.daily_summary_unspecified;
        acc[reason] = (acc[reason] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topRefundReason = Object.entries(refundReasons)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
      
      // Total payments received
      const totalPayments = todayPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      
      // Net revenue = total payments - total refunds
      const netRevenue = totalPayments - refundTotal;
      
      // Top seller calculation
      const itemCounts = topSeller?.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topSellerName = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
      
      return {
        ordersCount: paidOrders.length,
        refundedOrdersCount: refundedOrders.length,
        topSellerName,
        grossSales,
        refundCount,
        refundTotal,
        topRefundReason,
        netRevenue,
        totalPayments,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000,
  });
  
  if (isLoading) {
    return (
      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </div>
            {t.daily_summary_title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-blue-100 dark:bg-blue-900/30 rounded w-3/4"></div>
            <div className="h-4 bg-blue-100 dark:bg-blue-900/30 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!summary) {
    return null;
  }
  
  const getRevenueColor = () => {
    if (summary.netRevenue > 0) return "text-emerald-600 dark:text-emerald-400";
    if (summary.netRevenue < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };
  
  return (
    <Card data-trainer="daily-summary" className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 border h-full">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <div className="p-1 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
            </div>
            {t.daily_summary_title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">{t.daily_summary_sales_tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs bg-white dark:bg-background border-blue-200 dark:border-blue-800/50",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                  {format(selectedDate, language === "ar" ? "d MMM" : "MMM d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-3 pb-3 pt-0">
        {/* PRIMARY: 3 Key Metrics - Large and Prominent */}
        <div className="grid grid-cols-3 gap-3">
          {/* Total Sales */}
          <div className="bg-white/60 dark:bg-background/40 rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                {t.daily_summary_gross_sales}
              </span>
            </div>
            <p className="text-lg font-bold text-blue-600 tabular-nums">
              {formatJOD(summary.grossSales)}
            </p>
            <p className="text-[10px] text-muted-foreground">{currency}</p>
          </div>
          
          {/* Number of Orders */}
          <div className="bg-white/60 dark:bg-background/40 rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <ShoppingCart className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                {t.daily_summary_orders_count}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground tabular-nums">
              {summary.ordersCount}
            </p>
            <p className="text-[10px] text-muted-foreground">{language === "ar" ? "طلب" : "orders"}</p>
          </div>
          
          {/* Net Revenue */}
          <div className="bg-white/60 dark:bg-background/40 rounded-lg p-2.5 text-center border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Wallet className="h-3 w-3 text-blue-500" />
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                {t.daily_summary_net_revenue}
              </span>
            </div>
            <p className={`text-lg font-bold tabular-nums ${getRevenueColor()}`}>
              {summary.netRevenue < 0 ? "-" : ""}{formatJOD(Math.abs(summary.netRevenue))}
            </p>
            <p className="text-[10px] text-muted-foreground">{currency}</p>
          </div>
        </div>
        
        {/* SECONDARY: Collapsible Details */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-1.5 w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1">
              <ChevronDown className={cn("h-3 w-3 transition-transform", detailsOpen && "rotate-180")} />
              <span className="font-medium">
                {detailsOpen 
                  ? (language === "ar" ? "إخفاء التفاصيل" : "Hide details") 
                  : (language === "ar" ? "عرض التفاصيل" : "Show details")
                }
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 pt-2">
            {/* Operational Activity */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <ClipboardList className="h-3 w-3" />
                {t.daily_summary_operational_activity}
              </div>
              <div className="space-y-0.5 text-[11px] ltr:pl-4 rtl:pr-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.daily_summary_refunded_orders_count}:</span>
                  <span className="font-medium">{summary.refundedOrdersCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.daily_summary_top_seller}:</span>
                  <span className="font-medium truncate max-w-[120px]">{summary.topSellerName || "—"}</span>
                </div>
              </div>
            </div>
            
            {/* Refunds */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-blue-600">
                <RotateCcw className="h-3 w-3" />
                {t.daily_summary_refunds}
              </div>
              <div className="space-y-0.5 text-[11px] ltr:pl-4 rtl:pr-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.daily_summary_refund_count}:</span>
                  <span className="font-medium">{summary.refundCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.daily_summary_refund_total}:</span>
                  <span className="font-medium">{formatJOD(summary.refundTotal)} {currency}</span>
                </div>
                {summary.topRefundReason && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t.daily_summary_top_refund_reason}:</span>
                    <span className="font-medium truncate max-w-[100px]">{summary.topRefundReason}</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Revenue Formula */}
            <p className="text-[10px] text-muted-foreground/70 leading-tight ltr:pl-4 rtl:pr-4 italic">
              {t.daily_summary_revenue_formula}
            </p>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
