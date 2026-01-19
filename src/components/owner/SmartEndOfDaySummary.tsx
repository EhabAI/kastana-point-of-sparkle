/**
 * Smart End-of-Day Summary Component
 * Displays a concise daily summary for restaurant owners
 * Now includes operational notes from the Smart Insights system
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";
import { useOperationalInsights } from "@/hooks/useOperationalInsights";
import { startOfDay, endOfDay, subDays, format } from "date-fns";
import { formatJOD } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle,
  Target,
  DollarSign,
  ShoppingBag,
  RefreshCw,
  FileText
} from "lucide-react";

interface SmartEndOfDaySummaryProps {
  restaurantId: string;
  currency?: string;
}

export function SmartEndOfDaySummary({ restaurantId, currency = "JOD" }: SmartEndOfDaySummaryProps) {
  const { t, language } = useLanguage();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  const { data: insightsData } = useOperationalInsights(restaurantId);
  
  const today = new Date();
  const yesterday = subDays(today, 1);
  
  const { data: summary, isLoading } = useQuery({
    queryKey: ["smart-end-of-day", restaurantId, format(today, "yyyy-MM-dd")],
    queryFn: async () => {
      const todayStart = startOfDay(today).toISOString();
      const todayEnd = endOfDay(today).toISOString();
      const yesterdayStart = startOfDay(yesterday).toISOString();
      const yesterdayEnd = endOfDay(yesterday).toISOString();
      
      // Today's stats
      const { data: todayOrders } = await supabase
        .from("orders")
        .select("id, total, status, discount_value")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Yesterday's stats for comparison
      const { data: yesterdayOrders } = await supabase
        .from("orders")
        .select("id, total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", yesterdayStart)
        .lt("created_at", yesterdayEnd);
      
      // Today's refunds
      const { data: todayRefunds } = await supabase
        .from("refunds")
        .select("amount")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Today's voided items
      const { data: todayVoids } = await supabase
        .from("order_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("voided", true)
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
      const paidTodayOrders = todayOrders?.filter(o => o.status === "paid") || [];
      const paidYesterdayOrders = yesterdayOrders?.filter(o => o.status === "paid") || [];
      
      const todaySales = paidTodayOrders.reduce((sum, o) => sum + Number(o.total), 0);
      const yesterdaySales = paidYesterdayOrders.reduce((sum, o) => sum + Number(o.total), 0);
      
      const todayDiscounts = paidTodayOrders.reduce((sum, o) => sum + (Number(o.discount_value) || 0), 0);
      const todayRefundTotal = todayRefunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
      
      // Top seller calculation
      const itemCounts = topSeller?.reduce((acc, item) => {
        acc[item.name] = (acc[item.name] || 0) + item.quantity;
        return acc;
      }, {} as Record<string, number>) || {};
      
      const topSellerName = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null;
      
      // Most frequent issue
      const voidCount = todayVoids?.length || 0;
      const refundCount = todayRefunds?.length || 0;
      const holdCount = todayOrders?.filter(o => o.status === "held")?.length || 0;
      
      let mostFrequentIssue: { type: string; count: number } | null = null;
      if (voidCount > 0 || refundCount > 0 || holdCount > 0) {
        const issues = [
          { type: "void", count: voidCount },
          { type: "refund", count: refundCount },
          { type: "hold", count: holdCount },
        ].filter(i => i.count > 0).sort((a, b) => b.count - a.count);
        
        if (issues.length > 0) {
          mostFrequentIssue = issues[0];
        }
      }
      
      // Sales comparison
      let salesTrend: "up" | "down" | "same" = "same";
      let salesChangePercent = 0;
      if (yesterdaySales > 0) {
        salesChangePercent = Math.round(((todaySales - yesterdaySales) / yesterdaySales) * 100);
        if (salesChangePercent > 5) salesTrend = "up";
        else if (salesChangePercent < -5) salesTrend = "down";
      } else if (todaySales > 0) {
        salesTrend = "up";
        salesChangePercent = 100;
      }
      
      // Silent loss meter (discounts + refunds)
      const silentLoss = todayDiscounts + todayRefundTotal;
      
      return {
        todaySales,
        yesterdaySales,
        salesTrend,
        salesChangePercent: Math.abs(salesChangePercent),
        orderCount: paidTodayOrders.length,
        topSellerName,
        mostFrequentIssue,
        silentLoss,
        discounts: todayDiscounts,
        refunds: todayRefundTotal,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
  
  if (isLoading || !summary) {
    return null;
  }
  
  // Don't show if no activity today
  if (summary.orderCount === 0 && summary.silentLoss === 0) {
    return null;
  }
  
  const TrendIcon = summary.salesTrend === "up" ? TrendingUp : 
                   summary.salesTrend === "down" ? TrendingDown : Minus;
  const trendColor = summary.salesTrend === "up" ? "text-green-600" : 
                    summary.salesTrend === "down" ? "text-amber-600" : "text-muted-foreground";
  
  const issueLabels: Record<string, { ar: string; en: string }> = {
    void: { ar: "إلغاءات", en: "Voids" },
    refund: { ar: "استردادات", en: "Refunds" },
    hold: { ar: "طلبات معلقة", en: "Held Orders" },
  };
  
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {t("end_of_day_summary")}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {format(today, language === "ar" ? "d MMMM yyyy" : "MMMM d, yyyy")}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Sales Comparison */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t("sales")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">{formatJOD(summary.todaySales)}</span>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-xs font-medium">
                {summary.salesChangePercent}%
              </span>
            </div>
          </div>
        </div>
        
        {/* Top Seller */}
        {summary.topSellerName && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">{t("top_seller_today")}</span>
            </div>
            <Badge variant="secondary" className="font-medium">
              {summary.topSellerName}
            </Badge>
          </div>
        )}
        
        {/* Most Frequent Issue */}
        {summary.mostFrequentIssue && (
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-muted-foreground">{t("most_frequent_issue")}</span>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-200">
              {issueLabels[summary.mostFrequentIssue.type][language]} ({summary.mostFrequentIssue.count})
            </Badge>
          </div>
        )}
        
        {/* Silent Loss Meter */}
        {summary.silentLoss > 0 && (
          <div className="flex items-center justify-between text-sm border-t pt-2 mt-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("silent_loss_meter")}</span>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/50" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">{t("silent_loss_tooltip")}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="font-medium text-amber-600">
              {formatJOD(summary.silentLoss)} {currency}
            </span>
          </div>
        )}
        
        {/* Operational Notes Section */}
        {insightsData && insightsData.operationalNotes.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                {language === "ar" ? "ملاحظات تشغيلية" : "Operational Notes"}
              </span>
            </div>
            <ul className="space-y-1">
              {insightsData.operationalNotes.slice(0, 3).map((note, idx) => (
                <li key={idx} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-amber-500 mt-0.5">•</span>
                  <span>{language === "ar" ? getArabicNote(note) : note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Stable operations message when no insights */}
        {insightsData && insightsData.operationalNotes.length === 0 && !insightsData.isNewRestaurant && (
          <div className="border-t pt-3 mt-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-xs text-muted-foreground">
                {language === "ar" 
                  ? "لا توجد ملاحظات تشغيلية اليوم. العمليات مستقرة."
                  : "No operational notes were recorded today. Operations were stable."
                }
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to translate operational notes to Arabic
function getArabicNote(englishNote: string): string {
  const translations: Record<string, string> = {
    "Order cancellations after payment are higher than recent activity.": 
      "إلغاءات الطلبات بعد الدفع أعلى من النشاط الأخير.",
    "Order cancellations after payment have continued over recent days.": 
      "استمرت إلغاءات الطلبات بعد الدفع خلال الأيام الأخيرة.",
    "Discount usage is higher compared to recent activity.": 
      "استخدام الخصومات أعلى مقارنة بالنشاط الأخير.",
    "Elevated discount usage has continued over recent days.": 
      "استمر ارتفاع استخدام الخصومات خلال الأيام الأخيرة.",
    "Multiple inventory adjustments on the same items today.": 
      "تسويات مخزون متعددة على نفس الأصناف اليوم.",
    "Repeated inventory adjustments have continued over recent days.": 
      "استمرت تسويات المخزون المتكررة خلال الأيام الأخيرة.",
    "A shift has been open longer than typical duration.": 
      "وردية مفتوحة لفترة أطول من المعتاد.",
    "Extended shift durations have continued over recent days.": 
      "استمرت فترات الورديات الممتدة خلال الأيام الأخيرة.",
    "No sales recorded during operating hours today.": 
      "لا توجد مبيعات مسجلة خلال ساعات العمل اليوم.",
    "Low sales activity has continued over recent days.": 
      "استمر انخفاض نشاط المبيعات خلال الأيام الأخيرة.",
  };
  return translations[englishNote] || englishNote;
}
