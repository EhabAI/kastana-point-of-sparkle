import { useOwnerRestaurantSettings, BusinessHours } from "@/hooks/useOwnerRestaurantSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format, differenceInMinutes } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Gauge, CheckCircle, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type ConfidenceLevel = "excellent" | "good" | "needs_attention";
interface DashboardOverviewProps {
  restaurantId: string;
  tableCount: number;
  staffCount: number;
  currency: string;
}

function isRestaurantOpen(businessHours: BusinessHours | null): boolean {
  if (!businessHours) return false;

  const now = new Date();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = dayNames[now.getDay()];
  const todayHours = businessHours[today];

  if (!todayHours || todayHours.closed) return false;

  const currentTime = format(now, "HH:mm");
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

function getNextOpenTime(businessHours: BusinessHours | null, t: (key: string) => string): string | null {
  if (!businessHours) return null;

  const now = new Date();
  const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const today = dayNames[now.getDay()];
  const todayHours = businessHours[today];
  const currentTime = format(now, "HH:mm");

  // If today is not closed and we're before opening time
  if (todayHours && !todayHours.closed && currentTime < todayHours.open) {
    return `${t("opens_at")} ${todayHours.open}`;
  }

  // Find next open day
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (now.getDay() + i) % 7;
    const nextDay = dayNames[nextDayIndex];
    const nextDayHours = businessHours[nextDay];

    if (nextDayHours && !nextDayHours.closed) {
      const dayKey = nextDay as "sunday" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday";
      return `${t("opens_on")} ${t(dayKey)} ${todayHours?.open || nextDayHours.open}`;
    }
  }

  return null;
}

// Format duration for display with proper Arabic-friendly spacing
// Normalizes input: if > 1440, treat as seconds; else treat as minutes
// Examples: 18400 (sec) => "5 س 06 د", 306 (min) => "5 س 06 د", 41 (min) => "0 س 41 د"
function formatShiftDuration(durationValue: number, language: string): { hours: number; mins: string } {
  // Normalize: if value > 1440 (24 hours in minutes), it's likely in seconds
  const totalMinutes = durationValue > 1440 ? Math.floor(durationValue / 60) : Math.floor(durationValue);

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  // Pad minutes to always show 2 digits
  const paddedMins = mins.toString().padStart(2, "0");

  return { hours, mins: paddedMins };
}

