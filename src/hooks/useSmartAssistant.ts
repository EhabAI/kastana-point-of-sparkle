/**
 * Smart Assistant Lite V1 - React Hook
 * Provides context detection and rule evaluation
 * Read-only - no mutations or side effects
 */

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAssistantContext } from "@/contexts/AssistantContext";
import { 
  detectScreenContext, 
  detectPOSTabContext,
  getContextHint, 
  shouldShowAssistant,
  type ScreenContext 
} from "@/lib/smartAssistantContext";
import { 
  evaluateRules, 
  type RuleContext, 
  type SmartRule 
} from "@/lib/smartAssistantRules";

export interface SmartAssistantState {
  // Visibility
  isVisible: boolean;
  
  // Context
  screenContext: ScreenContext;
  contextHint: {
    title: { ar: string; en: string };
    description: { ar: string; en: string };
  };
  
  // Alerts
  alerts: SmartRule[];
  hasAlerts: boolean;
  
  // Language
  language: "ar" | "en";
}

interface UseSmartAssistantOptions {
  // POS-specific context
  activeTab?: string;
  orderItemCount?: number;
  orderStatus?: string | null;
  orderHeldAt?: Date | null;
  
  // Payment context
  paymentMethod?: string | null;
  paymentAmount?: number;
  
  // Shift context
  shiftOpenedAt?: Date | null;
  voidCountThisShift?: number;
  
  // Discount context
  discountApplied?: boolean;
  discountReason?: string | null;
  
  // Table context
  selectedTableId?: string | null;
  tableHasActiveOrder?: boolean;
  
  // Action context
  lastAction?: string | null;
  refundAmountThisShift?: number;
  averageRefundAmount?: number;
  
  // Mode
  trainingMode?: boolean;
}

export function useSmartAssistant(options: UseSmartAssistantOptions = {}): SmartAssistantState {
  const location = useLocation();
  const { 
    order_status, 
    shift_status, 
    selected_table_id,
    system_language 
  } = useAssistantContext();

  // Determine visibility
  const isVisible = useMemo(() => {
    return shouldShowAssistant(location.pathname);
  }, [location.pathname]);

  // Determine screen context
  const screenContext = useMemo(() => {
    const baseContext = detectScreenContext(location.pathname);
    
    // For POS, use more specific tab context if provided
    if (baseContext === "pos_main" && options.activeTab) {
      return detectPOSTabContext(options.activeTab);
    }
    
    return baseContext;
  }, [location.pathname, options.activeTab]);

  // Get contextual hint
  const contextHint = useMemo(() => {
    return getContextHint(screenContext);
  }, [screenContext]);

  // Build rule context from all available sources
  const ruleContext = useMemo((): RuleContext => {
    return {
      // Payment
      paymentMethod: options.paymentMethod,
      paymentAmount: options.paymentAmount,
      
      // Order - prefer options, fallback to assistant context
      orderStatus: options.orderStatus ?? order_status,
      orderItemCount: options.orderItemCount,
      orderHeldAt: options.orderHeldAt,
      discountApplied: options.discountApplied,
      discountReason: options.discountReason,
      
      // Shift
      shiftStatus: shift_status,
      shiftOpenedAt: options.shiftOpenedAt,
      
      // Table - prefer options, fallback to assistant context
      tableId: options.selectedTableId ?? selected_table_id,
      tableHasActiveOrder: options.tableHasActiveOrder,
      
      // Actions
      lastAction: options.lastAction,
      voidCountThisShift: options.voidCountThisShift,
      refundAmountThisShift: options.refundAmountThisShift,
      averageRefundAmount: options.averageRefundAmount,
      
      // Mode
      trainingMode: options.trainingMode,
    };
  }, [
    options.paymentMethod,
    options.paymentAmount,
    options.orderStatus,
    options.orderItemCount,
    options.orderHeldAt,
    options.discountApplied,
    options.discountReason,
    options.shiftOpenedAt,
    options.selectedTableId,
    options.tableHasActiveOrder,
    options.lastAction,
    options.voidCountThisShift,
    options.refundAmountThisShift,
    options.averageRefundAmount,
    options.trainingMode,
    order_status,
    shift_status,
    selected_table_id,
  ]);

  // Evaluate rules
  const alerts = useMemo(() => {
    return evaluateRules(ruleContext);
  }, [ruleContext]);

  return {
    isVisible,
    screenContext,
    contextHint,
    alerts,
    hasAlerts: alerts.length > 0,
    language: system_language,
  };
}
