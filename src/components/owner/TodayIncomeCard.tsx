import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContext } from "@/contexts/BranchContext";
import { startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp } from "lucide-react";

interface TodayIncomeCardProps {
  restaurantId: string;
  currency: string;
}

export function TodayIncomeCard({ restaurantId, currency }: TodayIncomeCardProps) {
  const { t } = useLanguage();
  const { selectedBranch } = useBranchContext();

  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["today-income", restaurantId, selectedBranch?.id, todayStart],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("total")
        .eq("restaurant_id", restaurantId)
        .eq("status", "completed")
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      if (selectedBranch?.id) {
        query = query.eq("branch_id", selectedBranch.id);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      const totalIncome = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
      const orderCount = orders?.length || 0;

      return { totalIncome, orderCount };
    },
    enabled: !!restaurantId,
    refetchInterval: 60 * 1000, // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card className="bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50 border h-full">
        <CardContent className="p-4 h-full flex flex-col justify-center">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const totalIncome = data?.totalIncome || 0;

  return (
    <Card className="bg-sky-50 dark:bg-sky-950/20 border-sky-200 dark:border-sky-800/50 border h-full">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-sky-100 dark:bg-sky-900/30">
              <Wallet className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("today_income")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-sky-600">
                  {totalIncome.toFixed(2)} {currency}
                </span>
                <TrendingUp className="h-4 w-4 text-sky-500" />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
