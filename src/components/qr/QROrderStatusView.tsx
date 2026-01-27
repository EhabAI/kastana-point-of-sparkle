import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, ChefHat, PartyPopper } from "lucide-react";

/**
 * Order status types for QR order tracking
 * - pending: Order received, waiting for cashier confirmation
 * - open/new: Order confirmed, in preparation
 * - paid/completed: Order ready for pickup/serving
 */
type OrderStatus = "pending" | "open" | "new" | "paid" | "completed" | string;

interface QROrderStatusViewProps {
  orderId: string;
  orderNumber: number;
  initialStatus: OrderStatus;
  restaurantName?: string;
  tableCode?: string;
}

/**
 * Clean, minimal QR Order Status View
 * Shows order status after submission with auto-updates
 * 
 * States:
 * A) Order Received (pending) - ✅ تم استلام طلبك بنجاح
 * B) In Preparation (open/new) - 👨‍🍳 طلبك قيد التحضير
 * C) Order Ready (paid/completed) - 🎉 طلبك جاهز
 */
export function QROrderStatusView({
  orderId,
  orderNumber,
  initialStatus,
  restaurantName,
  tableCode,
}: QROrderStatusViewProps) {
  const { t, isRTL } = useLanguage();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);

  // Subscribe to realtime order status updates
  useEffect(() => {
    const channel = supabase
      .channel(`qr-order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          if (payload.new && "status" in payload.new) {
            setStatus(payload.new.status as OrderStatus);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Determine display state
  const getStatusDisplay = () => {
    switch (status) {
      case "pending":
        return {
          icon: CheckCircle2,
          iconColor: "text-primary",
          title: t("qr_status_received_title"),
          subtitle: t("qr_status_received_subtitle"),
          helperText: t("qr_status_helper_wait"),
          showOrderNumber: true,
        };
      case "open":
      case "new":
        return {
          icon: ChefHat,
          iconColor: "text-primary",
          title: t("qr_status_preparing_title"),
          subtitle: t("qr_status_preparing_subtitle"),
          helperText: null,
          showOrderNumber: true,
        };
      case "paid":
      case "completed":
        return {
          icon: PartyPopper,
          iconColor: "text-primary",
          title: t("qr_status_ready_title"),
          subtitle: t("qr_status_ready_subtitle"),
          helperText: null,
          showOrderNumber: true,
        };
      default:
        // Fallback for any other status
        return {
          icon: CheckCircle2,
          iconColor: "text-primary",
          title: t("qr_status_received_title"),
          subtitle: t("qr_status_received_subtitle"),
          helperText: null,
          showOrderNumber: true,
        };
    }
  };

  const display = getStatusDisplay();
  const IconComponent = display.icon;

  return (
    <div 
      className="min-h-screen bg-background flex items-center justify-center p-6"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-sm w-full text-center space-y-6">
        {/* Restaurant Name (if available) */}
        {restaurantName && (
          <p className="text-sm text-muted-foreground">{restaurantName}</p>
        )}

        {/* Status Icon */}
        <div className="flex justify-center">
          <IconComponent 
            className={`h-16 w-16 ${display.iconColor}`} 
            strokeWidth={1.5}
          />
        </div>

        {/* Title */}
        <h1 className="text-lg font-semibold text-foreground">
          {display.title}
        </h1>

        {/* Order Number */}
        {display.showOrderNumber && (
          <p className="text-sm text-muted-foreground">
            {t("qr_status_order_number")}: <span className="font-medium">#{orderNumber}</span>
          </p>
        )}

        {/* Subtitle */}
        <p className="text-sm text-muted-foreground">
          {display.subtitle}
        </p>

        {/* Helper Text (only for pending status) */}
        {display.helperText && (
          <p className="text-xs text-muted-foreground/70 mt-4">
            {display.helperText}
          </p>
        )}

        {/* Table info (subtle) */}
        {tableCode && (
          <p className="text-xs text-muted-foreground/60 mt-6">
            {t("menu_table")}: {tableCode}
          </p>
        )}
      </div>
    </div>
  );
}
