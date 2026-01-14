import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle2, Utensils, ShoppingBag, QrCode } from "lucide-react";
import { KDSOrder, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface KDSOrderCardProps {
  order: KDSOrder;
  onUpdateStatus: (orderId: string, status: KDSOrderStatus) => void;
  isUpdating: boolean;
}

function getElapsedTime(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
}

function formatElapsedTime(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getTimerColor(minutes: number): string {
  if (minutes < 5) return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
  if (minutes <= 10) return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
  return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
}

function getSourceIcon(source: string) {
  switch (source) {
    case "qr":
      return <QrCode className="h-3.5 w-3.5" />;
    case "takeaway":
      return <ShoppingBag className="h-3.5 w-3.5" />;
    default:
      return <Utensils className="h-3.5 w-3.5" />;
  }
}

function getSourceLabel(source: string, t: (key: string) => string): string {
  switch (source) {
    case "qr":
      return "QR";
    case "takeaway":
      return t("takeaway");
    default:
      return t("dine_in");
  }
}

export function KDSOrderCard({ order, onUpdateStatus, isUpdating }: KDSOrderCardProps) {
  const { t } = useLanguage();
  const [elapsedMinutes, setElapsedMinutes] = useState(() => getElapsedTime(order.created_at));

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedTime(order.created_at));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [order.created_at]);

  const timerColorClass = getTimerColor(elapsedMinutes);
  const isReady = order.status === "ready";

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isReady && "opacity-75"
    )}>
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold">
            #{order.order_number}
          </CardTitle>
          <Badge variant="outline" className={cn("font-mono text-xs px-2 py-1", timerColorClass)}>
            <Clock className="h-3 w-3 mr-1" />
            {formatElapsedTime(elapsedMinutes)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            {getSourceIcon(order.source)}
            <span className="ml-1">{getSourceLabel(order.source, t)}</span>
          </Badge>
          {order.table_name && (
            <Badge variant="outline" className="text-xs">
              {order.table_name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Items List */}
        <div className="space-y-1.5">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start gap-2">
              <span className="font-semibold text-sm min-w-[24px] text-center bg-muted rounded px-1">
                {item.quantity}×
              </span>
              <div className="flex-1">
                <span className="text-sm">{item.name}</span>
                {item.notes && (
                  <p className="text-xs text-muted-foreground italic mt-0.5">
                    {item.notes}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Order Notes */}
        {order.order_notes && (
          <div className="bg-muted/50 rounded p-2 text-xs text-muted-foreground">
            <strong>{t("notes")}:</strong> {order.order_notes}
          </div>
        )}

        {/* Actions */}
        {order.status === "new" && (
          <Button
            className="w-full"
            size="sm"
            onClick={() => onUpdateStatus(order.id, "in_progress")}
            disabled={isUpdating}
          >
            <ChefHat className="h-4 w-4 mr-2" />
            {t("start_cooking")}
          </Button>
        )}

        {order.status === "in_progress" && (
          <Button
            className="w-full"
            size="sm"
            variant="default"
            onClick={() => onUpdateStatus(order.id, "ready")}
            disabled={isUpdating}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {t("mark_ready")}
          </Button>
        )}

        {order.status === "ready" && (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm py-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t("ready_for_pickup")}
            </div>
            <Button
              className="w-full"
              size="sm"
              variant="outline"
              onClick={() => onUpdateStatus(order.id, "in_progress")}
              disabled={isUpdating}
            >
              <ChefHat className="h-4 w-4 mr-2" />
              {t("back_to_cooking")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
