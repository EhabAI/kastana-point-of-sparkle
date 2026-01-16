import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// DB-allowed payment methods ONLY
export const ALLOWED_PAYMENT_METHODS = ["cash", "visa", "cliq", "zain_cash", "orange_money", "umniah_wallet"] as const;
export type AllowedPaymentMethod = typeof ALLOWED_PAYMENT_METHODS[number];

export interface PaymentMethodConfig {
  id: AllowedPaymentMethod;
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

      // If no settings found, return defaults
      if (!data) return getDefaultMethods();

      // Map DB columns to allowed methods only
      return [
        { id: "cash", label: "Cash", enabled: data.cash_enabled },
        { id: "visa", label: "Visa / Card", enabled: data.visa_enabled },
        { id: "cliq", label: "CliQ", enabled: data.efawateer_enabled }, // Map efawateer column to cliq
        { id: "zain_cash", label: "محفظة", enabled: data.wallet_enabled }, // Map wallet column
        { id: "orange_money", label: "Orange Money", enabled: false },
        { id: "umniah_wallet", label: "Umniah Wallet", enabled: false },
      ];
    },
    enabled: !!branchId,
  });
}

function getDefaultMethods(): PaymentMethodConfig[] {
  return [
    { id: "cash", label: "Cash", enabled: true },
    { id: "visa", label: "Visa / Card", enabled: true },
    { id: "cliq", label: "CliQ", enabled: false },
    { id: "zain_cash", label: "محفظة", enabled: false },
    { id: "orange_money", label: "Orange Money", enabled: false },
    { id: "umniah_wallet", label: "Umniah Wallet", enabled: false },
  ];
}

// Validate that a method is allowed before inserting
export function isValidPaymentMethod(method: string): method is AllowedPaymentMethod {
  return ALLOWED_PAYMENT_METHODS.includes(method as AllowedPaymentMethod);
}
