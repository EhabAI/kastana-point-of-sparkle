import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCashierSession } from "./useCashierSession";
import { useAuditLog } from "./useAuditLog";

export function useCurrentShift() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["current-shift", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("cashier_id", user.id)
        .eq("status", "open")
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });
}

export function useOpenShift() {
  const { user } = useAuth();
  const { data: session } = useCashierSession();
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async (openingCash: number) => {
      if (!user?.id || !session?.restaurant?.id || !session?.branch?.id) {
        throw new Error("Missing user, restaurant or branch");
      }

      const { data, error } = await supabase
        .from("shifts")
        .insert({
          cashier_id: user.id,
          restaurant_id: session.restaurant.id,
          branch_id: session.branch.id,
          opening_cash: openingCash,
          status: "open",
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit for shift open
      await auditLog.mutateAsync({
        entityType: "shift",
        entityId: data.id,
        action: "SHIFT_OPEN",
        details: {
          opening_cash: openingCash,
          branch_id: session.branch.id,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-shift"] });
    },
  });
}

export function useCloseShift() {
  const { user } = useAuth();
  const { data: session } = useCashierSession();
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async ({ shiftId, closingCash }: { shiftId: string; closingCash: number }) => {
      const { data, error } = await supabase
        .from("shifts")
        .update({
          status: "closed",
          closing_cash: closingCash,
          closed_at: new Date().toISOString(),
        })
        .eq("id", shiftId)
        .select()
        .single();

      if (error) throw error;

      // Log audit for shift close
      if (session?.restaurant?.id) {
        await auditLog.mutateAsync({
          entityType: "shift",
          entityId: shiftId,
          action: "SHIFT_CLOSE",
          details: {
            closing_cash: closingCash,
            opening_cash: data.opening_cash,
            user_id: user?.id,
          },
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-shift"] });
    },
  });
}

export function useCashMovement() {
  const { user } = useAuth();
  const { data: session } = useCashierSession();
  const queryClient = useQueryClient();
  const auditLog = useAuditLog();

  return useMutation({
    mutationFn: async ({
      shiftId,
      type,
      amount,
      reason,
    }: {
      shiftId: string;
      type: "cash_in" | "cash_out";
      amount: number;
      reason?: string;
    }) => {
      if (!session?.restaurant?.id) throw new Error("Missing restaurant");

      const { data, error } = await supabase
        .from("shift_transactions")
        .insert({
          shift_id: shiftId,
          restaurant_id: session.restaurant.id,
          branch_id: session.branch?.id,
          type,
          amount,
          reason,
        })
        .select()
        .single();

      if (error) throw error;

      // Log audit for cash movement
      await auditLog.mutateAsync({
        entityType: "shift_transaction",
        entityId: data.id,
        action: "CASH_MOVEMENT",
        details: {
          shift_id: shiftId,
          cashier_id: user?.id,
          amount,
          type: type === "cash_in" ? "IN" : "OUT",
          reason: reason || null,
        },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shift-transactions"] });
    },
  });
}

export function useShiftTransactions(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["shift-transactions", shiftId],
    queryFn: async () => {
      if (!shiftId) return [];

      const { data, error } = await supabase
        .from("shift_transactions")
        .select("*")
        .eq("shift_id", shiftId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!shiftId,
  });
}
