import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export type KDSOrderStatus = "new" | "in_progress" | "ready";

export interface KDSOrderItem {
  id: string;
  name: string;
  quantity: number;
  notes: string | null;
  voided: boolean;
}

export interface KDSOrder {
  id: string;
  order_number: number;
  source: string;
  status: string;
  table_id: string | null;
  table_name?: string;
  created_at: string;
  order_notes: string | null;
  items: KDSOrderItem[];
}

interface UseKDSOrdersOptions {
  onNewOrder?: (orderId: string) => void;
}

/**
 * Hook to fetch KDS orders
 * 
 * SECURITY:
 * - RLS policies enforce restaurant_id isolation at database level
 * - RLS policies require KDS to be enabled
 * - RLS policies require restaurant to be active
 * - Kitchen users can only see their assigned restaurant's orders
 */
export function useKDSOrders(
  restaurantId: string | null,
  branchId: string | null,
  options?: UseKDSOrdersOptions
) {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef(true);

  // SECURITY: Validate that user has appropriate role
  const isAllowedRole = role === "owner" || role === "kitchen";

  const ordersQuery = useQuery({
    queryKey: ["kds-orders", restaurantId, branchId],
    queryFn: async () => {
      // SECURITY: Defensive check - don't fetch if no restaurant or unauthorized
      if (!restaurantId || !user || !isAllowedRole) {
        console.warn("KDS orders fetch blocked: missing restaurantId, user, or unauthorized role");
        return [];
      }

      // Calculate time window: last 12 hours OR today (whichever is more recent)
      const now = new Date();
      const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const timeWindowStart = twelveHoursAgo < todayStart ? todayStart : twelveHoursAgo;

      let query = supabase
        .from("orders")
        .select(`
          id,
          order_number,
          source,
          status,
          table_id,
          created_at,
          order_notes,
          restaurant_tables(table_name),
          order_items(id, name, quantity, notes, voided)
        `)
        .eq("restaurant_id", restaurantId)
        // Only active kitchen statuses - explicitly exclude paid/completed/cancelled/void/closed
        .in("status", ["new", "in_progress", "ready"])
        // Time window: only recent orders (today or last 12 hours)
        .gte("created_at", timeWindowStart.toISOString())
        .order("created_at", { ascending: true });

      // SECURITY: Kitchen users are restricted to their branch by RLS
      // This is an additional frontend filter for UX, not security
      if (branchId) {
        query = query.eq("branch_id", branchId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching KDS orders:", error);
        // SECURITY: Don't expose error details, just throw generic error
        throw new Error("Failed to load orders");
      }

      // Filter and map orders
      const filteredOrders = (data || [])
        // Exclude pending/unconfirmed QR orders (only include accepted QR orders or POS orders)
        .filter((order: any) => {
          // POS orders are always included
          if (order.source === "pos") return true;
          // QR orders only if they're in active kitchen statuses (already accepted into kitchen flow)
          // Status 'new', 'in_progress', 'ready' means they've been accepted
          if (order.source === "qr" && ["new", "in_progress", "ready"].includes(order.status)) return true;
          // Exclude any other sources or pending QR orders
          return false;
        })
        .map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          source: order.source,
          status: order.status,
          table_id: order.table_id,
          table_name: order.restaurant_tables?.table_name,
          created_at: order.created_at,
          order_notes: order.order_notes,
          items: (order.order_items || []).filter((item: any) => !item.voided),
        })) as KDSOrder[];

      return filteredOrders;
    },
    // SECURITY: Only enable query if all security conditions are met
    enabled: !!restaurantId && !!user && isAllowedRole,
    refetchInterval: 30000, // Fallback polling every 30s
  });

  // Detect new orders and trigger callback
  useEffect(() => {
    if (!ordersQuery.data) return;

    const currentOrders = ordersQuery.data;
    const newOrders = currentOrders.filter((o) => o.status === "new");

    // Skip initial load to avoid playing sound for existing orders
    if (isInitialLoadRef.current) {
      newOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
      isInitialLoadRef.current = false;
      return;
    }

    // Find truly new orders
    newOrders.forEach((order) => {
      if (!knownOrderIdsRef.current.has(order.id)) {
        knownOrderIdsRef.current.add(order.id);
        options?.onNewOrder?.(order.id);
      }
    });

    // Update known orders set
    currentOrders.forEach((o) => knownOrderIdsRef.current.add(o.id));
  }, [ordersQuery.data, options]);

  // Set up realtime subscription
  useEffect(() => {
    if (!restaurantId || !user || !isAllowedRole) return;

    const channel = supabase
      .channel("kds-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        (payload) => {
          console.log("KDS order update:", payload);
          queryClient.invalidateQueries({ queryKey: ["kds-orders", restaurantId, branchId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [restaurantId, branchId, queryClient, user, isAllowedRole]);

  return ordersQuery;
}

/**
 * Hook to update order status
 * 
 * SECURITY:
 * - RLS policies restrict Kitchen to updating status field only
 * - RLS policies require KDS to be enabled
 * - RLS policies require restaurant to be active
 * - Only valid status values are accepted
 */
export function useUpdateOrderStatus() {
  const { role, user } = useAuth();
  const queryClient = useQueryClient();

  // SECURITY: Validate role
  const isAllowedRole = role === "owner" || role === "kitchen";

  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: KDSOrderStatus }) => {
      // SECURITY: Defensive validation
      if (!user || !isAllowedRole) {
        throw new Error("Unauthorized: You do not have permission to update orders");
      }

      // SECURITY: Validate status is one of allowed values
      const validStatuses: KDSOrderStatus[] = ["new", "in_progress", "ready"];
      if (!validStatuses.includes(status)) {
        throw new Error("Invalid status value");
      }

      // SECURITY: Validate orderId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(orderId)) {
        throw new Error("Invalid order ID format");
      }

      // SECURITY: Only update status and updated_at fields
      // RLS policies will enforce that Kitchen can only update status
      const { error } = await supabase
        .from("orders")
        .update({ 
          status, 
          updated_at: new Date().toISOString() 
        })
        .eq("id", orderId);

      if (error) {
        console.error("Error updating order status:", error);
        // SECURITY: Check for RLS violation
        if (error.code === "42501" || error.message?.includes("policy")) {
          throw new Error("Permission denied: You cannot update this order");
        }
        throw new Error("Failed to update order status");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kds-orders"] });
    },
  });
}
