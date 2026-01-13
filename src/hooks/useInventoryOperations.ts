import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}

export interface StockCount {
  id: string;
  restaurantId: string;
  branchId: string;
  branchName: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "CANCELLED";
  createdBy: string;
  approvedBy: string | null;
  approvedByName?: string | null;
  createdAt: string;
  approvedAt: string | null;
  notes: string | null;
  // Variance summary (populated for APPROVED counts)
  totalPositiveVariance?: number;
  totalNegativeVariance?: number;
  itemsWithVariance?: number;
  totalItems?: number;
}

export interface StockCountLine {
  id: string;
  stockCountId: string;
  itemId: string;
  itemName: string;
  unitName: string;
  expectedBase: number;
  actualBase: number;
  varianceBase: number | null;
}

export function useSuppliers(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["suppliers", restaurantId],
    queryFn: async (): Promise<Supplier[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching suppliers:", error);
        return [];
      }

      return (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        phone: s.phone,
        email: s.email,
        address: s.address,
        isActive: s.is_active,
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      name,
      phone,
    }: {
      restaurantId: string;
      name: string;
      phone?: string;
    }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ restaurant_id: restaurantId, name, phone })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
  });
}

export function useStockCounts(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["stock-counts", restaurantId],
    queryFn: async (): Promise<StockCount[]> => {
      if (!restaurantId) return [];

      // Fetch stock counts with branch name
      const { data, error } = await supabase
        .from("stock_counts")
        .select(`
          id,
          restaurant_id,
          branch_id,
          status,
          created_by,
          approved_by,
          created_at,
          approved_at,
          notes,
          restaurant_branches!inner (name)
        `)
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching stock counts:", error);
        return [];
      }

      // Get unique approver IDs to fetch their names
      const approverIds = [...new Set(
        (data || [])
          .filter((sc: any) => sc.approved_by)
          .map((sc: any) => sc.approved_by)
      )];

      // Fetch approver profiles
      let approverMap = new Map<string, string>();
      if (approverIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, email")
          .in("id", approverIds);
        
        if (profiles) {
          profiles.forEach((p: any) => {
            approverMap.set(p.id, p.email?.split("@")[0] || "Unknown");
          });
        }
      }

      // For APPROVED counts, fetch variance summaries
      const approvedCountIds = (data || [])
        .filter((sc: any) => sc.status === "APPROVED")
        .map((sc: any) => sc.id);

      let varianceSummaries = new Map<string, { positive: number; negative: number; itemsWithVariance: number; totalItems: number }>();
      
      if (approvedCountIds.length > 0) {
        const { data: lines } = await supabase
          .from("stock_count_lines")
          .select("stock_count_id, expected_base, actual_base")
          .in("stock_count_id", approvedCountIds);

        if (lines) {
          // Group by stock_count_id
          const grouped = new Map<string, { expected_base: number; actual_base: number }[]>();
          lines.forEach((line: any) => {
            const existing = grouped.get(line.stock_count_id) || [];
            existing.push({ expected_base: line.expected_base, actual_base: line.actual_base });
            grouped.set(line.stock_count_id, existing);
          });

          // Calculate summaries
          grouped.forEach((countLines, countId) => {
            let positive = 0;
            let negative = 0;
            let itemsWithVariance = 0;
            
            countLines.forEach((line) => {
              const variance = line.actual_base - line.expected_base;
              if (Math.abs(variance) > 0.01) {
                itemsWithVariance++;
                if (variance > 0) {
                  positive += variance;
                } else {
                  negative += Math.abs(variance);
                }
              }
            });

            varianceSummaries.set(countId, {
              positive,
              negative,
              itemsWithVariance,
              totalItems: countLines.length,
            });
          });
        }
      }

      return (data || []).map((sc: any) => {
        const summary = varianceSummaries.get(sc.id);
        return {
          id: sc.id,
          restaurantId: sc.restaurant_id,
          branchId: sc.branch_id,
          branchName: sc.restaurant_branches.name,
          status: sc.status,
          createdBy: sc.created_by,
          approvedBy: sc.approved_by,
          approvedByName: sc.approved_by ? approverMap.get(sc.approved_by) : null,
          createdAt: sc.created_at,
          approvedAt: sc.approved_at,
          notes: sc.notes,
          totalPositiveVariance: summary?.positive,
          totalNegativeVariance: summary?.negative,
          itemsWithVariance: summary?.itemsWithVariance,
          totalItems: summary?.totalItems,
        };
      });
    },
    enabled: !!restaurantId,
  });
}

