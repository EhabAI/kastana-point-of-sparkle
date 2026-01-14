import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KDSOrder, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { KDSOrderCard } from "./KDSOrderCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface KDSColumnProps {
  title: string;
  status: KDSOrderStatus;
  orders: KDSOrder[];
  onUpdateStatus: (orderId: string, status: KDSOrderStatus) => void;
  isUpdating: boolean;
  colorClass: string;
}

export function KDSColumn({ title, status, orders, onUpdateStatus, isUpdating, colorClass }: KDSColumnProps) {
  const { language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <div className="flex flex-col h-full bg-card rounded-lg border">
      <div className={cn("p-3 border-b flex items-center justify-between", colorClass)}>
        <h2 className="font-semibold text-lg">{title}</h2>
        <Badge variant="secondary" className="text-sm">
          {orders.length}
        </Badge>
      </div>
      
      <ScrollArea className="flex-1 p-3" dir={isRTL ? "rtl" : "ltr"}>
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              {/* Empty state */}
            </div>
          ) : (
            orders.map((order) => (
              <KDSOrderCard
                key={order.id}
                order={order}
                onUpdateStatus={onUpdateStatus}
                isUpdating={isUpdating}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
