import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Percent, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiscountSettingsData {
  discounts_enabled: boolean;
  discount_type: string;
  max_discount_value: number | null;
}

export function DiscountSettings() {
  const { data: restaurant } = useOwnerRestaurant();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [discountsEnabled, setDiscountsEnabled] = useState(false);
  const [discountType, setDiscountType] = useState("percentage");
  const [maxDiscountValue, setMaxDiscountValue] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["discount-settings", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("discounts_enabled, discount_type, max_discount_value")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (error) throw error;
      return data as DiscountSettingsData | null;
    },
    enabled: !!restaurant?.id,
  });

  useEffect(() => {
    if (settings) {
      setDiscountsEnabled(settings.discounts_enabled);
      setDiscountType(settings.discount_type);
      setMaxDiscountValue(settings.max_discount_value?.toString() || "");
    }
  }, [settings]);

  const updateSettings = useMutation({
    mutationFn: async () => {
      if (!restaurant?.id) throw new Error("No restaurant found");

      const updates = {
        discounts_enabled: discountsEnabled,
        discount_type: discountType,
        max_discount_value: maxDiscountValue ? parseFloat(maxDiscountValue) : null,
      };

      // Check if settings exist
      const { data: existing } = await supabase
        .from("restaurant_settings")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("restaurant_settings")
          .update(updates)
          .eq("restaurant_id", restaurant.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("restaurant_settings")
          .insert({ restaurant_id: restaurant.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["discount-settings"] });
      toast({ title: t("discount_settings_saved") });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          {t("discount_settings")}
        </CardTitle>
        <CardDescription>
          {t("discount_settings_desc")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("enable_discounts")}</Label>
            <p className="text-sm text-muted-foreground">{t("allow_discounts")}</p>
          </div>
          <Switch
            checked={discountsEnabled}
            onCheckedChange={setDiscountsEnabled}
          />
        </div>

        <div className="space-y-2">
          <Label>{t("discount_type")}</Label>
          <Select value={discountType} onValueChange={setDiscountType}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t("percentage")}</SelectItem>
              <SelectItem value="fixed">{t("fixed_amount")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t("max_discount_value")}</Label>
          <Input
            type="number"
            placeholder={discountType === "percentage" ? "e.g., 20 for 20%" : "e.g., 10.00"}
            value={maxDiscountValue}
            onChange={(e) => setMaxDiscountValue(e.target.value)}
            min="0"
            step="0.01"
          />
          <p className="text-sm text-muted-foreground">
            {discountType === "percentage" 
              ? t("max_percent_desc")
              : t("max_fixed_desc")}
          </p>
        </div>

        <Button 
          onClick={() => updateSettings.mutate()} 
          disabled={updateSettings.isPending}
          className="w-full"
        >
          {updateSettings.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {t("save_discount_settings")}
        </Button>
      </CardContent>
    </Card>
  );
}
