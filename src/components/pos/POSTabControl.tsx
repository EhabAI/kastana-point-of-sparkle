import { cn } from "@/lib/utils";
import { ShoppingCart, QrCode, ClipboardList, Grid } from "lucide-react";

export type POSTab = "new-order" | "qr-pending" | "open-orders" | "tables";

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
  const tabs = [
    { 
      id: "new-order" as POSTab, 
      label: "New Order", 
      icon: ShoppingCart,
      count: 0,
    },
    { 
      id: "qr-pending" as POSTab, 
      label: "QR Pending", 
      icon: QrCode,
      count: pendingCount,
    },
    { 
      id: "open-orders" as POSTab, 
      label: "Open Orders", 
      icon: ClipboardList,
      count: openCount,
    },
    { 
      id: "tables" as POSTab, 
      label: "Tables", 
      icon: Grid,
      count: occupiedTablesCount,
    },
  ];

  return (
    <div className="flex bg-muted p-1 rounded-lg gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all min-h-[48px]",
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <tab.icon className="h-5 w-5" />
          <span className="hidden sm:inline">{tab.label}</span>
          {tab.count > 0 && (
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted-foreground/20 text-muted-foreground"
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
