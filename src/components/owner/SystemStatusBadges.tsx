import { useLanguage } from "@/contexts/LanguageContext";
import { Check, X, Package, ChefHat, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SystemStatusBadges() {
  const { t } = useLanguage();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();

  // Fetch KDS enabled status
  const { data: kdsEnabled } = useQuery({
    queryKey: ["kds-enabled-status", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return false;
      const { data, error } = await supabase
        .from("restaurant_settings")
        .select("kds_enabled")
        .eq("restaurant_id", restaurant.id)
        .maybeSingle();
      if (error) return false;
      return data?.kds_enabled ?? false;
    },
    enabled: !!restaurant?.id,
  });
  // Smart Assistant is always enabled in this system
  const smartAssistantEnabled = true;

  const modules = [
    {
      key: "inventory",
      label: t("inventory"),
      enabled: inventoryEnabled,
      icon: Package,
    },
    {
      key: "kds",
      label: t("kds"),
      enabled: kdsEnabled,
      icon: ChefHat,
    },
    {
      key: "assistant",
      label: t("smart_assistant"),
      enabled: smartAssistantEnabled,
      icon: Bot,
    },
  ];

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2 flex-wrap">
        {modules.map(({ key, label, enabled, icon: Icon }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium cursor-default transition-colors",
                  enabled
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground"
                )}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{label}</span>
                {enabled ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <X className="h-3 w-3 opacity-50" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}: {enabled ? t("enabled") : t("disabled")}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