export function useStockCountLines(stockCountId: string | undefined) {
  return useQuery({
    queryKey: ["stock-count-lines", stockCountId],
    queryFn: async (): Promise<StockCountLine[]> => {
      if (!stockCountId) return [];

      const { data, error } = await supabase
        .from("stock_count_lines")
        .select(`
          id,
          stock_count_id,
          item_id,
          expected_base,
          actual_base,
          variance_base,
          inventory_items!inner (name, inventory_units!inventory_items_base_unit_id_fkey (name))
        `)
        .eq("stock_count_id", stockCountId);

      if (error) {
        console.error("Error fetching stock count lines:", error);
        return [];
      }

      return (data || []).map((line: any) => ({
        id: line.id,
        stockCountId: line.stock_count_id,
        itemId: line.item_id,
        itemName: line.inventory_items.name,
        unitName: line.inventory_items.inventory_units?.name || "",
        expectedBase: line.expected_base,
        actualBase: line.actual_base,
        varianceBase: line.variance_base,
      }));
    },
    enabled: !!stockCountId,
  });
}

export function useCreateStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      branchId,
      createdBy,
      notes,
    }: {
      restaurantId: string;
      branchId: string;
      createdBy: string;
      notes?: string;
    }) => {
      // Create the stock count
      const { data, error } = await supabase
        .from("stock_counts")
        .insert({
          restaurant_id: restaurantId,
          branch_id: branchId,
          created_by: createdBy,
          notes,
          status: "DRAFT",
        })
        .select()
        .single();

      if (error) throw error;

      // Write audit log for STOCK_COUNT_CREATED
      await supabase.from("audit_logs").insert({
        user_id: createdBy,
        restaurant_id: restaurantId,
        entity_type: "stock_count",
        entity_id: data.id,
        action: "STOCK_COUNT_CREATED",
        details: {
          branch_id: branchId,
          notes: notes || null,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
    },
  });
}

export function useUpdateStockCountLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      lineId,
      actualBase,
      stockCountId,
    }: {
      lineId: string;
      actualBase: number;
      stockCountId: string;
    }) => {
      // First check if stock count is still in DRAFT status
      const { data: stockCount, error: fetchError } = await supabase
        .from("stock_counts")
        .select("status")
        .eq("id", stockCountId)
        .single();

      if (fetchError) throw fetchError;

      // Block updates on APPROVED or CANCELLED stock counts (immutable)
      if (stockCount.status === "APPROVED" || stockCount.status === "CANCELLED") {
        throw new Error(`Cannot modify ${stockCount.status} stock count - immutable`);
      }

      const { error } = await supabase
        .from("stock_count_lines")
        .update({ actual_base: actualBase })
        .eq("id", lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-count-lines"] });
    },
  });
}

export function useSubmitStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ stockCountId }: { stockCountId: string }) => {
      // First check if stock count is in DRAFT status
      const { data: stockCount, error: fetchError } = await supabase
        .from("stock_counts")
        .select("status")
        .eq("id", stockCountId)
        .single();

      if (fetchError) throw fetchError;

      // Only DRAFT can be submitted
      if (stockCount.status !== "DRAFT") {
        throw new Error(`Cannot submit ${stockCount.status} stock count`);
      }

      const { error } = await supabase
        .from("stock_counts")
        .update({ status: "SUBMITTED" })
        .eq("id", stockCountId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
    },
  });
}

export function useCancelStockCount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      stockCountId,
      userId,
      restaurantId,
      reason,
    }: {
      stockCountId: string;
      userId: string;
      restaurantId: string;
      reason?: string;
    }) => {
      // First check current status
      const { data: stockCount, error: fetchError } = await supabase
        .from("stock_counts")
        .select("status, branch_id")
        .eq("id", stockCountId)
        .single();

      if (fetchError) throw fetchError;

      // Cannot cancel APPROVED or already CANCELLED
      if (stockCount.status === "APPROVED") {
        throw new Error("Cannot cancel APPROVED stock count - immutable");
      }
      if (stockCount.status === "CANCELLED") {
        throw new Error("Stock count is already cancelled");
      }

      // Update status to CANCELLED
      const { error } = await supabase
        .from("stock_counts")
        .update({ status: "CANCELLED" })
        .eq("id", stockCountId);

      if (error) throw error;

      // Write audit log for STOCK_COUNT_CANCELLED
      await supabase.from("audit_logs").insert({
        user_id: userId,
        restaurant_id: restaurantId,
        entity_type: "stock_count",
        entity_id: stockCountId,
        action: "STOCK_COUNT_CANCELLED",
        details: {
          branch_id: stockCount.branch_id,
          previous_status: stockCount.status,
          reason: reason || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-counts"] });
    },
  });
}
