import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_name: string;
  table_code: string;
  is_active: boolean;
  capacity: number | null;
  created_at: string;
}

// Generate a short, human-friendly unique code
function generateTableCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid ambiguous chars like 0/O, 1/I
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function useRestaurantTables(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["restaurant-tables", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as RestaurantTable[];
    },
    enabled: !!restaurantId,
  });
}

export function useCreateRestaurantTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      tableName,
      capacity = 4,
    }: {
      restaurantId: string;
      tableName: string;
      capacity?: number;
    }) => {
      // Generate unique table code with retry logic
      let tableCode = generateTableCode();
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const { data, error } = await supabase
          .from("restaurant_tables")
          .insert({
            restaurant_id: restaurantId,
            table_name: tableName,
            table_code: tableCode,
            capacity,
          })
          .select()
          .single();

        if (!error) {
          return data as RestaurantTable;
        }

        // If unique constraint violation, try a new code
        if (error.code === "23505") {
          tableCode = generateTableCode();
          attempts++;
        } else {
          throw error;
        }
      }

      throw new Error("Failed to generate unique table code after multiple attempts");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", data.restaurant_id] });
      toast({ title: "Table created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create table", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateRestaurantTable() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      tableName,
      isActive,
      capacity,
    }: {
      id: string;
      tableName?: string;
      isActive?: boolean;
      capacity?: number;
    }) => {
      const updates: Partial<RestaurantTable> = {};
      if (tableName !== undefined) updates.table_name = tableName;
      if (isActive !== undefined) updates.is_active = isActive;
      if (capacity !== undefined) updates.capacity = capacity;

      const { data, error } = await supabase
        .from("restaurant_tables")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as RestaurantTable;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["restaurant-tables", data.restaurant_id] });
      toast({ title: "Table updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update table", description: error.message, variant: "destructive" });
    },
  });
}
