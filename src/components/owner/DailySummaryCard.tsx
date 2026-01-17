/**
 * Daily Summary Card Component
 * Displays a clear daily summary for restaurant owners
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { startOfDay, endOfDay, format } from "date-fns";
import { formatJOD } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { 
  Calendar,
  ClipboardList,
  DollarSign,
  RotateCcw,
  Wallet,
  Info,
  AlertCircle
} from "lucide-react";

interface DailySummaryCardProps {
  restaurantId: string;
  currency?: string;
}

export function DailySummaryCard({ restaurantId, currency = "JOD" }: DailySummaryCardProps) {
  const { language } = useLanguage();
  
  const today = new Date();
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ["daily-summary-card", restaurantId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      
      // Today's orders
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("id, total, subtotal, status, discount_value")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Today's refunds with reasons
      const { data: todayRefunds } = await supabase
        .from("refunds")
        .select("amount, reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Today's payments
      const { data: todayPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Get top seller today
      const { data: topSeller } = await supabase
        .from("order_items")
        .select("name, quantity")
        .eq("restaurant_id", restaurantId)
        .eq("voided", false)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
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
        const reason = r.reason || "غير محدد";
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
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            ملخص اليوم
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
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
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            ملخص اليوم
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {format(today, language === "ar" ? "d MMMM yyyy" : "MMMM d, yyyy")}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Section 1: النشاط التشغيلي */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" />
            النشاط التشغيلي
          </div>
          <div className="space-y-1.5 text-sm ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">عدد الطلبات:</span>
              <span className="font-medium">{summary.ordersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">عدد الطلبات المستردة:</span>
              <span className="font-medium">{summary.refundedOrdersCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">أكثر صنف مبيعًا:</span>
              <span className="font-medium">{summary.topSellerName || "—"}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 2: المبيعات */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <DollarSign className="h-4 w-4" />
            المبيعات
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">إجمالي قيمة جميع الطلبات قبل الخصومات أو الاستردادات.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي المبيعات:</span>
              <span className="font-medium">{formatJOD(summary.grossSales)} {currency}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 3: الاستردادات */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <RotateCcw className="h-4 w-4" />
            الاستردادات
          </div>
          <div className="space-y-1.5 text-sm ltr:pl-6 rtl:pr-6">
            <div className="flex justify-between">
              <span className="text-muted-foreground">عدد الاستردادات:</span>
              <span className="font-medium">{summary.refundCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">إجمالي المسترد:</span>
              <span className="font-medium">{formatJOD(summary.refundTotal)} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">سبب الاسترداد الأكثر تكرارًا:</span>
              <span className="font-medium">{summary.topRefundReason || "—"}</span>
            </div>
          </div>
        </div>
        
        <Separator />
        
        {/* Section 4: الإيرادات */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Wallet className="h-4 w-4" />
            إيرادات اليوم
          </div>
          <div className="ltr:pl-6 rtl:pr-6 space-y-2">
            <p className="text-xs text-muted-foreground">
              الإيرادات = إجمالي المدفوعات − إجمالي الاستردادات
            </p>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">صافي الإيرادات:</span>
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
              لم يتم تسجيل إيرادات صافية اليوم بسبب استرداد جميع المدفوعات.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
