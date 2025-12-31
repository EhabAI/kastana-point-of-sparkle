import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface BranchPaymentMethods {
  id: string;
  branch_id: string;
  cash_enabled: boolean;
  visa_enabled: boolean;
  mastercard_enabled: boolean;
  efawateer_enabled: boolean;
  wallet_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export function useBranchPaymentMethods(branchId: string | undefined) {
  return useQuery({
    queryKey: ["branch-payment-methods", branchId],
    queryFn: async () => {
      if (!branchId) return null;

      const { data, error } = await supabase
        .from("branch_payment_methods")
        .select("*")
        .eq("branch_id", branchId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as BranchPaymentMethods | null;
    },
    enabled: !!branchId,
  });
}

export function useUpdateBranchPaymentMethods() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      branchId,
      cashEnabled,
      visaEnabled,
      mastercardEnabled,
      efawateerEnabled,
      walletEnabled,
    }: {
      branchId: string;
      cashEnabled?: boolean;
      visaEnabled?: boolean;
      mastercardEnabled?: boolean;
      efawateerEnabled?: boolean;
      walletEnabled?: boolean;
    }) => {
      const updates: Partial<BranchPaymentMethods> = {};
      if (cashEnabled !== undefined) updates.cash_enabled = cashEnabled;
      if (visaEnabled !== undefined) updates.visa_enabled = visaEnabled;
      if (mastercardEnabled !== undefined) updates.mastercard_enabled = mastercardEnabled;
      if (efawateerEnabled !== undefined) updates.efawateer_enabled = efawateerEnabled;
      if (walletEnabled !== undefined) updates.wallet_enabled = walletEnabled;

      const { data, error } = await supabase
        .from("branch_payment_methods")
        .update(updates)
        .eq("branch_id", branchId)
        .select()
        .single();

      if (error) throw error;
      return data as BranchPaymentMethods;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["branch-payment-methods", data.branch_id] });
      toast({ title: "Payment methods updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update payment methods", description: error.message, variant: "destructive" });
    },
  });
}
