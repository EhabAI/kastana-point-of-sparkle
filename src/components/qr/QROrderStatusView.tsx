import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { CheckCircle2, ChefHat, PartyPopper, AlertCircle } from "lucide-react";

/**
 * Customer-facing status display type
 * Maps internal order statuses to simple customer states
 */
type CustomerState = "received" | "preparing" | "ready" | "cancelled" | "none";

interface QROrderStatusViewProps {
  orderId: string;
  orderNumber: number;
  initialStatus: string;
  restaurantName?: string;
  tableCode?: string;
}

/**
 * STATUS MAPPING (Internal → Customer View)
 * 
 * A) Order Received:
 *    - pending (QR submitted, waiting for cashier)
 * 
 * B) Order In Preparation:
 *    - new (cashier confirmed)
 *    - open (order active/in progress)
 *    - held (temporarily held but still active)
 * 
 * C) Order Ready:
 *    - ready (kitchen marked complete)
 *    - paid/closed (keep showing "ready" - don't expose payment)
 * 
 * D) Cancelled/Rejected:
 *    - cancelled, voided, rejected
 */
function mapStatusToCustomerState(status: string): CustomerState {
  const normalizedStatus = status.toLowerCase().trim();
  
  // State A: Order Received
  if (normalizedStatus === "pending" || normalizedStatus === "qr_pending") {
    return "received";
  }
  
  // State B: In Preparation
  if (
    normalizedStatus === "new" ||
    normalizedStatus === "open" ||
    normalizedStatus === "accepted" ||
    normalizedStatus === "sent_to_kitchen" ||
    normalizedStatus === "in_progress" ||
    normalizedStatus === "held"
  ) {
    return "preparing";
  }
  
  // State C: Order Ready (including paid - keep showing ready)
  if (
    normalizedStatus === "ready" ||
    normalizedStatus === "paid" ||
    normalizedStatus === "closed" ||
    normalizedStatus === "completed"
  ) {
    return "ready";
  }
  
  // State D: Cancelled/Rejected
  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "voided" ||
    normalizedStatus === "rejected"
  ) {
    return "cancelled";
  }
  
  // Default fallback - treat as received
  return "received";
}

/**
 * Clean, minimal QR Order Status View
 * 
 * Displays customer-friendly order status linked to KDS states.
 * Read-only view with realtime updates.
 * Never exposes internal system language to customers.
 */
export function QROrderStatusView({
  orderId,
  orderNumber,
  initialStatus,
  restaurantName,
  tableCode,
}: QROrderStatusViewProps) {
  const { t, isRTL } = useLanguage();
  const [internalStatus, setInternalStatus] = useState(initialStatus);
  const [orderExists, setOrderExists] = useState(true);

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
            setInternalStatus(payload.new.status as string);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        () => {
          setOrderExists(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  // Map internal status to customer state
  const customerState = mapStatusToCustomerState(internalStatus);

  // Handle no active order
  if (!orderExists) {
    return (
      <div 
        className="min-h-screen bg-background flex items-center justify-center p-6"
        dir={isRTL ? "rtl" : "ltr"}
      >
        <div className="max-w-sm w-full text-center space-y-6">
          {restaurantName && (
            <p className="text-sm text-muted-foreground">{restaurantName}</p>
          )}
          <div className="flex justify-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <h1 className="text-lg font-semibold text-foreground">
            {t("qr_status_no_active_order")}
          </h1>
          {tableCode && (
            <p className="text-xs text-muted-foreground/60 mt-6">
              {t("menu_table")}: {tableCode}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Get display configuration based on customer state
  const getDisplayConfig = () => {
    switch (customerState) {
      case "received":
        return {
          icon: CheckCircle2,
          iconColor: "text-primary",
          title: t("qr_status_received_title"),
          subtitle: t("qr_status_received_subtitle"),
          helperText: t("qr_status_helper_wait"),
          showOrderNumber: true,
        };
      case "preparing":
        return {
          icon: ChefHat,
          iconColor: "text-primary",
          title: t("qr_status_preparing_title"),
          subtitle: t("qr_status_preparing_subtitle"),
          helperText: null,
          showOrderNumber: true,
        };
      case "ready":
        return {
          icon: PartyPopper,
          iconColor: "text-primary",
          title: t("qr_status_ready_title"),
          subtitle: t("qr_status_ready_subtitle"),
          helperText: null,
          showOrderNumber: true,
        };
      case "cancelled":
        return {
          icon: AlertCircle,
          iconColor: "text-muted-foreground",
          title: t("qr_status_cancelled_title"),
          subtitle: t("qr_status_cancelled_subtitle"),
          helperText: null,
          showOrderNumber: false,
        };
      default:
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

  const display = getDisplayConfig();
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
