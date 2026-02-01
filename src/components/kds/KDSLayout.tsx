import { useMemo, useState, useCallback } from "react";
import { useKDSOrders, useUpdateOrderStatus, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { useKDSSound } from "@/hooks/kds/useKDSSound";
import { useKDSAutoClear, AutoClearDelay } from "@/hooks/kds/useKDSAutoClear";
import { useKDSFullscreen } from "@/hooks/kds/useKDSFullscreen";
import { useKDSKeyboardShortcuts } from "@/hooks/kds/useKDSKeyboardShortcuts";
import { KDSHeader } from "./KDSHeader";
import { KDSColumn } from "./KDSColumn";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FirstTimeHint } from "@/components/ui/first-time-hint";

interface KDSLayoutProps {
  restaurantId: string;
  branchId: string | null;
}

/**
 * KDSLayout - Kitchen Display System main layout
 * 
 * SECURITY:
 * - Uses KDSHeader which enforces role-aware navigation
 * - No prices, payments, edits, or reports visible
 * - Both Owner and Kitchen operate with same restricted permissions
 * 
 * UX ENHANCEMENTS:
 * - Delayed orders highlight (amber/red borders)
 * - Fullscreen mode for maximum visibility
 * - Keyboard shortcuts for speed (optional)
 */
export function KDSLayout({ restaurantId, branchId }: KDSLayoutProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const isRTL = language === "ar";
  
  // Fetch restaurant info for header
  const { data: restaurant } = useQuery({
    queryKey: ["kds-restaurant", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("restaurants")
        .select("name, logo_url")
        .eq("id", restaurantId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching restaurant:", error);
        return null;
      }
      return data;
    },
    enabled: !!restaurantId,
  });
  
  // Fetch branch info for header
  const { data: branch } = useQuery({
    queryKey: ["kds-branch", branchId],
    queryFn: async () => {
      if (!branchId) return null;
      const { data, error } = await supabase
        .from("restaurant_branches")
        .select("name")
        .eq("id", branchId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching branch:", error);
        return null;
      }
      return data;
    },
    enabled: !!branchId,
  });
  
  // Sound state
  const [soundEnabled, setSoundEnabled] = useState(true);
  const { playSound } = useKDSSound();

  // Fullscreen hook
  const { isFullscreen, toggleFullscreen } = useKDSFullscreen();

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

  const handleUpdateStatus = useCallback((orderId: string, status: KDSOrderStatus) => {
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
  }, [updateStatus, toast, t]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Keyboard shortcuts hook
  useKDSKeyboardShortcuts({
    orders: visibleOrders,
    onUpdateStatus: handleUpdateStatus,
    onRefresh: handleRefresh,
    onToggleFullscreen: toggleFullscreen,
    isUpdating: updateStatus.isPending,
  });

  const { newOrders, inProgressOrders, readyOrders, hasAnyOrders } = useMemo(() => {
    // KDS visibility mapping (display-only):
    // - Dine-in enters kitchen queue at status = "open"
    // - Takeaway enters kitchen queue at status = "paid"
    // Both are displayed in the "new" column.
    const newOrd = visibleOrders.filter((o) => o.status === "new" || o.status === "open" || o.status === "paid");
    const inProgressOrd = visibleOrders.filter((o) => o.status === "in_progress");
    const readyOrd = visibleOrders.filter((o) => o.status === "ready");
    return {
      newOrders: newOrd,
      inProgressOrders: inProgressOrd,
      readyOrders: readyOrd,
      hasAnyOrders: newOrd.length > 0 || inProgressOrd.length > 0 || readyOrd.length > 0,
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
      {/* First-time KDS hint */}
      <div className="px-4 pt-2">
        <FirstTimeHint hintKey="kds" className="max-w-xl mx-auto" />
      </div>
      {/* Reusable KDS Header - follows system header style */}
      <KDSHeader
        restaurantName={restaurant?.name}
        restaurantLogo={restaurant?.logo_url}
        branchName={branch?.name}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled(!soundEnabled)}
        autoClearEnabled={autoClearEnabled}
        autoClearDelay={autoClearDelay}
        onAutoClearToggle={toggleAutoClear}
        onAutoClearDelayChange={setDelay}
        isRefetching={isRefetching}
        onRefresh={handleRefresh}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Kanban Columns */}
      <main className="flex-1 p-4 overflow-hidden">
        {!hasAnyOrders ? (
          /* Empty state - clean message without technical details */
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-lg text-muted-foreground">
                {t("no_active_kitchen_orders")}
              </p>
            </div>
          </div>
        ) : (
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
        )}
      </main>
    </div>
  );
}
