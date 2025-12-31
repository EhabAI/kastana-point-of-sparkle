import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PaymentMethodConfig {
  id: string;
  label: string;
  enabled: boolean;
}

export function useCashierPaymentMethods(branchId: string | undefined) {
  return useQuery({
    queryKey: ["cashier-payment-methods", branchId],
    queryFn: async (): Promise<PaymentMethodConfig[]> => {
      if (!branchId) return getDefaultMethods();

      const { data, error } = await supabase
        .from("branch_payment_methods")
        .select("*")
        .eq("branch_id", branchId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      // If no settings found, return defaults (all enabled)
      if (!data) return getDefaultMethods();

      return [
        { id: "cash", label: "Cash", enabled: data.cash_enabled },
        { id: "visa", label: "Visa", enabled: data.visa_enabled },
        { id: "mastercard", label: "Mastercard", enabled: data.mastercard_enabled },
        { id: "efawateer", label: "eFawateer", enabled: data.efawateer_enabled },
        { id: "wallet", label: "Wallet", enabled: data.wallet_enabled },
      ];
    },
    enabled: !!branchId,
  });
}

function getDefaultMethods(): PaymentMethodConfig[] {
  return [
    { id: "cash", label: "Cash", enabled: true },
    { id: "visa", label: "Visa", enabled: true },
    { id: "mastercard", label: "Mastercard", enabled: true },
    { id: "efawateer", label: "eFawateer", enabled: false },
    { id: "wallet", label: "Wallet", enabled: false },
  ];
}
