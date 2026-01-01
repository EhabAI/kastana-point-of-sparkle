import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface BranchTable {
  id: string;
  table_name: string;
  table_code: string;
  capacity: number | null;
  is_active: boolean;
  hasOpenOrder?: boolean;
}

export function useBranchTables(branchId: string | undefined) {
  return useQuery({
    queryKey: ["branch-tables", branchId],
    queryFn: async () => {
      if (!branchId) return [];

      // Get tables for this branch
      const { data: tables, error: tablesError } = await supabase
        .from("restaurant_tables")
        .select("id, table_name, table_code, capacity, is_active")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .order("table_name", { ascending: true });

      if (tablesError) throw tablesError;

      // Get open orders to check table status (using table_id column)
      const { data: openOrders, error: ordersError } = await supabase
        .from("orders")
        .select("id, table_id")
        .eq("branch_id", branchId)
        .in("status", ["open", "confirmed", "held"])
        .not("table_id", "is", null);

      if (ordersError) throw ordersError;

      // Map tables with open order status
      const tablesWithStatus = (tables || []).map((table) => {
        // Check if any open order has this table_id
        const hasOpenOrder = (openOrders || []).some(
          (order) => order.table_id === table.id
        );
        return {
          ...table,
          hasOpenOrder,
        } as BranchTable;
      });

      return tablesWithStatus;
    },
    enabled: !!branchId,
  });
}
