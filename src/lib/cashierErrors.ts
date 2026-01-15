/**
 * Cashier Error Handler
 * 
 * Provides user-friendly Arabic error messages for all cashier-facing errors.
 * NEVER shows system errors, technical messages, or English text to cashiers.
 */

export interface CashierError {
  title: string;
  description: string;
  action?: string;
  ingredient?: string;
}

/**
 * Error codes returned by edge functions that we can parse
 */
const ERROR_PATTERNS = {
  // Payment errors
  ORDER_NOT_OPEN: /order.*not\s*open|status:\s*(paid|held|cancelled|voided)/i,
  ORDER_ALREADY_PAID: /already\s*paid|duplicate|possible\s*duplicate/i,
  ORDER_HELD: /status:\s*held/i,
  UNDERPAYMENT: /payment.*less\s*than|underpay/i,
  CARD_OVERPAY: /card.*exact|no\s*overpay/i,
  RESTAURANT_INACTIVE: /restaurant.*not\s*active|inactive/i,
  ACCESS_DENIED: /access\s*denied|permission|forbidden|403/i,
  UNAUTHORIZED: /unauthorized|401|jwt/i,
  
  // Inventory errors
  INSUFFICIENT_STOCK: /insufficient\s*stock|not\s*enough/i,
  RECIPE_INVALID: /recipe.*invalid|no\s*recipe|empty\s*recipe/i,
  UNIT_MISMATCH: /unit.*mismatch|conversion.*error/i,
  
  // Network/Technical errors
  NETWORK_ERROR: /network|fetch|connection|timeout/i,
  SERVER_ERROR: /500|internal\s*server/i,
};

/**
 * Parses an error from edge functions and returns user-friendly translation keys
 */
export function parsePaymentError(error: unknown): {
  titleKey: string;
  descKey: string;
  actionKey?: string;
  ingredient?: string;
} {
  const errorMessage = extractErrorMessage(error);
  
  // Check for specific error patterns
  
  // Order status errors
  if (ERROR_PATTERNS.ORDER_ALREADY_PAID.test(errorMessage) || 
      ERROR_PATTERNS.ORDER_NOT_OPEN.test(errorMessage)) {
    // Check if it's specifically "held"
    if (ERROR_PATTERNS.ORDER_HELD.test(errorMessage)) {
      return {
        titleKey: "error_order_held_title",
        descKey: "error_order_held_desc",
        actionKey: "error_order_held_action",
      };
    }
    // Check if already paid (duplicate)
    if (ERROR_PATTERNS.ORDER_ALREADY_PAID.test(errorMessage)) {
      return {
        titleKey: "error_order_closed_title",
        descKey: "error_payment_duplicate",
      };
    }
    // Generic closed order
    return {
      titleKey: "error_order_closed_title",
      descKey: "error_order_closed_desc",
    };
  }
  
  // Payment amount errors
  if (ERROR_PATTERNS.UNDERPAYMENT.test(errorMessage)) {
    return {
      titleKey: "error_technical_title",
      descKey: "error_payment_underpaid",
      actionKey: "error_technical_action",
    };
  }
  
  if (ERROR_PATTERNS.CARD_OVERPAY.test(errorMessage)) {
    return {
      titleKey: "error_technical_title",
      descKey: "error_payment_card_overpay",
      actionKey: "error_technical_action",
    };
  }
  
  // Restaurant inactive
  if (ERROR_PATTERNS.RESTAURANT_INACTIVE.test(errorMessage)) {
    return {
      titleKey: "error_technical_title",
      descKey: "error_restaurant_inactive",
    };
  }
  
  // Permission errors
  if (ERROR_PATTERNS.ACCESS_DENIED.test(errorMessage) || 
      ERROR_PATTERNS.UNAUTHORIZED.test(errorMessage)) {
    return {
      titleKey: "error_permission_title",
      descKey: "error_permission_desc",
    };
  }
  
  // Inventory errors
  if (ERROR_PATTERNS.INSUFFICIENT_STOCK.test(errorMessage)) {
    // Try to extract ingredient name
    const ingredientMatch = errorMessage.match(/ingredient[:\s]+([^,.\n]+)/i);
    return {
      titleKey: "error_inventory_insufficient_title",
      descKey: "error_inventory_insufficient_desc",
      actionKey: "error_inventory_insufficient_action",
      ingredient: ingredientMatch?.[1]?.trim(),
    };
  }
  
  if (ERROR_PATTERNS.RECIPE_INVALID.test(errorMessage)) {
    return {
      titleKey: "error_recipe_invalid_title",
      descKey: "error_recipe_invalid_desc",
      actionKey: "error_recipe_invalid_action",
    };
  }
  
  if (ERROR_PATTERNS.UNIT_MISMATCH.test(errorMessage)) {
    return {
      titleKey: "error_unit_mismatch_title",
      descKey: "error_unit_mismatch_desc",
      actionKey: "error_unit_mismatch_action",
    };
  }
  
  // Network/Technical errors
  if (ERROR_PATTERNS.NETWORK_ERROR.test(errorMessage) || 
      ERROR_PATTERNS.SERVER_ERROR.test(errorMessage)) {
    return {
      titleKey: "error_technical_title",
      descKey: "error_technical_desc",
      actionKey: "error_technical_action",
    };
  }
  
  // Global fallback - NEVER show raw error to user
  return {
    titleKey: "error_fallback_title",
    descKey: "error_fallback_desc",
    actionKey: "error_fallback_action",
  };
}

/**
 * Extracts error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  
  // Handle Error objects
  if (error instanceof Error) {
    return error.message || "";
  }
  
  // Handle string errors
  if (typeof error === "string") {
    return error;
  }
  
  // Handle Supabase edge function errors
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    
    // Check common error properties
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.error_description === "string") return obj.error_description;
    
    // Check nested context
    if (obj.context && typeof obj.context === "object") {
      const ctx = obj.context as Record<string, unknown>;
      if (typeof ctx.message === "string") return ctx.message;
      if (typeof ctx.error === "string") return ctx.error;
    }
    
    // Try JSON stringify for debugging (but don't show to user)
    try {
      return JSON.stringify(error);
    } catch {
      return "";
    }
  }
  
  return "";
}

/**
 * Formats a user-friendly error message using translation function
 */
export function formatCashierError(
  error: unknown,
  t: (key: string) => string
): CashierError {
  const parsed = parsePaymentError(error);
  
  const result: CashierError = {
    title: t(parsed.titleKey),
    description: t(parsed.descKey),
  };
  
  if (parsed.actionKey) {
    result.action = t(parsed.actionKey);
  }
  
  if (parsed.ingredient) {
    result.ingredient = parsed.ingredient;
  }
  
  return result;
}

/**
 * Creates a formatted multi-line error message for toast display
 */
export function getCashierErrorMessage(
  error: unknown,
  t: (key: string) => string
): string {
  const formatted = formatCashierError(error, t);
  
  let message = `${formatted.title}\n${formatted.description}`;
  
  if (formatted.ingredient) {
    message += `\n${t("error_inventory_insufficient_ingredient")}: ${formatted.ingredient}`;
  }
  
  if (formatted.action) {
    message += `\n${formatted.action}`;
  }
  
  return message;
}
