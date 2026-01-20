import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle2, Utensils, ShoppingBag, QrCode } from "lucide-react";
import { KDSOrder, KDSOrderStatus } from "@/hooks/kds/useKDSOrders";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

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

/**
 * Get timer badge color based on elapsed time
 * - < 10min: green (on track)
 * - 10-20min: yellow (warning)
 * - > 20min: red (danger)
 */
function getTimerColor(minutes: number): string {
  if (minutes < 10) return "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30";
  if (minutes <= 20) return "text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30";
  return "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30";
}

/**
 * Get card border/highlight based on delay status
 * - < 10min: normal
 * - 10-20min: warning (amber border)
 * - > 20min: delayed (red border with pulse)
 */
function getDelayClass(minutes: number, status: string): string {
  // Ready orders don't need delay highlighting
  if (status === "ready") return "";
  
  if (minutes < 10) return "";
  if (minutes <= 20) return "ring-2 ring-amber-400/70 dark:ring-amber-500/50";
  return "ring-2 ring-red-500/80 dark:ring-red-400/60 animate-pulse";
}

// Max height for items list before scrolling kicks in
const ITEMS_MAX_HEIGHT = 180;
// Expanded height for items list
const ITEMS_EXPANDED_HEIGHT = 320;
// Auto-collapse timeout in ms
const EXPAND_TIMEOUT = 4000;

export function KDSOrderCard({ order, onUpdateStatus, isUpdating }: KDSOrderCardProps) {
  const { t } = useLanguage();
  const [elapsedMinutes, setElapsedMinutes] = useState(() => getElapsedTime(order.created_at));
  const [isExpanded, setIsExpanded] = useState(false);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedMinutes(getElapsedTime(order.created_at));
    }, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [order.created_at]);

  // Auto-collapse after timeout
  useEffect(() => {
    if (isExpanded) {
      expandTimeoutRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, EXPAND_TIMEOUT);
    }
    
    return () => {
      if (expandTimeoutRef.current) {
        clearTimeout(expandTimeoutRef.current);
      }
    };
  }, [isExpanded]);

  const handleCardClick = useCallback((e: React.MouseEvent) => {
    // Don't toggle if clicking on a button
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // Clear existing timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
    }
    
    setIsExpanded(prev => !prev);
  }, []);

  const timerColorClass = getTimerColor(elapsedMinutes);
  const delayClass = getDelayClass(elapsedMinutes, order.status);
  const isReady = order.status === "ready";
  // New orders include: "new", "open" (dine-in), "paid" (takeaway)
  const isNewOrder = order.status === "new" || order.status === "open" || order.status === "paid";
  const isDineIn = !!order.table_id;

  // Calculate if we need scrolling (more than ~4 items typically)
  const needsScroll = order.items.length > 4;
  const currentMaxHeight = isExpanded ? ITEMS_EXPANDED_HEIGHT : ITEMS_MAX_HEIGHT;

  // Combine order notes from both fields, filtering out metadata like "type:takeaway"
  const filterMetadata = (note: string | null) => {
    if (!note) return null;
    // Filter out metadata entries like "type:takeaway", "type:dine_in"
    if (note.startsWith("type:")) return null;
    return note.trim();
  };
  const combinedNotes = [filterMetadata(order.notes), filterMetadata(order.order_notes)]
    .filter(Boolean)
    .join(" | ");

  return (
    <Card 
      className={cn(
        "transition-all duration-300 ease-in-out cursor-pointer select-none",
        "hover:shadow-md",
        isReady && "opacity-75",
        delayClass,
        // Expanded state styling
        isExpanded && "scale-[1.02] shadow-lg z-10 ring-2 ring-primary/30"
      )}
      onClick={handleCardClick}
    >
      {/* Fixed Header - Always visible */}
      <CardHeader className="pb-2 space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "font-bold",
            isNewOrder ? "text-xl" : "text-lg"
          )}>
            #{order.order_number}
          </CardTitle>
          <Badge variant="outline" className={cn("font-mono text-xs px-2 py-1", timerColorClass)}>
            <Clock className="h-3 w-3 mr-1" />
            {formatElapsedTime(elapsedMinutes)}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {/* Order Type Badge - Prominent display */}
          <Badge 
            variant={isDineIn ? "default" : "secondary"} 
            className={cn(
              "text-xs font-semibold",
              isDineIn 
                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                : "bg-orange-500 hover:bg-orange-600 text-white"
            )}
          >
            {isDineIn ? (
              <>
                <Utensils className="h-3 w-3 mr-1" />
                {t("dine_in")}
              </>
            ) : (
              <>
                <ShoppingBag className="h-3 w-3 mr-1" />
                {t("takeaway")}
              </>
            )}
          </Badge>
          {order.table_name && (
            <Badge variant="outline" className="text-xs font-medium">
              {order.table_name}
            </Badge>
          )}
          {order.source === "qr" && (
            <Badge variant="outline" className="text-xs">
              <QrCode className="h-3 w-3 mr-1" />
              QR
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Order-Level Notes - Prominent Display at Top */}
        {combinedNotes && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md p-2.5">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              📝 {combinedNotes}
            </p>
          </div>
        )}

        {/* Scrollable Items List with max-height */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out",
            needsScroll && "overflow-hidden"
          )}
          style={{ maxHeight: needsScroll ? currentMaxHeight : 'none' }}
        >
          <ScrollArea className={cn(needsScroll && "h-full")}>
            <div className="space-y-2 pr-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-2">
                  {/* Quantity Badge - Enhanced for NEW orders */}
                  <Badge 
                    variant={isNewOrder ? "default" : "secondary"}
                    className={cn(
                      "min-w-[28px] justify-center font-bold shrink-0",
                      isNewOrder ? "text-sm h-6" : "text-xs h-5"
                    )}
                  >
                    x{item.quantity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    {/* Item Name - Enhanced for NEW orders */}
                    <span className={cn(
                      "block leading-tight",
                      isNewOrder 
                        ? "text-base font-semibold text-foreground" 
                        : "text-sm font-medium",
                      isExpanded && "text-base"
                    )}>
                      {item.name}
                    </span>
                    {/* Item-Level Notes - Smaller, under item */}
                    {item.notes && (
                      <p className={cn(
                        "mt-0.5 italic",
                        isNewOrder 
                          ? "text-sm text-amber-600 dark:text-amber-400" 
                          : "text-xs text-muted-foreground"
                      )}>
                        ⤷ {item.notes}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Scroll indicator for long orders */}
        {needsScroll && !isExpanded && (
          <div className="text-center text-xs text-muted-foreground py-1 border-t border-dashed">
            {t("tap_to_expand") || "Tap to expand"}
          </div>
        )}

        {/* Actions - No confirmation dialogs, instant action */}
        {/* Show "Start Cooking" for new orders (status: new, open for dine-in, paid for takeaway) */}
        {isNewOrder && (
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
