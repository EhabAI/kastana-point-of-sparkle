import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface LowStockItem {
  itemId: string;
  itemName: string;
  branchId: string;
  branchName: string;
  onHandBase: number;
  minLevel: number;
  reorderPoint: number;
  unitName: string;
}

interface RecentTransaction {
  id: string;
  txnType: string;
  itemName: string;
  qty: number;
  unitName: string;
  createdAt: string;
  branchName: string;
}

interface WasteSummaryItem {
  itemId: string;
  itemName: string;
  totalWaste: number;
  unitName: string;
}

export function useLowStockItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["low-stock-items", restaurantId],
    queryFn: async (): Promise<LowStockItem[]> => {
      if (!restaurantId) return [];

      // Get stock levels with item and branch info
      const { data: stockLevels, error: stockError } = await supabase
        .from("inventory_stock_levels")
        .select(`
          item_id,
          branch_id,
          on_hand_base,
          inventory_items!inner (
            id,
            name,
            min_level,
            reorder_point,
            base_unit_id,
            inventory_units!inventory_items_base_unit_id_fkey (name)
          ),
          restaurant_branches!inner (id, name)
        `)
        .eq("restaurant_id", restaurantId);

      if (stockError) {
        console.error("Error fetching stock levels:", stockError);
        return [];
      }

      // Filter items where on_hand_base <= reorder_point (matches InventoryRiskCard logic)
      const lowStock = (stockLevels || [])
        .filter((sl: any) => {
          const onHand = sl.on_hand_base || 0;
          const reorderPoint = sl.inventory_items.reorder_point || 0;
          return onHand <= reorderPoint;
        })
        .map((sl: any) => ({
          itemId: sl.item_id,
          itemName: sl.inventory_items.name,
          branchId: sl.branch_id,
          branchName: sl.restaurant_branches.name,
          onHandBase: sl.on_hand_base,
          minLevel: sl.inventory_items.min_level,
          reorderPoint: sl.inventory_items.reorder_point,
          unitName: sl.inventory_items.inventory_units?.name || "",
        }));

      return lowStock;
    },
    enabled: !!restaurantId,
  });
}

export function useNearReorderItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["near-reorder-items", restaurantId],
    queryFn: async (): Promise<LowStockItem[]> => {
      if (!restaurantId) return [];

      const { data: stockLevels, error: stockError } = await supabase
        .from("inventory_stock_levels")
        .select(`
          item_id,
          branch_id,
          on_hand_base,
          inventory_items!inner (
            id,
            name,
            min_level,
            reorder_point,
            base_unit_id,
            inventory_units!inventory_items_base_unit_id_fkey (name)
          ),
          restaurant_branches!inner (id, name)
        `)
        .eq("restaurant_id", restaurantId);

      if (stockError) {
        console.error("Error fetching stock levels:", stockError);
        return [];
      }

      // Filter items where on_hand_base is between min_level and reorder_point (warning level)
      const nearReorder = (stockLevels || [])
        .filter((sl: any) => {
          const onHand = sl.on_hand_base || 0;
          const minLevel = sl.inventory_items.min_level || 0;
          const reorderPoint = sl.inventory_items.reorder_point || 0;
          // Items above min_level but at or below reorder_point
          return onHand > minLevel && onHand <= reorderPoint;
        })
        .map((sl: any) => ({
          itemId: sl.item_id,
          itemName: sl.inventory_items.name,
          branchId: sl.branch_id,
          branchName: sl.restaurant_branches.name,
          onHandBase: sl.on_hand_base,
          minLevel: sl.inventory_items.min_level,
          reorderPoint: sl.inventory_items.reorder_point,
          unitName: sl.inventory_items.inventory_units?.name || "",
        }));

      return nearReorder;
    },
    enabled: !!restaurantId,
  });
}

export function useRecentTransactions(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["recent-inventory-transactions", restaurantId],
    queryFn: async (): Promise<RecentTransaction[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          id,
          txn_type,
          qty,
          created_at,
          branch_id,
          inventory_items!inner (name),
          inventory_units!inner (name),
          restaurant_branches!inner (name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      return (data || []).map((tx: any) => ({
        id: tx.id,
        txnType: tx.txn_type,
        itemName: tx.inventory_items.name,
        qty: tx.qty,
        unitName: tx.inventory_units.name,
        createdAt: tx.created_at,
        branchName: tx.restaurant_branches.name,
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useWasteSummary(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["waste-summary", restaurantId],
    queryFn: async (): Promise<WasteSummaryItem[]> => {
      if (!restaurantId) return [];

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          item_id,
          qty,
          inventory_items!inner (name, base_unit_id, inventory_units!inventory_items_base_unit_id_fkey (name))
        `)
        .eq("restaurant_id", restaurantId)
        .eq("txn_type", "WASTE")
        .gte("created_at", sevenDaysAgo.toISOString());

      if (error) {
        console.error("Error fetching waste summary:", error);
        return [];
      }

      // Group by item and sum quantities
      const wasteMap = new Map<string, { name: string; total: number; unitName: string }>();

      (data || []).forEach((tx: any) => {
        const itemId = tx.item_id;
        const existing = wasteMap.get(itemId);
        if (existing) {
          existing.total += Math.abs(tx.qty);
        } else {
          wasteMap.set(itemId, {
            name: tx.inventory_items.name,
            total: Math.abs(tx.qty),
            unitName: tx.inventory_items.inventory_units?.name || "",
          });
        }
      });

      return Array.from(wasteMap.entries()).map(([itemId, data]) => ({
        itemId,
        itemName: data.name,
        totalWaste: data.total,
        unitName: data.unitName,
      }));
    },
    enabled: !!restaurantId,
  });
}
