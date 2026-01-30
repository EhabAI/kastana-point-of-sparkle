import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";
import { Json } from "@/integrations/supabase/types";

export interface DayHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface BusinessHours {
  sunday: DayHours;
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  [key: string]: DayHours;
}

export interface OwnerRestaurantSettings {
  id: string;
  restaurant_id: string;
  tax_rate: number;
  prices_include_tax: boolean;
  currency: string;
  business_hours: BusinessHours;
  owner_phone: string | null;
}

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  sunday: { open: "09:00", close: "22:00", closed: false },
  monday: { open: "09:00", close: "22:00", closed: false },
  tuesday: { open: "09:00", close: "22:00", closed: false },
  wednesday: { open: "09:00", close: "22:00", closed: false },
  thursday: { open: "09:00", close: "22:00", closed: false },
  friday: { open: "09:00", close: "22:00", closed: false },
  saturday: { open: "09:00", close: "22:00", closed: false },
};

export function useOwnerRestaurantSettings() {
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();

  return useQuery({
    queryKey: ["owner-restaurant-settings", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("id, restaurant_id, tax_rate, prices_include_tax, currency, business_hours, owner_phone")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        return {
          ...data,
          business_hours: (data.business_hours as unknown as BusinessHours) || DEFAULT_BUSINESS_HOURS,
        } as OwnerRestaurantSettings;
      }

      return null;
    },
    enabled: !!restaurant?.id,
  });
}

export function useUpdateOwnerRestaurantSettings() {
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn: async (updates: {
      tax_rate?: number;
      prices_include_tax?: boolean;
      business_hours?: BusinessHours;
      owner_phone?: string | null;
    }) => {
      if (!restaurant?.id) throw new Error("No restaurant found");

      const dbUpdates = {
        ...updates,
        business_hours: updates.business_hours as unknown as Json,
      };

      // Check if settings exist
      const { data: existing } = await supabase
        .from("restaurant_settings")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("restaurant_settings")
          .update(dbUpdates)
          .eq("restaurant_id", restaurant.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("restaurant_settings").insert({
          restaurant_id: restaurant.id,
          ...dbUpdates,
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-restaurant-settings"] });
      toast({ title: t("settings_saved") || "Settings saved successfully" });
    },
    onError: (error) => {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    },
  });
}
