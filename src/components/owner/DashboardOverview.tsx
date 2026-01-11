import { useOwnerRestaurantSettings, BusinessHours } from "@/hooks/useOwnerRestaurantSettings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, format, differenceInMinutes } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

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

// Format duration for display
function formatShiftDuration(minutes: number, language: string): string {
  if (minutes < 60) {
    return language === "ar" ? `${minutes}د` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (language === "ar") {
    return mins > 0 ? `${hours}س ${mins}د` : `${hours}س`;
  }
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
  
  return (
    <div className="border-b border-border/40 pb-4">
      {/* Horizontal KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">
        {/* Restaurant Status */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("status")}</span>
          <div className="flex items-center gap-2">
            <span className={`inline-block w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-muted-foreground'}`} />
            <span className="text-lg font-bold text-foreground">{isOpen ? t("open") : t("closed")}</span>
          </div>
          {nextOpenTime && (
            <span className="text-[10px] text-muted-foreground mt-0.5">{nextOpenTime}</span>
          )}
        </div>

        {/* Today's Sales */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("todays_sales")}</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">
            {formatJOD(todayStats?.todaySales || 0)}
          </span>
          <span className="text-[10px] text-muted-foreground">{currencySymbol}</span>
        </div>
        
        {/* Today's Orders */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("todays_orders")}</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{todayStats?.todayOrders || 0}</span>
        </div>
        
        {/* Open Shifts */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("open_shifts")}</span>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold tabular-nums ${(todayStats?.oldestShiftMinutes || 0) > 600 ? 'text-amber-600 dark:text-amber-500' : 'text-foreground'}`}>
              {todayStats?.openShifts || 0}
            </span>
            {(todayStats?.openShifts || 0) > 0 && (todayStats?.oldestShiftMinutes || 0) > 0 && (
              <span className={`text-xs ${(todayStats?.oldestShiftMinutes || 0) > 600 ? 'text-amber-600 dark:text-amber-500' : 'text-muted-foreground'}`}>
                {formatShiftDuration(todayStats?.oldestShiftMinutes || 0, language)}
              </span>
            )}
          </div>
        </div>
        
        {/* Tables */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("tables")}</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{tableCount}</span>
        </div>
        
        {/* Staff */}
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t("staff")}</span>
          <span className="text-2xl font-bold text-foreground tabular-nums">{staffCount}</span>
        </div>
      </div>
    </div>
  );
}
