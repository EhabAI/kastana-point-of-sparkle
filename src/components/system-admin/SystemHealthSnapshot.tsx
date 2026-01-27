import { useLanguage } from "@/contexts/LanguageContext";
import { Circle } from "lucide-react";

interface SystemHealthSnapshotProps {
  isActive: boolean;
  inventoryEnabled: boolean;
  hasOpenShift: boolean;
  qrEnabled: boolean;
}

/**
 * Read-only health snapshot for System Admin
 * Shows operational status at a glance without any actions
 */
export function SystemHealthSnapshot({
  isActive,
  inventoryEnabled,
  hasOpenShift,
  qrEnabled,
}: SystemHealthSnapshotProps) {
  const { t } = useLanguage();

  const indicators = [
    {
      label: t("health_restaurant"),
      value: isActive ? t("active") : t("inactive"),
      status: isActive ? "active" : "inactive",
    },
    {
      label: t("health_inventory"),
      value: inventoryEnabled ? t("health_enabled") : t("health_disabled"),
      status: inventoryEnabled ? "active" : "neutral",
    },
    {
      label: t("health_shift"),
      value: hasOpenShift ? t("health_shift_open") : t("health_shift_closed"),
      status: hasOpenShift ? "active" : "neutral",
    },
    {
      label: t("health_qr_orders"),
      value: qrEnabled ? t("health_enabled") : t("health_disabled"),
      status: qrEnabled ? "active" : "neutral",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600 dark:text-green-400";
      case "pending":
        return "text-amber-600 dark:text-amber-400";
      case "inactive":
        return "text-muted-foreground";
      default:
        return "text-muted-foreground";
    }
  };

  const getDotColor = (status: string) => {
    switch (status) {
      case "active":
        return "fill-green-500 text-green-500";
      case "pending":
        return "fill-amber-500 text-amber-500";
      case "inactive":
        return "fill-gray-400 text-gray-400";
      default:
        return "fill-gray-300 text-gray-300";
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      <span className="font-medium text-muted-foreground uppercase tracking-wide">
        {t("health_title")}
      </span>
      {indicators.map((indicator) => (
        <div key={indicator.label} className="flex items-center gap-1.5">
          <Circle className={`h-2 w-2 ${getDotColor(indicator.status)}`} />
          <span className="text-muted-foreground">{indicator.label}:</span>
          <span className={`font-medium ${getStatusColor(indicator.status)}`}>
            {indicator.value}
          </span>
        </div>
      ))}
    </div>
  );
}
