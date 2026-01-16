import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useKitchenPerformance } from "@/hooks/useKitchenPerformance";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { useBranchContext } from "@/contexts/BranchContext";

interface KitchenDoneOrdersCardProps {
  restaurantId: string;
}

export function KitchenDoneOrdersCard({ restaurantId }: KitchenDoneOrdersCardProps) {
  const { t } = useLanguage();
  const { selectedBranch } = useBranchContext();
  const { data: kdsEnabled } = useKDSEnabled(restaurantId);
  const { data, isLoading } = useKitchenPerformance(restaurantId, selectedBranch?.id);

  // Don't render if KDS is not enabled
  if (!kdsEnabled) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 border h-full">
        <CardContent className="p-4 h-full flex flex-col justify-center">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const doneCount = data?.totalOrdersToday || 0;

  return (
    <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 border h-full">
      <CardContent className="p-4 h-full flex flex-col justify-center">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <ChefHat className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("kitchen_done_orders_today")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-emerald-600">{doneCount}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
