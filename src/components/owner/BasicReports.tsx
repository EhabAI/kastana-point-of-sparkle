import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";

interface CashierSales {
  cashier_id: string;
  email: string;
  total_sales: number;
  order_count: number;
}

export function BasicReports() {
  const { data: restaurant } = useOwnerRestaurant();

  // Get today's date range
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  // Fetch today's orders for the restaurant
  const { data: ordersData, isLoading: loadingOrders } = useQuery({
    queryKey: ["owner-reports-orders", restaurant?.id, startOfDay],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("orders")
        .select("id, total, discount_value, shift_id, status")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startOfDay)
        .lt("created_at", endOfDay)
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

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Reports
        </CardTitle>
        <CardDescription>
          Today's performance metrics (read-only)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Sales (Today)</p>
            <p className="text-2xl font-bold text-foreground">{totalSales.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Number of Orders (Today)</p>
            <p className="text-2xl font-bold text-foreground">{orderCount}</p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg col-span-2">
            <p className="text-sm text-muted-foreground">Total Discounts Amount (Today)</p>
            <p className="text-2xl font-bold text-foreground">{totalDiscounts.toFixed(2)}</p>
          </div>
        </div>

        {/* Sales by Cashier */}
        <div className="space-y-3">
          <h4 className="font-medium text-foreground">Sales by Cashier (Today)</h4>
          {salesByCashier.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales data available for today.</p>
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
                  <p className="text-lg font-semibold text-foreground">{cashier.total_sales.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
