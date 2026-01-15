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
  | "training_mode_active"
  // WOW rules
  | "long_pending_order"
  | "repeated_void_actions"
  | "repeated_failed_payments"
  | "void_instead_of_hold"
  // Role-specific rules
  | "cashier_pay_held_order"
  | "owner_high_variance"
  | "owner_low_stock"
  | "kds_stuck_orders"
  | "kds_rush_accumulation"
  | "kds_first_time";

export type RuleSeverity = "info" | "warning" | "error";

export interface SmartRule {
  id: RuleId;
  severity: RuleSeverity;
  title: { ar: string; en: string };
  message: { ar: string; en: string };
  suggestion?: { ar: string; en: string };
  priority?: number; // Higher = more important (for single-alert logic)
}

export interface RuleContext {
  // Payment context
  paymentMethod?: string | null;
  paymentAmount?: number;
  failedPaymentCount?: number;
  lastPaymentFailedAt?: Date | null;
  
  // Order context
  orderStatus?: string | null;
  orderItemCount?: number;
  orderHeldAt?: Date | null;
  orderCreatedAt?: Date | null;
  discountApplied?: boolean;
  discountReason?: string | null;
  
  // Shift context
  shiftStatus?: string | null;
  shiftOpenedAt?: Date | null;
  averageShiftDuration?: number; // in hours
  
  // Table context
  tableId?: string | null;
  tableHasActiveOrder?: boolean;
  
  // Action context
  lastAction?: string | null;
  voidCountThisShift?: number;
  voidCountLastHour?: number;
  holdCountThisShift?: number;
  refundAmountThisShift?: number;
  averageRefundAmount?: number;
  
  // Mode context
  trainingMode?: boolean;
  
  // KDS context
  kdsStuckOrderCount?: number;
  kdsRushOrderCount?: number;
  kdsIsFirstVisit?: boolean;
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
    },
    priority: 10
  },
  
  // === NEW WOW RULES ===
  
  long_pending_order: {
    severity: "warning",
    title: { ar: "طلب معلق طويلاً", en: "Long Pending Order" },
    message: { 
      ar: "هذا الطلب مفتوح لفترة طويلة بدون إجراء.",
      en: "This order has been open for a while without action."
    },
    suggestion: {
      ar: "أكمل الدفع أو انقله لقائمة الانتظار.",
      en: "Complete payment or move to Hold."
    },
    priority: 70
  },
  
  repeated_void_actions: {
    severity: "info",
    title: { ar: "إلغاءات متكررة", en: "Repeated Voids" },
    message: { 
      ar: "لاحظنا عدة إلغاءات في وقت قصير.",
      en: "Multiple voids detected in a short time."
    },
    suggestion: {
      ar: "استخدم «تعليق» للطلبات المؤجلة بدلاً من الإلغاء.",
      en: "Use Hold for deferred orders instead of Void."
    },
    priority: 50
  },
  
  repeated_failed_payments: {
    severity: "warning",
    title: { ar: "محاولات دفع فاشلة", en: "Payment Issues" },
    message: { 
      ar: "فشلت عدة محاولات دفع متتالية.",
      en: "Multiple payment attempts failed."
    },
    suggestion: {
      ar: "تحقق من طريقة الدفع أو المبلغ أو الاتصال.",
      en: "Check payment method, amount, or connectivity."
    },
    priority: 80
  },
  
  void_instead_of_hold: {
    severity: "info",
    title: { ar: "نصيحة: استخدم التعليق", en: "Tip: Use Hold" },
    message: { 
      ar: "الإلغاء المتكرر قد يكون غير مناسب.",
      en: "Frequent voids may not be the best approach."
    },
    suggestion: {
      ar: "التعليق يحفظ الطلب للمتابعة لاحقاً دون حذفه.",
      en: "Hold preserves the order for later without deleting it."
    },
    priority: 40
  },
  
  // === ROLE-SPECIFIC RULES ===
  
  cashier_pay_held_order: {
    severity: "warning",
    title: { ar: "الطلب معلق", en: "Order is Held" },
    message: { 
      ar: "لا يمكن الدفع لطلب معلق. يجب استئنافه أولاً.",
      en: "Cannot pay for a held order. Resume it first."
    },
    suggestion: {
      ar: "افتح «الطلبات المعلقة» واضغط «استئناف» على هذا الطلب.",
      en: "Open 'Held Orders' and click 'Resume' on this order."
    },
    priority: 85
  },
  
  owner_high_variance: {
    severity: "warning",
    title: { ar: "فرق مخزون مرتفع", en: "High Inventory Variance" },
    message: { 
      ar: "فرق المخزون أعلى من الطبيعي. راجع الأسباب المحتملة.",
      en: "Inventory variance is higher than normal. Review possible causes."
    },
    suggestion: {
      ar: "الأسباب الشائعة: هدر، سرقة، خطأ تسجيل، أو تغيير في الوصفات.",
      en: "Common causes: waste, theft, recording error, or recipe changes."
    },
    priority: 60
  },
  
  owner_low_stock: {
    severity: "warning",
    title: { ar: "مخزون منخفض", en: "Low Stock" },
    message: { 
      ar: "بعض الأصناف قاربت على النفاد.",
      en: "Some items are running low."
    },
    suggestion: {
      ar: "راجع تنبيهات المخزون واطلب التوريد قبل النفاد.",
      en: "Check inventory alerts and order supplies before stockout."
    },
    priority: 55
  },
  
  kds_stuck_orders: {
    severity: "warning",
    title: { ar: "طلبات متأخرة", en: "Delayed Orders" },
    message: { 
      ar: "توجد طلبات في الانتظار لفترة طويلة.",
      en: "Some orders have been waiting too long."
    },
    suggestion: {
      ar: "ركز على الطلبات الحمراء أولاً.",
      en: "Focus on red orders first."
    },
    priority: 75
  },
  
  kds_rush_accumulation: {
    severity: "info",
    title: { ar: "ازدحام الطلبات", en: "Order Rush" },
    message: { 
      ar: "تراكم طلبات في الانتظار.",
      en: "Orders accumulating in queue."
    },
    suggestion: {
      ar: "ابدأ بالأقدم وحافظ على الترتيب.",
      en: "Start with oldest and maintain order."
    },
    priority: 45
  },
  
  kds_first_time: {
    severity: "info",
    title: { ar: "مرحباً بك في شاشة المطبخ", en: "Welcome to Kitchen Display" },
    message: { 
      ar: "الطلبات تظهر بالترتيب. اضغط لتغيير الحالة.",
      en: "Orders appear in order. Click to change status."
    },
    suggestion: {
      ar: "جديد → قيد التحضير → جاهز",
      en: "New → In Progress → Ready"
    },
    priority: 30
  }
};

