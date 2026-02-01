import { useLanguage } from "@/contexts/LanguageContext";
import { Info } from "lucide-react";

type KitchenState = "no_orders" | "new_order" | "in_progress" | "ready" | "restrictions";

interface KitchenExplainerProps {
  /**
   * Current state derived from order counts:
   * - no_orders: No active kitchen orders
   * - new_order: At least one order in NEW column
   * - in_progress: Focus on in-progress orders
   * - ready: Focus on ready orders
   * - restrictions: Show view-only restriction reminder
   */
  state: KitchenState;
}

/**
 * KitchenExplainer - Contextual explain-only guidance for Kitchen staff
 * 
 * DESIGN PRINCIPLES:
 * - NOT a training flow - just contextual explanations
 * - Screen-aware (KDS only)
 * - Role-aware (Kitchen staff only)
 * - State-aware (based on current order state)
 * - Passive (no user interaction required)
 * - Updates automatically when state changes
 * 
 * This acts as "Operational guidance, not training"
 */
export function KitchenExplainer({ state }: KitchenExplainerProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  // Get the appropriate message based on state
  const getMessage = (): { title: string; description: string } => {
    switch (state) {
      case "no_orders":
        return {
          title: t("kitchen_state_no_orders_title"),
          description: t("kitchen_state_no_orders_desc"),
        };
      case "new_order":
        return {
          title: t("kitchen_state_new_order_title"),
          description: t("kitchen_state_new_order_desc"),
        };
      case "in_progress":
        return {
          title: t("kitchen_state_in_progress_title"),
          description: t("kitchen_state_in_progress_desc"),
        };
      case "ready":
        return {
          title: t("kitchen_state_ready_title"),
          description: t("kitchen_state_ready_desc"),
        };
      case "restrictions":
        return {
          title: t("kitchen_state_restrictions_title"),
          description: t("kitchen_state_restrictions_desc"),
        };
      default:
        return { title: "", description: "" };
    }
  };

  const { title, description } = getMessage();

  if (!title) return null;

  return (
    <div 
      className="flex items-start gap-3 px-4 py-3 bg-muted/50 border-b border-border/50"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="shrink-0 mt-0.5">
        <Info className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground leading-tight">
          {title}
        </p>
        <p className="text-sm text-muted-foreground leading-tight mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

/**
 * Derive the current kitchen state from order counts
 * Priority: no_orders > new_order > in_progress > ready
 */
export function deriveKitchenState(counts: {
  newOrders: number;
  inProgressOrders: number;
  readyOrders: number;
}): KitchenState {
  const { newOrders, inProgressOrders, readyOrders } = counts;
  
  // No orders at all
  if (newOrders === 0 && inProgressOrders === 0 && readyOrders === 0) {
    return "no_orders";
  }
  
  // Priority: New orders need attention first
  if (newOrders > 0) {
    return "new_order";
  }
  
  // Then in-progress orders
  if (inProgressOrders > 0) {
    return "in_progress";
  }
  
  // Finally ready orders
  if (readyOrders > 0) {
    return "ready";
  }
  
  return "no_orders";
}
