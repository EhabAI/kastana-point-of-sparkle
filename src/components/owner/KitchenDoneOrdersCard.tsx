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
      <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 border">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const doneCount = data?.totalOrdersToday || 0;

  return (
    <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50 border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-50 dark:bg-green-950/20">
              <ChefHat className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("kitchen_done_orders_today")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold text-green-600">{doneCount}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