// Thresholds
const HOLD_THRESHOLD_MINUTES = 30;
const SHIFT_DURATION_HOURS = 12;
const VOID_COUNT_THRESHOLD = 5;
const HIGH_REFUND_MULTIPLIER = 2; // 2x average is considered high

// New thresholds for WOW rules
const PENDING_ORDER_THRESHOLD_MINUTES = 15;
const VOID_RAPID_THRESHOLD = 3; // 3 voids in an hour triggers alert
const FAILED_PAYMENT_THRESHOLD = 2; // 2+ failed payments triggers alert
const VOID_VS_HOLD_RATIO_THRESHOLD = 3; // If voids > 3x holds, suggest Hold

// KDS thresholds
const KDS_STUCK_ORDER_THRESHOLD = 1; // Show alert if any orders stuck
const KDS_RUSH_ORDER_THRESHOLD = 5; // Show rush alert if 5+ orders queued

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

  // === NEW WOW RULES ===

  // Rule 11: Long pending order (open but no action for threshold)
  if (
    context.orderStatus === "open" &&
    context.orderCreatedAt &&
    context.orderItemCount !== undefined &&
    context.orderItemCount > 0
  ) {
    const pendingMinutes = (Date.now() - context.orderCreatedAt.getTime()) / (1000 * 60);
    if (pendingMinutes > PENDING_ORDER_THRESHOLD_MINUTES) {
      triggeredRules.push({ id: "long_pending_order", ...RULES.long_pending_order });
    }
  }

  // Rule 12: Repeated void actions in short time (non-accusatory)
  if (
    context.voidCountLastHour !== undefined &&
    context.voidCountLastHour >= VOID_RAPID_THRESHOLD
  ) {
    triggeredRules.push({ id: "repeated_void_actions", ...RULES.repeated_void_actions });
  }

  // Rule 13: Repeated failed payments
  if (
    context.failedPaymentCount !== undefined &&
    context.failedPaymentCount >= FAILED_PAYMENT_THRESHOLD
  ) {
    triggeredRules.push({ id: "repeated_failed_payments", ...RULES.repeated_failed_payments });
  }

  // Rule 14: Suboptimal feature usage (Void vs Hold)
  // Only trigger if user has many voids but few holds
  if (
    context.voidCountThisShift !== undefined &&
    context.holdCountThisShift !== undefined &&
    context.voidCountThisShift >= VOID_COUNT_THRESHOLD &&
    context.voidCountThisShift > (context.holdCountThisShift || 0) * VOID_VS_HOLD_RATIO_THRESHOLD
  ) {
    triggeredRules.push({ id: "void_instead_of_hold", ...RULES.void_instead_of_hold });
  }

  // === KDS RULES ===

  // Rule 15: KDS stuck orders
  if (
    context.kdsStuckOrderCount !== undefined &&
    context.kdsStuckOrderCount >= KDS_STUCK_ORDER_THRESHOLD
  ) {
    triggeredRules.push({ id: "kds_stuck_orders", ...RULES.kds_stuck_orders });
  }

  // Rule 16: KDS rush accumulation
  if (
    context.kdsRushOrderCount !== undefined &&
    context.kdsRushOrderCount >= KDS_RUSH_ORDER_THRESHOLD
  ) {
    triggeredRules.push({ id: "kds_rush_accumulation", ...RULES.kds_rush_accumulation });
  }

  // Rule 17: KDS first time visit
  if (context.kdsIsFirstVisit === true) {
    triggeredRules.push({ id: "kds_first_time", ...RULES.kds_first_time });
  }

  // Sort by priority (highest first) and return only the top alert
  const sortedRules = triggeredRules.sort((a, b) => {
    const priorityA = a.priority ?? 0;
    const priorityB = b.priority ?? 0;
    return priorityB - priorityA;
  });

  return sortedRules;
}

/**
 * Get only the highest priority alert (for single-alert display)
 */
export function getTopAlert(context: RuleContext): SmartRule | null {
  const rules = evaluateRules(context);
  return rules.length > 0 ? rules[0] : null;
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
