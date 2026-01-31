import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  branchId: string;
  branchName: string;
  baseUnitId: string;
  baseUnitName: string;
  minLevel: number;
  reorderPoint: number;
  isActive: boolean;
  onHandBase: number;
  avgCost: number | null;
  createdAt: string;
}

export interface ItemTransaction {
  id: string;
  txnType: string;
  qty: number;
  qtyInBase: number;
  unitName: string;
  notes: string | null;
  createdAt: string;
  branchName: string;
}

export function useInventoryItems(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["inventory-items", restaurantId],
    queryFn: async (): Promise<InventoryItem[]> => {
      if (!restaurantId) return [];

      // Fetch items with branch and unit info
      const { data: items, error: itemsError } = await supabase
        .from("inventory_items")
        .select(`
          id,
          name,
          category,
          branch_id,
          base_unit_id,
          min_level,
          reorder_point,
          is_active,
          avg_cost,
          created_at,
          restaurant_branches!inventory_items_branch_id_fkey (id, name),
          inventory_units!inventory_items_base_unit_id_fkey (id, name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (itemsError) {
        console.error("Error fetching inventory items:", itemsError);
        return [];
      }

      // Fetch stock levels
      const { data: stockLevels, error: stockError } = await supabase
        .from("inventory_stock_levels")
        .select("item_id, on_hand_base")
        .eq("restaurant_id", restaurantId);

      if (stockError) {
        console.error("Error fetching stock levels:", stockError);
      }

      const stockMap = new Map<string, number>();
      (stockLevels || []).forEach((sl: any) => {
        stockMap.set(sl.item_id, sl.on_hand_base);
      });

      return (items || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        branchId: item.branch_id,
        branchName: item.restaurant_branches.name,
        baseUnitId: item.base_unit_id,
        baseUnitName: item.inventory_units?.name || "",
        minLevel: item.min_level,
        reorderPoint: item.reorder_point,
        isActive: item.is_active,
        onHandBase: stockMap.get(item.id) || 0,
        avgCost: item.avg_cost,
        createdAt: item.created_at,
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useUpdateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      name,
      minLevel,
      reorderPoint,
      isActive,
    }: {
      id: string;
      name: string;
      minLevel: number;
      reorderPoint: number;
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from("inventory_items")
        .update({
          name,
          min_level: minLevel,
          reorder_point: reorderPoint,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-items"] });
      queryClient.invalidateQueries({ queryKey: ["near-reorder-items"] });
    },
  });
}

export function useItemTransactions(itemId: string | undefined) {
  return useQuery({
    queryKey: ["item-transactions", itemId],
    queryFn: async (): Promise<ItemTransaction[]> => {
      if (!itemId) return [];

      const { data, error } = await supabase
        .from("inventory_transactions")
        .select(`
          id,
          txn_type,
          qty,
          qty_in_base,
          notes,
          created_at,
          inventory_units!inner (name),
          restaurant_branches!inner (name)
        `)
        .eq("item_id", itemId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching item transactions:", error);
        return [];
      }

      return (data || []).map((tx: any) => ({
        id: tx.id,
        txnType: tx.txn_type,
        qty: tx.qty,
        qtyInBase: tx.qty_in_base,
        unitName: tx.inventory_units.name,
        notes: tx.notes,
        createdAt: tx.created_at,
        branchName: tx.restaurant_branches.name,
      }));
    },
    enabled: !!itemId,
  });
}

// Re-export from dedicated units hook for backward compatibility
export { useInventoryUnits } from "./useInventoryUnits";

export function useCreateInventoryItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      branchId,
      name,
      baseUnitId,
      minLevel,
      reorderPoint,
    }: {
      restaurantId: string;
      branchId: string;
      name: string;
      baseUnitId: string;
      minLevel: number;
      reorderPoint: number;
    }) => {
      const { data, error } = await supabase
        .from("inventory_items")
        .insert({
          restaurant_id: restaurantId,
          branch_id: branchId,
          name,
          base_unit_id: baseUnitId,
          min_level: minLevel,
          reorder_point: reorderPoint,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    },
  });
}
