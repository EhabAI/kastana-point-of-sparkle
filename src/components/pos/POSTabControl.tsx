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
  favoritesCount?: number;
}

export function POSTabControl({
  activeTab,
  onTabChange,
  pendingCount = 0,
  openCount = 0,
  occupiedTablesCount = 0,
  favoritesCount = 0,
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
      count: favoritesCount,
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
    <div className="flex bg-muted/40 p-1 rounded-lg gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-md text-sm font-medium transition-all min-h-[44px] relative",
            activeTab === tab.id
              ? "bg-background text-foreground shadow-md border-b-2 border-primary"
              : "text-muted-foreground/70 hover:text-foreground hover:bg-background/40",
          )}
        >
          <tab.icon className={cn("h-4 w-4", activeTab === tab.id && "text-primary")} />
          <span className="hidden sm:inline">{tab.label}</span>

          {tab.count > 0 && (
            <span
              className={cn(
                "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold min-w-[16px] text-center",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted-foreground/10 text-muted-foreground/70",
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
