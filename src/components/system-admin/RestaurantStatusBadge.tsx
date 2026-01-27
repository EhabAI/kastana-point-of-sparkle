import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Power, PowerOff, Settings, CheckCircle } from "lucide-react";

export type RestaurantOperationalState = "inactive" | "setup_incomplete" | "ready";

interface RestaurantStatusBadgeProps {
  state: RestaurantOperationalState;
}

/**
 * Status badge showing restaurant operational state
 * - Inactive: System-level kill switch (red)
 * - Setup Incomplete: Active but not fully configured (amber)
 * - Ready: Fully operational (green)
 */
export function RestaurantStatusBadge({ state }: RestaurantStatusBadgeProps) {
  const { t } = useLanguage();

  const stateConfig = {
    inactive: {
      label: t("status_inactive"),
      icon: PowerOff,
      className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
    },
    setup_incomplete: {
      label: t("status_setup_incomplete"),
      icon: Settings,
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    },
    ready: {
      label: t("status_ready"),
      icon: CheckCircle,
      className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

/**
 * Explanation text for setup incomplete state (bilingual)
 */
export function SetupIncompleteExplanation() {
  const { language } = useLanguage();

  const explanation = language === "ar"
    ? "المطعم نشط، لكن بعض الميزات غير مفعّلة (مثل الاشتراك أو الإضافات)."
    : "The restaurant is active, but some features are not enabled yet (such as subscription or add-ons).";

  return (
    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
      {explanation}
    </p>
  );
}

/**
 * Helper function to determine operational state
 */
export function getRestaurantOperationalState(
  isActive: boolean,
  hasValidSubscription: boolean,
  hasOwner: boolean
): RestaurantOperationalState {
  // If restaurant is explicitly inactive, that takes precedence
  if (!isActive) {
    return "inactive";
  }

  // If active but missing subscription or owner, it's setup incomplete
  if (!hasValidSubscription || !hasOwner) {
    return "setup_incomplete";
  }

  // Fully operational
  return "ready";
}
