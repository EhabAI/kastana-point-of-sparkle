import { useMemo } from "react";
import { useKDSOrders, useUpdateOrderStatus, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { KDSColumn } from "./KDSColumn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

interface KDSLayoutProps {
  restaurantId: string;
  branchId: string | null;
}

export function KDSLayout({ restaurantId, branchId }: KDSLayoutProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";

  const { data: orders = [], isLoading, refetch, isRefetching } = useKDSOrders(restaurantId, branchId);
  const updateStatus = useUpdateOrderStatus();

  const handleUpdateStatus = (orderId: string, status: KDSOrderStatus) => {
    updateStatus.mutate(
      { orderId, status },
      {
        onSuccess: () => {
          toast({
            title: t("status_updated"),
            description: status === "in_progress" ? t("order_started") : t("order_ready"),
          });
        },
        onError: () => {
          toast({
            title: t("error"),
            description: t("status_update_failed"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const { newOrders, inProgressOrders, readyOrders } = useMemo(() => {
    return {
      newOrders: orders.filter((o) => o.status === "new"),
      inProgressOrders: orders.filter((o) => o.status === "in_progress"),
      readyOrders: orders.filter((o) => o.status === "ready"),
    };
  }, [orders]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-xl font-bold">{t("kitchen_display")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      {/* Kanban Columns */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          <KDSColumn
            title={t("new_orders")}
            status="new"
            orders={newOrders}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updateStatus.isPending}
            colorClass="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
          />
          <KDSColumn
            title={t("in_progress")}
            status="in_progress"
            orders={inProgressOrders}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updateStatus.isPending}
            colorClass="bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300"
          />
          <KDSColumn
            title={t("ready")}
            status="ready"
            orders={readyOrders}
            onUpdateStatus={handleUpdateStatus}
            isUpdating={updateStatus.isPending}
            colorClass="bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300"
          />
        </div>
      </main>
    </div>
  );
}
