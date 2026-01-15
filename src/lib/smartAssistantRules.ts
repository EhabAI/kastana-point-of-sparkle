/**
 * Smart Assistant Lite V1 - Rule Engine
 * Read-only rule evaluation for contextual alerts and suggestions
 * Domain-locked to Kastana POS only
 */

export type RuleId = 
  | "cash_zero_amount"
  | "refund_after_shift_closed"
  | "order_held_too_long"
  | "excessive_voids"
  | "empty_order_payment"
  | "shift_open_too_long"
  | "table_no_active_order"
  | "discount_no_reason"
  | "high_cash_refund"
  | "training_mode_active";

export type RuleSeverity = "info" | "warning" | "error";

export interface SmartRule {
  id: RuleId;
  severity: RuleSeverity;
  title: { ar: string; en: string };
  message: { ar: string; en: string };
  suggestion?: { ar: string; en: string };
}

export interface RuleContext {
  // Payment context
  paymentMethod?: string | null;
  paymentAmount?: number;
  
  // Order context
  orderStatus?: string | null;
  orderItemCount?: number;
  orderHeldAt?: Date | null;
  discountApplied?: boolean;
  discountReason?: string | null;
  
  // Shift context
  shiftStatus?: string | null;
  shiftOpenedAt?: Date | null;
  
  // Table context
  tableId?: string | null;
  tableHasActiveOrder?: boolean;
  
  // Action context
  lastAction?: string | null;
  voidCountThisShift?: number;
  refundAmountThisShift?: number;
  averageRefundAmount?: number;
  
  // Mode context
  trainingMode?: boolean;
}

// Rule definitions with bilingual messages
const RULES: Record<RuleId, Omit<SmartRule, "id">> = {
  cash_zero_amount: {
    severity: "error",
    title: { ar: "مبلغ الدفع صفر", en: "Zero Payment Amount" },
    message: { 
      ar: "تم اختيار الدفع نقداً لكن المبلغ صفر. أدخل مبلغ الدفع.",
      en: "Cash payment selected but amount is zero. Enter payment amount."
    },
    suggestion: {
      ar: "أدخل المبلغ المستلم من العميل أو اختر طريقة دفع أخرى.",
      en: "Enter the amount received from customer or select another payment method."
    }
  },
  refund_after_shift_closed: {
    severity: "error",
    title: { ar: "الوردية مغلقة", en: "Shift Closed" },
    message: { 
      ar: "لا يمكن إجراء استرداد بعد إغلاق الوردية.",
      en: "Cannot process refund after shift is closed."
    },
    suggestion: {
      ar: "افتح وردية جديدة لإتمام الاسترداد.",
      en: "Open a new shift to complete the refund."
    }
  },
  order_held_too_long: {
    severity: "warning",
    title: { ar: "طلب معلق لفترة طويلة", en: "Order Held Too Long" },
    message: { 
      ar: "هذا الطلب معلق منذ أكثر من 30 دقيقة.",
      en: "This order has been on hold for over 30 minutes."
    },
    suggestion: {
      ar: "راجع الطلب واستأنفه أو ألغه حسب الحاجة.",
      en: "Review the order and resume or cancel as needed."
    }
  },
  excessive_voids: {
    severity: "warning",
    title: { ar: "عمليات إلغاء متعددة", en: "Multiple Void Actions" },
    message: { 
      ar: "تم تسجيل عدة عمليات إلغاء في هذه الوردية.",
      en: "Multiple void actions recorded this shift."
    },
    suggestion: {
      ar: "تأكد من صحة الطلبات قبل إضافتها. الإلغاءات تُسجل في سجل التدقيق.",
      en: "Verify orders before adding. Voids are recorded in audit log."
    }
  },
  empty_order_payment: {
    severity: "error",
    title: { ar: "الطلب فارغ", en: "Empty Order" },
    message: { 
      ar: "لا يمكن إتمام الدفع لطلب بدون أصناف.",
      en: "Cannot complete payment for an order with no items."
    },
    suggestion: {
      ar: "أضف أصناف للطلب أولاً.",
      en: "Add items to the order first."
    }
  },
  shift_open_too_long: {
    severity: "info",
    title: { ar: "وردية طويلة", en: "Long Shift" },
    message: { 
      ar: "الوردية مفتوحة منذ أكثر من 12 ساعة.",
      en: "Shift has been open for over 12 hours."
    },
    suggestion: {
      ar: "فكر في إغلاق الوردية وفتح وردية جديدة للمحاسبة الدقيقة.",
      en: "Consider closing the shift and opening a new one for accurate accounting."
    }
  },
  table_no_active_order: {
    severity: "warning",
    title: { ar: "طاولة بدون طلب", en: "Table Without Order" },
    message: { 
      ar: "الطاولة مشغولة لكن لا يوجد طلب نشط مرتبط بها.",
      en: "Table is occupied but has no active order associated."
    },
    suggestion: {
      ar: "أنشئ طلباً جديداً لهذه الطاولة أو حررها.",
      en: "Create a new order for this table or free it."
    }
  },
  discount_no_reason: {
    severity: "info",
    title: { ar: "خصم بدون سبب", en: "Discount Without Reason" },
    message: { 
      ar: "تم تطبيق خصم بدون تحديد السبب.",
      en: "Discount applied without specifying a reason."
    },
    suggestion: {
      ar: "يُفضل تسجيل سبب الخصم للمراجعة لاحقاً.",
      en: "It's recommended to record the discount reason for later review."
    }
  },
  high_cash_refund: {
    severity: "warning",
    title: { ar: "استرداد نقدي مرتفع", en: "High Cash Refund" },
    message: { 
      ar: "مبلغ الاسترداد النقدي أعلى من المتوسط.",
      en: "Cash refund amount is higher than average."
    },
    suggestion: {
      ar: "تأكد من صحة مبلغ الاسترداد. يتم تسجيل جميع الاستردادات.",
      en: "Verify the refund amount is correct. All refunds are logged."
    }
  },
  training_mode_active: {
    severity: "info",
    title: { ar: "وضع التدريب", en: "Training Mode" },
    message: { 
      ar: "أنت في وضع التدريب. لا يتم حفظ العمليات.",
      en: "You are in training mode. Operations are not saved."
    }
  }
};

