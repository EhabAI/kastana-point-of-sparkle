/**
 * Daily Summary Card Component
 * Displays a clear daily summary for restaurant owners
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { startOfDay, endOfDay, format } from "date-fns";
import { formatJOD, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon,
  ClipboardList,
  DollarSign,
  RotateCcw,
  Wallet,
  Info,
  AlertCircle
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
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary-card", restaurantId, format(selectedDate, "yyyy-MM-dd")],
    queryFn: async () => {
      const dayStart = startOfDay(selectedDate).toISOString();
      const dayEnd = endOfDay(selectedDate).toISOString();
      
      // Today's orders
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("id, total, subtotal, status, discount_value")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      // Today's refunds with reasons
      const { data: todayRefunds } = await supabase
        .from("refunds")
        .select("amount, reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      // Today's payments
      const { data: todayPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
      // Get top seller today
      const { data: topSeller } = await supabase
        .from("order_items")
        .select("name, quantity")
        .eq("restaurant_id", restaurantId)
        .eq("voided", false)
        .gte("created_at", dayStart)
        .lt("created_at", dayEnd);
      
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
    if (summary.netRevenue > 0) return "text-green-600 dark:text-green-400";
    if (summary.netRevenue < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };
  
  return (
    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <CalendarIcon className="h-4 w-4 text-blue-600" />
            </div>
            {t.daily_summary_title}
          </CardTitle>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-7 px-2 text-xs bg-white dark:bg-background border-blue-200 dark:border-blue-800/50",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section 1: Operational Activity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <ClipboardList className="h-4 w-4" />
            {t.daily_summary_operational_activity}
          </div>
          <div className="space-y-1.5 text-sm ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_orders_count}:</span>
              <span className="font-medium">{summary.ordersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_refunded_orders_count}:</span>
              <span className="font-medium">{summary.refundedOrdersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_top_seller}:</span>
              <span className="font-medium">{summary.topSellerName || "—"}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 2: Sales */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <DollarSign className="h-4 w-4" />
            {t.daily_summary_sales}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">{t.daily_summary_sales_tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.daily_summary_gross_sales}:</span>
              <span className="font-medium">{formatJOD(summary.grossSales)} {currency}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 3: Refunds */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <RotateCcw className="h-4 w-4" />
            {t.daily_summary_refunds}
          </div>
          <div className="space-y-1.5 text-sm ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_refund_count}:</span>
              <span className="font-medium">{summary.refundCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_refund_total}:</span>
              <span className="font-medium">{formatJOD(summary.refundTotal)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t.daily_summary_top_refund_reason}:</span>
              <span className="font-medium">{summary.topRefundReason || "—"}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 4: Revenue */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <Wallet className="h-4 w-4" />
            {t.daily_summary_revenue}
          </div>
          <div className="ltr:pl-6 rtl:pr-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              {t.daily_summary_revenue_formula}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">{t.daily_summary_net_revenue}:</span>
              <span className={`text-lg font-bold ${getRevenueColor()}`}>
                {summary.netRevenue < 0 ? "-" : ""}{formatJOD(Math.abs(summary.netRevenue))} {currency}
              </span>
            </div>
          </div>
        </div>
        
        {/* Zero Revenue Explanation */}
        {summary.netRevenue === 0 && summary.totalPayments > 0 && (
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg border border-muted">
            <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {t.daily_summary_zero_revenue_explanation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
