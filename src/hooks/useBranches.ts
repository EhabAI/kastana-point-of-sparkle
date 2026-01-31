import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";
import { resolveMessage } from "@/lib/messageResolver";

export interface Branch {
  id: string;
  restaurant_id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function useBranches(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["branches", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("restaurant_branches")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Branch[];
    },
    enabled: !!restaurantId,
  });
}

export function useDefaultBranch(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ["default-branch", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;

      const { data, error } = await supabase
        .from("restaurant_branches")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_default", true)
        .single();

      if (error) throw error;
      return data as Branch;
    },
    enabled: !!restaurantId,
  });
}

export function useCreateBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  return useMutation({
    mutationFn: async (data: {
      restaurant_id: string;
      name: string;
      code?: string;
      address?: string;
      phone?: string;
    }) => {
      const { data: branch, error } = await supabase
        .from("restaurant_branches")
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return branch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branches", data.restaurant_id] });
      toast({ title: resolveMessage("branch_created", language) });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Branch> & { id: string }) => {
      const { data: branch, error } = await supabase
        .from("restaurant_branches")
        .update(data)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return branch;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branches", data.restaurant_id] });
      toast({ title: resolveMessage("branch_updated", language) });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language, t } = useLanguage();

  return useMutation({
    mutationFn: async ({ branchId, restaurantId }: { branchId: string; restaurantId: string }) => {
      // Check for active cashiers assigned to this branch
      const { data: activeCashiers, error: cashiersError } = await supabase
        .from("user_roles")
        .select("id")
        .eq("branch_id", branchId)
        .eq("is_active", true)
        .eq("role", "cashier");

      if (cashiersError) throw cashiersError;

      if (activeCashiers && activeCashiers.length > 0) {
        throw new Error("ACTIVE_CASHIERS");
      }

      // Check for open shifts at this branch
      const { data: openShifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("id")
        .eq("branch_id", branchId)
        .eq("status", "open");

      if (shiftsError) throw shiftsError;

      if (openShifts && openShifts.length > 0) {
        throw new Error("OPEN_SHIFTS");
      }

      const { error } = await supabase
        .from("restaurant_branches")
        .delete()
        .eq("id", branchId);

      if (error) throw error;
      return { branchId, restaurantId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branches", data.restaurantId] });
      toast({ title: resolveMessage("branch_deleted", language) });
    },
    onError: (error: Error) => {
      // Return specific error message for UI to handle (ACTIVE_CASHIERS / OPEN_SHIFTS)
      if (error.message === "ACTIVE_CASHIERS" || error.message === "OPEN_SHIFTS") {
        // Don't show toast here - let UI handle it via the error handler
        return;
      }
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}
