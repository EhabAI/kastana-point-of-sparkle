import { useEffect, useCallback } from "react";
import { KDSOrder, KDSOrderStatus } from "./useKDSOrders";

interface UseKDSKeyboardShortcutsOptions {
  orders: KDSOrder[];
  onUpdateStatus: (orderId: string, status: KDSOrderStatus) => void;
  onRefresh: () => void;
  onToggleFullscreen: () => void;
  isUpdating: boolean;
}

/**
 * Hook for KDS keyboard shortcuts
 * 
 * Shortcuts:
 * - "1": Move first NEW order to IN_PROGRESS
 * - "2": Move first IN_PROGRESS order to READY  
 * - "R": Refresh orders
 * - "F": Toggle fullscreen
 * - "ESC": Exit fullscreen
 * 
 * Rules:
 * - Only work when KDS is focused
 * - Touch interaction remains primary
 * - No confirmation dialogs
 */
export function useKDSKeyboardShortcuts({
  orders,
  onUpdateStatus,
  onRefresh,
  onToggleFullscreen,
  isUpdating,
}: UseKDSKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Prevent action if already updating
      if (isUpdating && (event.key === "1" || event.key === "2")) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case "1": {
          // Move first NEW order to IN_PROGRESS
          const newOrder = orders.find((o) => o.status === "new");
          if (newOrder) {
            event.preventDefault();
            onUpdateStatus(newOrder.id, "in_progress");
          }
          break;
        }
        case "2": {
          // Move first IN_PROGRESS order to READY
          const inProgressOrder = orders.find((o) => o.status === "in_progress");
          if (inProgressOrder) {
            event.preventDefault();
            onUpdateStatus(inProgressOrder.id, "ready");
          }
          break;
        }
        case "r": {
          event.preventDefault();
          onRefresh();
          break;
        }
        case "f": {
          event.preventDefault();
          onToggleFullscreen();
          break;
        }
        case "escape": {
          // Exit fullscreen if in fullscreen mode
          if (document.fullscreenElement) {
            event.preventDefault();
            document.exitFullscreen().catch(() => {});
          }
          break;
        }
        default:
          break;
      }
    },
    [orders, onUpdateStatus, onRefresh, onToggleFullscreen, isUpdating]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
