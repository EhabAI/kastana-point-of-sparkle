import { useOwnerRestaurantSettings, BusinessHours } from "@/hooks/useOwnerRestaurantSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format, differenceInMinutes } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

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
function formatShiftDuration(minutes: number, language: string): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  // Pad minutes to always show 2 digits for consistency
  const paddedMins = mins.toString().padStart(2, "0");
  
  if (language === "ar") {
    // Arabic format: "5 س 06 د" with proper spacing
    if (hours === 0) {
      return `${mins} د`;
    }
    return mins > 0 ? `${hours} س ${paddedMins} د` : `${hours} س`;
  }
  
  // English format: "5h 06m"
  if (hours === 0) {
    return `${mins}m`;
  }
  return mins > 0 ? `${hours}h ${paddedMins}m` : `${hours}h`;
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
      
      const paidOrders = orders?.filter(o => o.status === "paid") || [];
      const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
      
      // Calculate oldest open shift duration
      let oldestShiftMinutes = 0;
      if (openShifts && openShifts.length > 0) {
        const now = new Date();
        const durations = openShifts.map(s => differenceInMinutes(now, new Date(s.opened_at)));
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
    <div className="bg-muted/30 dark:bg-muted/10 rounded-lg p-4 transition-all duration-200 hover:shadow-md">
      {/* Section Header - Commanding */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[10px] font-bold text-muted-foreground/80 uppercase tracking-[0.15em]">
          {t("today") || "Today"}
        </span>
        <span className="text-[10px] text-muted-foreground/40">—</span>
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
          {t("operational_status") || "Operational Status"}
        </span>
      </div>
      
      {/* Status Bar */}
      <div className="flex flex-wrap items-start gap-x-8 gap-y-4 md:gap-x-12">
        {/* PRIMARY: Restaurant Status */}
        <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("status")}</span>
          <div className="flex items-center gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${isOpen ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
            <span className="text-xl font-bold text-foreground tracking-tight leading-none">{isOpen ? t("open") : t("closed")}</span>
            {!isOpen && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help flex-shrink-0" />
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[250px]">
                    <p className="text-sm">{t("closed_tooltip")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {nextOpenTime && (
            <span className="text-[9px] text-muted-foreground/40 mt-0.5">{nextOpenTime}</span>
          )}
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-10 bg-border/50" />

        {/* PERFORMANCE GROUP */}
        <div className="flex gap-6 md:gap-8">
          {/* Today's Sales */}
          <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("sales")}</span>
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold tabular-nums tracking-tight leading-none ${zeroSalesWarning ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                {formatJOD(todayStats?.todaySales || 0)}
              </span>
              <span className="text-[9px] text-muted-foreground/40 font-medium">{currencySymbol}</span>
            </div>
            {zeroSalesWarning && (
              <span className="w-4 h-0.5 bg-amber-500/60 rounded-full mt-1" />
            )}
          </div>
          
          {/* Today's Orders */}
          <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("orders")}</span>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">{todayStats?.todayOrders || 0}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="hidden md:block w-px h-10 bg-border/50" />

        {/* OPERATIONS GROUP */}
        <div className="flex gap-6 md:gap-8">
          {/* Open Shifts */}
          <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("shifts")}</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-xl font-bold tabular-nums tracking-tight leading-none ${hasLongShift ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                {todayStats?.openShifts || 0}
              </span>
              {(todayStats?.openShifts || 0) > 0 && (todayStats?.oldestShiftMinutes || 0) > 0 && (
                <span className={`text-[10px] font-medium ${hasLongShift ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground/40'}`}>
                  {formatShiftDuration(todayStats?.oldestShiftMinutes || 0, language)}
                </span>
              )}
            </div>
            {hasLongShift && (
              <span className="w-4 h-0.5 bg-amber-500/60 rounded-full mt-1" />
            )}
          </div>
          
          {/* Tables */}
          <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("tables")}</span>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">{tableCount}</span>
          </div>
          
          {/* Staff */}
          <div className="flex flex-col p-2 -m-2 rounded-lg transition-all duration-200 hover:bg-primary/10 hover:shadow-sm hover:scale-[1.02] cursor-default min-h-[52px]">
            <span className="text-[9px] uppercase tracking-widest text-muted-foreground/50 mb-0.5">{t("staff")}</span>
            <span className="text-xl font-bold text-foreground tabular-nums tracking-tight leading-none">{staffCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
