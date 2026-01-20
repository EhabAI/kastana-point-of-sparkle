import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCashierRestaurant } from "./useCashierRestaurant";
import { ALLOWED_PAYMENT_METHODS, isValidPaymentMethod, type AllowedPaymentMethod } from "./useCashierPaymentMethods";

export type PaymentMethod = AllowedPaymentMethod;

// Helper: round to 3 decimals using HALF-UP (JOD standard)
const roundJOD = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * @deprecated Use useCompletePayment for atomic payment processing
 * This hook is kept for backwards compatibility but should not be used
 * for new payment flows as it doesn't prevent race conditions.
 */
export function useAddPayment() {
  const { data: restaurant } = useCashierRestaurant();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      method,
      amount,
    }: {
      orderId: string;
      method: string;
      amount: number;
    }) => {
      if (!restaurant?.id) throw new Error("Missing restaurant");

      // CRITICAL: Validate payment method before insert
      if (!isValidPaymentMethod(method)) {
        throw new Error(`Invalid payment method: ${method}. Allowed: ${ALLOWED_PAYMENT_METHODS.join(", ")}`);
      }

      const { data, error } = await supabase
        .from("payments")
        .insert({
          order_id: orderId,
          restaurant_id: restaurant.id,
          method,
          amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}

/**
 * @deprecated Use useCompletePayment for atomic payment processing
 */
export function useCompleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      payments 
    }: { 
      orderId: string; 
      payments: { method: string; amount: number }[] 
    }) => {
      // Fetch order to validate
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("total")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;
      if (!order) throw new Error("Order not found");

      const orderTotal = roundJOD(order.total);
      const paymentTotal = roundJOD(payments.reduce((sum, p) => sum + p.amount, 0));
      const allCash = payments.every(p => p.method === "cash");

      // BACKEND VALIDATION (CRITICAL)
      // 1. Card payments must be exact (no overpayment)
      if (!allCash && paymentTotal > orderTotal + 0.001) {
        throw new Error("Card payments must be exact. No overpayment allowed.");
      }

      // 2. Total payments must cover the order (within 3-decimal precision)
      if (paymentTotal < orderTotal - 0.001) {
        throw new Error("Payment total is less than order total.");
      }

      // 3. If there's overpayment, ALL methods must be cash
      if (paymentTotal > orderTotal + 0.001 && !allCash) {
        throw new Error("Overpayment is only allowed when all payment methods are cash.");
      }

      // All validations passed - complete the order
      const { data, error } = await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
    },
  });
}

/**
 * Atomic payment completion - prevents double payments via race conditions.
 * This hook calls the complete-payment edge function which:
 * 1. Validates JWT and user role (cashier/owner)
 * 2. Validates restaurant is active
 * 3. Atomically checks order status and updates to 'paid'
 * 4. Inserts all payment records
 * 5. Rolls back on any failure
 */
export function useCompletePayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      orderId, 
      payments 
    }: { 
      orderId: string; 
      payments: { method: string; amount: number }[] 
    }) => {
      // Call the atomic edge function
      const { data, error } = await supabase.functions.invoke("complete-payment", {
        body: { orderId, payments },
      });

      if (error) {
        console.error("[useCompletePayment] Edge function error:", error);
        throw new Error(error.message || "Payment failed");
      }

      if (!data?.success) {
        console.error("[useCompletePayment] Payment rejected:", data?.error);
        throw new Error(data?.error || "Payment failed");
      }

      return {
        order: data.order,
        payments: data.payments,
        change: data.change,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-order"] });
      queryClient.invalidateQueries({ queryKey: ["recent-orders"] });
      queryClient.invalidateQueries({ queryKey: ["open-orders"] });
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });
      queryClient.invalidateQueries({ queryKey: ["kds-orders"] }); // Takeaway orders go to kitchen after payment
    },
  });
}
