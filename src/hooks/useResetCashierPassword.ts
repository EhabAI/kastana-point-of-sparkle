import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface ResetPasswordParams {
  userId: string;
  newPassword: string;
  restaurantId: string;
}

export function useResetCashierPassword() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async ({ userId, newPassword, restaurantId }: ResetPasswordParams) => {
      const { data, error } = await supabase.functions.invoke("admin-reset-password", {
        body: {
          user_id: userId,
          new_password: newPassword,
          restaurant_id: restaurantId,
        },
      });

      if (error) {
        throw new Error(error.message || t("password_reset_failed"));
      }

      if (data?.error) {
        throw new Error(data.error.message || t("password_reset_failed"));
      }

      return data;
    },
    onSuccess: () => {
      toast({ title: t("password_reset_success") });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    },
    onError: (error: Error) => {
      toast({
        title: t("password_reset_failed"),
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
