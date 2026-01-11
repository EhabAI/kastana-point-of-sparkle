import { cn } from "@/lib/utils";
import { ShoppingCart, QrCode, ClipboardList, Grid, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export type POSTab = "new-order" | "favorites" | "qr-pending" | "open-orders" | "tables";

interface POSTabControlProps {
  activeTab: POSTab;
  onTabChange: (tab: POSTab) => void;
  pendingCount?: number;
  openCount?: number;
  occupiedTablesCount?: number;
}

export function POSTabControl({
  activeTab,
  onTabChange,
  pendingCount = 0,
  openCount = 0,
  occupiedTablesCount = 0,
}: POSTabControlProps) {
  const { t } = useLanguage();

  const tabs = [
    {
      id: "new-order" as POSTab,
      label: t("pos_new_order"),
      icon: ShoppingCart,
      count: 0,
    },
    {
      id: "favorites" as POSTab,
      label: t("pos_favorites"),
      icon: Star,
      count: 0,
    },
    {
      id: "qr-pending" as POSTab,
      label: t("pos_qr_pending"),
      icon: QrCode,
      count: pendingCount,
    },
    {
      id: "open-orders" as POSTab,
      label: t("pos_open_orders"),
      icon: ClipboardList,
      count: openCount,
    },
    {
      id: "tables" as POSTab,
      label: t("pos_tables"),
      icon: Grid,
      count: occupiedTablesCount,
    },
  ];

  return (
    <div className="flex bg-muted/60 p-0.5 rounded-lg gap-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px]",
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50",
          )}
        >
          <tab.icon className="h-4 w-4" />
          <span className="hidden sm:inline">{tab.label}</span>

          {tab.count > 0 && (
            <span
              className={cn(
                "ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/15 text-muted-foreground",
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
