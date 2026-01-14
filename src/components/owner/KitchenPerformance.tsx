import { useKitchenPerformance } from "@/hooks/useKitchenPerformance";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useBranchContext } from "@/contexts/BranchContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Clock, AlertTriangle, TrendingUp, TrendingDown, Minus, Timer, Flame } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function formatHour(hour: number | null, language: string): string {
  if (hour === null) return "-";
  const period = hour >= 12 ? (language === "ar" ? "م" : "PM") : (language === "ar" ? "ص" : "AM");
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

export function KitchenPerformance() {
  const { t, language } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { selectedBranch } = useBranchContext();
  const { data: kdsEnabled } = useKDSEnabled(restaurant?.id);
  const { data, isLoading } = useKitchenPerformance(restaurant?.id, selectedBranch?.id);

  // Don't show if KDS is not enabled
  if (!kdsEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ChefHat className="h-4 w-4" />
            {t("kitchen_performance") || "Kitchen Performance"}
          </CardTitle>
          <CardDescription>{t("kitchen_performance_desc") || "Real-time kitchen metrics"}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const trendIcon = data?.prepTimeTrend === "up" 
    ? <TrendingUp className="h-3.5 w-3.5 text-destructive" />
    : data?.prepTimeTrend === "down"
    ? <TrendingDown className="h-3.5 w-3.5 text-emerald-600" />
    : <Minus className="h-3.5 w-3.5 text-muted-foreground" />;

  const trendLabel = data?.prepTimeTrend === "up"
    ? (t("slower") || "Slower")
    : data?.prepTimeTrend === "down"
    ? (t("faster") || "Faster")
    : (t("trend_same") || "Same");

  const trendColor = data?.prepTimeTrend === "up"
    ? "text-destructive"
    : data?.prepTimeTrend === "down"
    ? "text-emerald-600"
    : "text-muted-foreground";

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ChefHat className="h-4 w-4" />
          {t("kitchen_performance") || "Kitchen Performance"}
        </CardTitle>
        <CardDescription>{t("kitchen_performance_desc") || "Real-time kitchen metrics"}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Average Prep Time */}
          <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("avg_prep_time") || "Avg Prep Time"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground tabular-nums">
                {data?.avgPrepTimeToday || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                {language === "ar" ? "دقيقة" : "min"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {trendIcon}
              <span className={`text-xs ${trendColor}`}>
                {trendLabel} {t("vs_yesterday") || "vs yesterday"}
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-0.5">
              {t("yesterday") || "Yesterday"}: {data?.avgPrepTimeYesterday || 0} {language === "ar" ? "د" : "min"}
            </div>
          </div>

          {/* Orders by Status */}
          <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("orders_by_status") || "Orders by Status"}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("new") || "NEW"}</span>
                <span className="text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                  {data?.ordersByStatus.NEW || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("in_progress") || "IN PROGRESS"}</span>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {data?.ordersByStatus.IN_PROGRESS || 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t("ready") || "READY"}</span>
                <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {data?.ordersByStatus.READY || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Delayed Orders */}
          <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("delayed_orders") || "Delayed Orders"}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold tabular-nums ${
                (data?.delayedOrdersPercent || 0) > 20 
                  ? "text-destructive" 
                  : (data?.delayedOrdersPercent || 0) > 10 
                  ? "text-amber-600 dark:text-amber-400" 
                  : "text-foreground"
              }`}>
                {data?.delayedOrdersCount || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                ({data?.delayedOrdersPercent || 0}%)
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground/60 mt-1">
              {t("delayed_definition") || ">15 min prep time"}
            </div>
            <div className="text-[10px] text-muted-foreground/60">
              {t("of_orders") || "of"} {data?.totalOrdersToday || 0} {t("orders_completed_today") || "orders today"}
            </div>
          </div>

          {/* Peak Kitchen Hours */}
          <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 transition-all duration-200 hover:shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Flame className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t("kitchen_peak_hours") || "Peak Hours"}
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                  {t("today") || "Today"}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground">
                    {formatHour(data?.peakHourToday ?? null, language)}
                  </span>
                  {data?.peakHourTodayCount ? (
                    <span className="text-xs text-muted-foreground">
                      ({data.peakHourTodayCount} {t("orders") || "orders"})
                    </span>
                  ) : null}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wide mb-0.5">
                  {t("week_peak") || "This Week"}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-bold text-foreground">
                    {formatHour(data?.peakHourWeek ?? null, language)}
                  </span>
                  {data?.peakHourWeekCount ? (
                    <span className="text-xs text-muted-foreground">
                      ({data.peakHourWeekCount} {t("orders") || "orders"})
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
