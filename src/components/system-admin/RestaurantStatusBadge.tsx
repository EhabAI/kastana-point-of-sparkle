import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { PowerOff, Settings, CheckCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type RestaurantOperationalState = "inactive" | "setup_incomplete" | "ready";

interface RestaurantStatusBadgeProps {
  state: RestaurantOperationalState;
}

/**
 * Status badge showing restaurant operational state with tooltip for setup_incomplete
 * - Inactive: System-level kill switch (red)
 * - Setup Incomplete: Active but not fully configured (amber) - has tooltip
 * - Ready: Fully operational (green)
 */
export function RestaurantStatusBadge({ state }: RestaurantStatusBadgeProps) {
  const { t, language } = useLanguage();

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

  // Tooltip text for setup_incomplete state
  const tooltipText = language === "ar"
    ? "المطعم نشط، لكن بعض الميزات غير مفعّلة\nمثل الاشتراك أو بعض الإضافات."
    : "The restaurant is active, but some features\nsuch as subscription or add-ons are not enabled yet.";

  const badgeContent = (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium border ${config.className} ${state === 'setup_incomplete' ? 'cursor-pointer' : ''}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );

  // Only show tooltip for setup_incomplete state
  if (state === 'setup_incomplete') {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-pointer">{badgeContent}</span>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            sideOffset={8}
            className="max-w-[260px] text-sm whitespace-pre-line z-[100]"
          >
            {tooltipText}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
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