export function DashboardOverview({ restaurantId, tableCount, staffCount, currency }: DashboardOverviewProps) {
  const { t, language } = useLanguage();
  const { data: settings } = useOwnerRestaurantSettings();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  // Fetch today's quick stats
  const today = new Date();
  const startOfToday = startOfDay(today).toISOString();
  const endOfToday = endOfDay(today).toISOString();

  const { data: todayStats } = useQuery({
    queryKey: ["dashboard-today-stats", restaurantId, startOfToday],
    queryFn: async () => {
      // Get today's orders
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, total, status")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startOfToday)
        .lt("created_at", endOfToday);

      if (ordersError) throw ordersError;

      // Get open shifts with opened_at for duration calculation
      const { data: openShifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id, opened_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open");

      if (shiftsError) throw shiftsError;

      const paidOrders = orders?.filter((o) => o.status === "paid") || [];
      const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

      // Calculate oldest open shift duration
      let oldestShiftMinutes = 0;
      if (openShifts && openShifts.length > 0) {
        const now = new Date();
        const durations = openShifts.map((s) => differenceInMinutes(now, new Date(s.opened_at)));
        oldestShiftMinutes = Math.max(...durations);
      }

      return {
        todaySales: totalSales,
        todayOrders: paidOrders.length,
        openShifts: openShifts?.length || 0,
        oldestShiftMinutes,
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 60000, // Refresh every minute
  });

  const isOpen = isRestaurantOpen(settings?.business_hours || null);
  const nextOpenTime = !isOpen ? getNextOpenTime(settings?.business_hours || null, t) : null;

  // Risk indicators (using existing logic)
  const hasLongShift = (todayStats?.oldestShiftMinutes || 0) > 600;
  const hasZeroSalesWithOpenShift = (todayStats?.openShifts || 0) > 0 && (todayStats?.todaySales || 0) === 0;
  const currentHour = new Date().getHours();
  const zeroSalesWarning = hasZeroSalesWithOpenShift && currentHour >= 11;

  return (
    <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-3 border border-border transition-all duration-200 hover:shadow-md">
      {/* Section Header - Commanding */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-bold text-foreground/80 uppercase tracking-[0.15em]">
          {t("today") || "Today"}
        </span>
        <span className="text-[10px] text-muted-foreground/50">—</span>
        <span className="text-[10px] font-medium text-foreground/60 uppercase tracking-wider">
          {t("operational_status") || "Operational Status"}
        </span>
      </div>

      {/* Status Bar */}
      <div className="flex flex-wrap items-stretch gap-y-4">
        {/* PRIMARY: Restaurant Status */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 first:pl-0 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("status")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("status_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-semibold ${isOpen ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500"}`}
              >
                {isOpen ? t("open") : t("closed")}
              </span>
              {!isOpen && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground/50 cursor-help flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <p className="text-sm">{t("closed_tooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {nextOpenTime && <span className="text-[10px] text-muted-foreground/60 mt-1">{nextOpenTime}</span>}
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Today's Sales */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("sales")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("sales_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-xl font-bold tabular-nums tracking-tight leading-none ${zeroSalesWarning ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
              >
                {formatJOD(todayStats?.todaySales || 0)}
              </span>
              <span className="text-sm font-semibold text-foreground/80">{currencySymbol}</span>
            </div>
            {zeroSalesWarning && <span className="w-4 h-0.5 bg-amber-500/60 rounded-full mt-1" />}
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Today's Orders */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("orders")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("orders_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">
              {todayStats?.todayOrders || 0}
            </span>
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Open Shifts */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("shifts")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("shifts_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-xl font-bold tabular-nums tracking-tight leading-none ${hasLongShift ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}
              >
                {todayStats?.openShifts || 0}
              </span>
              {(todayStats?.openShifts || 0) > 0 &&
                (todayStats?.oldestShiftMinutes || 0) > 0 &&
                (() => {
                  const duration = formatShiftDuration(todayStats?.oldestShiftMinutes || 0, language);
                  const hLabel = language === "ar" ? "س" : "h";
                  const mLabel = language === "ar" ? "د" : "m";
                  return (
                    <span
                      className={`flex items-baseline gap-0.5 ${hasLongShift ? "text-amber-600 dark:text-amber-400" : "text-foreground/80"}`}
                    >
                      <span className="text-base font-bold tabular-nums">{duration.hours}</span>
                      <span className="text-sm font-medium text-foreground/60">{hLabel}</span>
                      <span className="text-base font-bold tabular-nums ml-0.5">{duration.mins}</span>
                      <span className="text-sm font-medium text-foreground/60">{mLabel}</span>
                    </span>
                  );
                })()}
            </div>
            {hasLongShift && <span className="w-4 h-0.5 bg-amber-500/60 rounded-full mt-1" />}
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Tables */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("tables")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("tables_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">
              {tableCount}
            </span>
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Staff */}
        <div className="flex items-center">
          <div className="flex flex-col px-4 min-h-[52px]">
            <div className="flex items-center gap-1">
              <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
                {t("staff")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3 w-3 text-muted-foreground/40 cursor-help mb-1" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    <p className="text-xs">{t("staff_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">
              {staffCount}
            </span>
          </div>
          <div className="hidden md:block w-[2px] self-stretch bg-border/80 mx-3" />
        </div>

        {/* Operational Score */}
        <OperationalScoreMetric restaurantId={restaurantId} />
      </div>
    </div>
  );
}

// Inline operational score component
function OperationalScoreMetric({ restaurantId }: { restaurantId: string }) {
  const { t, language } = useLanguage();

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  const { data: score } = useQuery({
    queryKey: ["system-confidence", restaurantId, todayStart],
    queryFn: async () => {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, cancelled_reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      const { data: voidedItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("voided", true)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      const { data: refunds } = await supabase
        .from("refunds")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      const { data: openShifts } = await supabase
        .from("shifts")
        .select("id, opened_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open");

      const totalOrders = orders?.length || 0;
      const cancelledOrders = orders?.filter((o) => o.status === "cancelled")?.length || 0;
      const voidCount = voidedItems?.length || 0;
      const refundCount = refunds?.length || 0;

      const longShifts =
        openShifts?.filter((s) => {
          const hoursOpen = (Date.now() - new Date(s.opened_at).getTime()) / (1000 * 60 * 60);
          return hoursOpen > 10;
        })?.length || 0;

      let scoreValue = 100;

      if (totalOrders > 0) {
        const cancellationRate = (cancelledOrders / totalOrders) * 100;
        if (cancellationRate > 10) scoreValue -= 15;
        else if (cancellationRate > 5) scoreValue -= 8;
      }

      if (voidCount > 10) scoreValue -= 15;
      else if (voidCount > 5) scoreValue -= 8;
      else if (voidCount > 2) scoreValue -= 3;

      if (refundCount > 5) scoreValue -= 10;
      else if (refundCount > 2) scoreValue -= 5;

      if (longShifts > 0) scoreValue -= 10;

      const currentHour = new Date().getHours();
      if (totalOrders === 0 && currentHour >= 12) {
        scoreValue -= 20;
      }

      scoreValue = Math.max(0, Math.min(100, scoreValue));

      let level: ConfidenceLevel;
      if (scoreValue >= 80) level = "excellent";
      else if (scoreValue >= 60) level = "good";
      else level = "needs_attention";

      return {
        score: scoreValue,
        level,
        factors: { totalOrders, cancelledOrders, voidCount, refundCount, longShifts },
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000,
  });

  if (!score) return null;

  const levelConfig: Record<ConfidenceLevel, { icon: typeof CheckCircle; color: string }> = {
    excellent: { icon: CheckCircle, color: "text-green-600" },
    good: { icon: AlertCircle, color: "text-blue-600" },
    needs_attention: { icon: AlertTriangle, color: "text-amber-600" },
  };

  const levelLabels: Record<ConfidenceLevel, { ar: string; en: string }> = {
    excellent: { ar: "ممتاز", en: "Excellent" },
    good: { ar: "جيد", en: "Good" },
    needs_attention: { ar: "يحتاج انتباه", en: "Needs Attention" },
  };

  const config = levelConfig[score.level];
  const Icon = config.icon;

  return (
    <div className="flex items-center">
      <div className="flex flex-col px-4 min-h-[52px]">
        <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
          {t("operational_score")}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Gauge className={`h-4 w-4 ${config.color}`} />
            <span className={`text-xl font-bold tabular-nums tracking-tight leading-none ${config.color}`}>
              {score.score}%
            </span>
          </div>
          <Badge variant="outline" className={`${config.color} border-current text-xs px-2 py-0.5`}>
            <Icon className="h-3 w-3 mr-1" />
            {levelLabels[score.level][language]}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs font-medium mb-1">{t("based_on_today")}</p>
                <ul className="text-xs text-muted-foreground space-y-0.5">
                  <li>
                    • {t("orders")}: {score.factors.totalOrders}
                  </li>
                  <li>
                    • {language === "ar" ? "ملغي" : "Cancelled"}: {score.factors.cancelledOrders}
                  </li>
                  <li>
                    • {language === "ar" ? "إلغاءات" : "Voids"}: {score.factors.voidCount}
                  </li>
                  <li>
                    • {language === "ar" ? "استردادات" : "Refunds"}: {score.factors.refundCount}
                  </li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
