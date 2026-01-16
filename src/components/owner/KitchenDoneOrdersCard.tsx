import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChefHat, CheckCircle2 } from "lucide-react";
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
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const doneCount = data?.totalOrdersToday || 0;

  return (
    <Card className="shadow-card hover-lift h-full">
      <CardContent className="p-4 flex flex-col justify-center h-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-foreground">{doneCount}</span>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("kitchen_done_today") || "طلبات منجزة من المطبخ اليوم"}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