// Thresholds
const HOLD_THRESHOLD_MINUTES = 30;
const SHIFT_DURATION_HOURS = 12;
const VOID_COUNT_THRESHOLD = 5;
const HIGH_REFUND_MULTIPLIER = 2; // 2x average is considered high

/**
 * Evaluate all rules against current context
 * Returns array of triggered alerts
 */
export function evaluateRules(context: RuleContext): SmartRule[] {
  const triggeredRules: SmartRule[] = [];

  // Rule 1: Cash selected with amount = 0
  if (
    context.paymentMethod === "cash" && 
    context.paymentAmount !== undefined && 
    context.paymentAmount === 0
  ) {
    triggeredRules.push({ id: "cash_zero_amount", ...RULES.cash_zero_amount });
  }

  // Rule 2: Refund attempted after shift closed
  if (
    context.lastAction === "refund_attempt" && 
    context.shiftStatus === "closed"
  ) {
    triggeredRules.push({ id: "refund_after_shift_closed", ...RULES.refund_after_shift_closed });
  }

  // Rule 3: Order on HOLD longer than threshold
  if (
    context.orderStatus === "held" && 
    context.orderHeldAt
  ) {
    const heldMinutes = (Date.now() - context.orderHeldAt.getTime()) / (1000 * 60);
    if (heldMinutes > HOLD_THRESHOLD_MINUTES) {
      triggeredRules.push({ id: "order_held_too_long", ...RULES.order_held_too_long });
    }
  }

  // Rule 4: Excessive VOID actions
  if (
    context.voidCountThisShift !== undefined && 
    context.voidCountThisShift >= VOID_COUNT_THRESHOLD
  ) {
    triggeredRules.push({ id: "excessive_voids", ...RULES.excessive_voids });
  }

  // Rule 5: Attempt to complete order with no items
  if (
    context.lastAction === "payment_attempt" && 
    (context.orderItemCount === undefined || context.orderItemCount === 0)
  ) {
    triggeredRules.push({ id: "empty_order_payment", ...RULES.empty_order_payment });
  }

  // Rule 6: Shift open for long duration
  if (
    context.shiftStatus === "open" && 
    context.shiftOpenedAt
  ) {
    const hoursOpen = (Date.now() - context.shiftOpenedAt.getTime()) / (1000 * 60 * 60);
    if (hoursOpen > SHIFT_DURATION_HOURS) {
      triggeredRules.push({ id: "shift_open_too_long", ...RULES.shift_open_too_long });
    }
  }

  // Rule 7: Table occupied without active order
  if (
    context.tableId && 
    context.tableHasActiveOrder === false
  ) {
    triggeredRules.push({ id: "table_no_active_order", ...RULES.table_no_active_order });
  }

  // Rule 8: Discount applied without reason
  if (
    context.discountApplied && 
    !context.discountReason
  ) {
    triggeredRules.push({ id: "discount_no_reason", ...RULES.discount_no_reason });
  }

  // Rule 9: High cash refund compared to average
  if (
    context.refundAmountThisShift !== undefined && 
    context.averageRefundAmount !== undefined && 
    context.averageRefundAmount > 0 &&
    context.refundAmountThisShift > context.averageRefundAmount * HIGH_REFUND_MULTIPLIER
  ) {
    triggeredRules.push({ id: "high_cash_refund", ...RULES.high_cash_refund });
  }

  // Rule 10: Training mode active
  if (context.trainingMode) {
    triggeredRules.push({ id: "training_mode_active", ...RULES.training_mode_active });
  }

  return triggeredRules;
}

/**
 * Get a single rule by ID
 */
export function getRule(id: RuleId): SmartRule {
  return { id, ...RULES[id] };
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: RuleSeverity): string {
  switch (severity) {
    case "error":
      return "text-destructive border-destructive/50 bg-destructive/10";
    case "warning":
      return "text-amber-600 dark:text-amber-400 border-amber-500/50 bg-amber-500/10";
    case "info":
      return "text-blue-600 dark:text-blue-400 border-blue-500/50 bg-blue-500/10";
    default:
      return "text-muted-foreground border-muted bg-muted";
  }
}

/**
 * Get severity icon name
 */
export function getSeverityIcon(severity: RuleSeverity): "AlertCircle" | "AlertTriangle" | "Info" {
  switch (severity) {
    case "error":
      return "AlertCircle";
    case "warning":
      return "AlertTriangle";
    case "info":
      return "Info";
    default:
      return "Info";
  }
}
