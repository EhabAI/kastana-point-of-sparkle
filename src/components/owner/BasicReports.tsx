import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { BarChart3, Loader2, ChevronDown, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";

interface CashierSales {
  cashier_id: string;
  email: string;
  total_sales: number;
  order_count: number;
}

export function BasicReports() {
  const { t } = useLanguage();
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currency = settings?.currency || "JOD";
  
  const [isOpen, setIsOpen] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("today"));

  // Fetch orders for the date range
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["owner-reports-orders", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("id, total, discount_value, shift_id, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurant?.id,
  });

  // Fetch shifts with cashier info for sales by cashier
  const { data: shiftsData, isLoading: loadingShifts } = useQuery({
    queryKey: ["owner-reports-shifts", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("shifts")
        .select("id, cashier_id")
        .eq("restaurant_id", restaurant.id);

      if (error) throw error;
      return data;
    },
    enabled: !!restaurant?.id,
  });

  // Fetch profiles for cashier emails
  const { data: profilesData, isLoading: loadingProfiles } = useQuery({
    queryKey: ["owner-reports-profiles", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email");

      if (error) throw error;
      return data;
    },
    enabled: !!restaurant?.id,
  });

  const isLoading = loadingOrders || loadingShifts || loadingProfiles;

  // Calculate metrics
  const totalSales = ordersData?.reduce((sum, order) => sum + Number(order.total), 0) || 0;
  const orderCount = ordersData?.length || 0;
  const totalDiscounts = ordersData?.reduce((sum, order) => sum + Number(order.discount_value || 0), 0) || 0;

  // Calculate sales by cashier
  const salesByCashier: CashierSales[] = [];
  if (ordersData && shiftsData && profilesData) {
    const shiftToCashier = new Map(shiftsData.map(s => [s.id, s.cashier_id]));
    const cashierToEmail = new Map(profilesData.map(p => [p.id, p.email || "Unknown"]));
    
    const cashierSalesMap = new Map<string, { total: number; count: number }>();
    
    for (const order of ordersData) {
      const cashierId = shiftToCashier.get(order.shift_id);
      if (cashierId) {
        const current = cashierSalesMap.get(cashierId) || { total: 0, count: 0 };
        cashierSalesMap.set(cashierId, {
          total: current.total + Number(order.total),
          count: current.count + 1,
        });
      }
    }

    for (const [cashierId, sales] of cashierSalesMap) {
      salesByCashier.push({
        cashier_id: cashierId,
        email: cashierToEmail.get(cashierId) || "Unknown",
        total_sales: sales.total,
        order_count: sales.count,
      });
    }
  }

  const exportToCSV = () => {
    const headers = ["Metric", "Value"];
    const rows = [
      ["Date Range", `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`],
      ["Total Sales", `${totalSales.toFixed(2)} ${currency}`],
      ["Number of Orders", orderCount.toString()],
      ["Total Discounts", `${totalDiscounts.toFixed(2)} ${currency}`],
      [""],
      ["Cashier", "Total Sales", "Order Count"],
      ...salesByCashier.map(c => [c.email, `${c.total_sales.toFixed(2)} ${currency}`, c.order_count.toString()]),
    ];

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reports_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDateRangeLabel = () => {
    if (preset === "today") return t("today");
    if (preset === "yesterday") return t("yesterday");
    if (preset === "this_week") return t("this_week");
    if (preset === "this_month") return t("this_month");
    if (preset === "last_7_days") return t("last_7_days");
    if (preset === "last_30_days") return t("last_30_days");
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-start">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    {t("reports")}
                  </CardTitle>
                  <CardDescription>
                    {t("performance_metrics")} ({getDateRangeLabel()})
                  </CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoading}>
              <Download className="h-4 w-4 me-2" />
              {t("export_csv")}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Date Range Filter */}
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              preset={preset}
              onPresetChange={setPreset}
            />

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t("total_sales")}</p>
                    <p className="text-2xl font-bold text-foreground">{totalSales.toFixed(2)} {currency}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">{t("number_of_orders")}</p>
                    <p className="text-2xl font-bold text-foreground">{orderCount}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg col-span-2">
                    <p className="text-sm text-muted-foreground">{t("total_discounts")}</p>
                    <p className="text-2xl font-bold text-foreground">{totalDiscounts.toFixed(2)} {currency}</p>
                  </div>
                </div>

                {/* Sales by Cashier */}
                <div className="space-y-3">
                  <h4 className="font-medium text-foreground">{t("sales_by_cashier")}</h4>
                  {salesByCashier.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("no_sales_data_period")}</p>
                  ) : (
                    <div className="space-y-2">
                      {salesByCashier.map((cashier) => (
                        <div 
                          key={cashier.cashier_id} 
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-foreground">{cashier.email}</p>
                            <p className="text-sm text-muted-foreground">{cashier.order_count} orders</p>
                          </div>
                          <p className="text-lg font-semibold text-foreground">{cashier.total_sales.toFixed(2)} {currency}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
