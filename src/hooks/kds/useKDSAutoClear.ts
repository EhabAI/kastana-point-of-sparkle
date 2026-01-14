import { useState, useEffect, useCallback, useMemo } from "react";
import { KDSOrder } from "./useKDSOrders";

export type AutoClearDelay = 3 | 5 | 10;

interface AutoClearState {
  enabled: boolean;
  delay: AutoClearDelay;
}

export function useKDSAutoClear(orders: KDSOrder[]) {
  const [autoClearEnabled, setAutoClearEnabled] = useState(true);
  const [autoClearDelay, setAutoClearDelay] = useState<AutoClearDelay>(5);
  const [hiddenOrderIds, setHiddenOrderIds] = useState<Set<string>>(new Set());
  const [readyTimestamps, setReadyTimestamps] = useState<Map<string, number>>(new Map());

  // Track when orders become READY
  useEffect(() => {
    const readyOrders = orders.filter((o) => o.status === "ready");
    const now = Date.now();

    setReadyTimestamps((prev) => {
      const updated = new Map(prev);
      
      // Add new ready orders
      readyOrders.forEach((order) => {
        if (!updated.has(order.id)) {
          updated.set(order.id, now);
        }
      });

      // Clean up orders that are no longer ready
      const currentReadyIds = new Set(readyOrders.map((o) => o.id));
      Array.from(updated.keys()).forEach((id) => {
        if (!currentReadyIds.has(id)) {
          updated.delete(id);
        }
      });

      return updated;
    });
  }, [orders]);

  // Auto-hide ready orders after delay
  useEffect(() => {
    if (!autoClearEnabled) {
      setHiddenOrderIds(new Set());
      return;
    }

    const checkAndHide = () => {
      const now = Date.now();
      const delayMs = autoClearDelay * 60 * 1000;

      setHiddenOrderIds((prev) => {
        const updated = new Set(prev);
        
        readyTimestamps.forEach((timestamp, orderId) => {
          if (now - timestamp >= delayMs) {
            updated.add(orderId);
          }
        });

        return updated;
      });
    };

    // Check immediately and then every 10 seconds
    checkAndHide();
    const interval = setInterval(checkAndHide, 10000);

    return () => clearInterval(interval);
  }, [autoClearEnabled, autoClearDelay, readyTimestamps]);

  // Clear hidden state when auto-clear is disabled
  useEffect(() => {
    if (!autoClearEnabled) {
      setHiddenOrderIds(new Set());
    }
  }, [autoClearEnabled]);

  const visibleOrders = useMemo(() => {
    if (!autoClearEnabled) return orders;
    return orders.filter((o) => !hiddenOrderIds.has(o.id));
  }, [orders, hiddenOrderIds, autoClearEnabled]);

  const toggleAutoClear = useCallback(() => {
    setAutoClearEnabled((prev) => !prev);
  }, []);

  const setDelay = useCallback((delay: AutoClearDelay) => {
    setAutoClearDelay(delay);
  }, []);

  return {
    visibleOrders,
    autoClearEnabled,
    autoClearDelay,
    toggleAutoClear,
    setDelay,
  };
}
