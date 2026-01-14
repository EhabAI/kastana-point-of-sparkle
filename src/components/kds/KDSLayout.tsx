import { useMemo, useState, useCallback } from "react";
import { useKDSOrders, useUpdateOrderStatus, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { useKDSSound } from "@/hooks/kds/useKDSSound";
import { useKDSAutoClear, AutoClearDelay } from "@/hooks/kds/useKDSAutoClear";
import { KDSColumn } from "./KDSColumn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw, Volume2, VolumeX, Clock, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface KDSLayoutProps {
  restaurantId: string;
  branchId: string | null;
}

export function KDSLayout({ restaurantId, branchId }: KDSLayoutProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";
  
  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSound } = useKDSSound();

  // Handle new order callback
  const handleNewOrder = useCallback((orderId: string) => {
    if (soundEnabled) {
      playSound();
    }
  }, [soundEnabled, playSound]);

  const { data: orders = [], isLoading, refetch, isRefetching } = useKDSOrders(
    restaurantId,
    branchId,
    { onNewOrder: handleNewOrder }
  );
  
  // Auto-clear
  const {
    visibleOrders,
    autoClearEnabled,
    autoClearDelay,
    toggleAutoClear,
    setDelay,
  } = useKDSAutoClear(orders);

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
      newOrders: visibleOrders.filter((o) => o.status === "new"),
      inProgressOrders: visibleOrders.filter((o) => o.status === "in_progress"),
      readyOrders: visibleOrders.filter((o) => o.status === "ready"),
    };
  }, [visibleOrders]);

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
          {/* Sound Toggle */}
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? t("sound_on") : t("sound_off")}
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>

          {/* Settings Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("kds_settings")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {/* Auto-clear Toggle */}
              <div className="flex items-center justify-between px-2 py-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{t("auto_clear_ready")}</span>
                </div>
                <Switch
                  checked={autoClearEnabled}
                  onCheckedChange={toggleAutoClear}
                />
              </div>
              
              {autoClearEnabled && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {t("clear_after")}
                  </DropdownMenuLabel>
                  {([3, 5, 10] as AutoClearDelay[]).map((delay) => (
                    <DropdownMenuItem
                      key={delay}
                      onClick={() => setDelay(delay)}
                      className="flex items-center justify-between"
                    >
                      <span>{delay} {t("minutes")}</span>
                      {autoClearDelay === delay && (
                        <Badge variant="secondary" className="text-xs">
                          {t("selected")}
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

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
