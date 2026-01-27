/**
 * Kastana POS - In-Flow Intelligence System
 * Provides silent guidance during real operation without interrupting workflows
 * 
 * Features:
 * 1. Silent Rule Explainer - Explains WHY actions are blocked
 * 2. First-Time Action Coach - Step-by-step guidance for first-time sensitive actions
 * 3. Suggested Next Action - Smart continuation after completing actions
 */

// === TYPES ===

export type SensitiveActionKey =
  | "refund"
  | "void_order"
  | "split_payment"
  | "merge_orders"
  | "hold_order"
  | "transfer_items"
  | "cash_out"
  | "close_shift"
  | "stock_count"
  | "waste_entry";

export type ActionCompletedKey =
  | "send_to_kitchen"
  | "complete_payment"
  | "close_shift"
  | "create_order"
  | "apply_discount"
  | "accept_qr_order"
  | "receive_purchase"
  | "stock_count_complete";

export type BlockReasonKey =
  | "order_held"
  | "order_not_open"
  | "order_cancelled"
  | "order_voided"
  | "order_paid"
  | "no_items"
  | "shift_closed"
  | "kds_disabled"
  | "no_pending_items"
  | "already_sent"
  | "no_payment"
  | "inventory_disabled"
  | "feature_disabled"
  | "zero_total"
  | "permission_denied"
  | "table_occupied"
  | "no_active_order"
  | "order_not_approved";

export interface FirstTimeCoachStep {
  ar: string;
  en: string;
}

export interface FirstTimeCoachConfig {
  title: { ar: string; en: string };
  steps: FirstTimeCoachStep[];
}

export interface NextActionSuggestion {
  action: { ar: string; en: string };
  context?: string; // Which screen/tab this applies to
}

// === STORAGE KEYS ===

const FIRST_TIME_ACTIONS_KEY = "kastana_first_time_actions";

// === SILENT RULE EXPLAINER ===

/**
 * Human-readable explanations for why actions are blocked
 * Uses calm, neutral language - explains the rule, not the UI
 */
export const BLOCK_REASON_EXPLANATIONS: Record<BlockReasonKey, { ar: string; en: string }> = {
  order_held: {
    ar: "الدفع غير متاح لأن الطلب على HOLD.",
    en: "Payment not available because the order is on HOLD.",
  },
  order_not_open: {
    ar: "هذا الإجراء متاح فقط للطلبات المفتوحة.",
    en: "This action is only available for open orders.",
  },
  order_cancelled: {
    ar: "لا يمكن تعديل طلب ملغي.",
    en: "Cannot modify a cancelled order.",
  },
  order_voided: {
    ar: "لا يمكن تعديل طلب محذوف.",
    en: "Cannot modify a voided order.",
  },
  order_paid: {
    ar: "الطلب مدفوع بالفعل. يمكنك فقط عمل مرتجع.",
    en: "Order already paid. You can only process a refund.",
  },
  no_items: {
    ar: "أضف أصناف للطلب أولاً.",
    en: "Add items to the order first.",
  },
  shift_closed: {
    ar: "افتح الوردية أولاً لبدء العمل.",
    en: "Open shift first to start working.",
  },
  kds_disabled: {
    ar: "الإرسال للمطبخ غير متاح - KDS غير مفعّل.",
    en: "Send to kitchen not available - KDS is not enabled.",
  },
  no_pending_items: {
    ar: "تم إرسال جميع الأصناف للمطبخ.",
    en: "All items already sent to kitchen.",
  },
  already_sent: {
    ar: "تم الإرسال بالفعل.",
    en: "Already sent.",
  },
  no_payment: {
    ar: "أدخل مبلغ الدفع أولاً.",
    en: "Enter payment amount first.",
  },
  inventory_disabled: {
    ar: "المخزون غير مفعّل لهذا الفرع.",
    en: "Inventory not enabled for this branch.",
  },
  feature_disabled: {
    ar: "هذه الميزة غير مفعّلة حالياً.",
    en: "This feature is currently not enabled.",
  },
  zero_total: {
    ar: "لا يوجد مبلغ للدفع.",
    en: "No amount to pay.",
  },
  permission_denied: {
    ar: "هذا الخيار متاح فقط للمالك.",
    en: "This option is only available to the owner.",
  },
  table_occupied: {
    ar: "الطاولة مشغولة بطلب آخر.",
    en: "Table is occupied with another order.",
  },
  no_active_order: {
    ar: "لا يوجد طلب نشط على هذه الطاولة.",
    en: "No active order on this table.",
  },
  order_not_approved: {
    ar: "لا يمكن الإرسال للمطبخ لأن الطلب غير معتمد.",
    en: "Cannot send to kitchen because order is not approved.",
  },
};

/**
 * Get human-readable explanation for why an action is blocked
 */
export function getBlockExplanation(
  reasonKey: BlockReasonKey,
  language: "ar" | "en"
): string {
  const explanation = BLOCK_REASON_EXPLANATIONS[reasonKey];
  return explanation ? explanation[language] : (
    language === "ar" ? "هذا الإجراء غير متاح حالياً." : "This action is not currently available."
  );
}

/**
 * Determine block reason from order/shift state
 */
export function detectBlockReason(conditions: {
  orderStatus?: string | null;
  hasItems?: boolean;
  shiftOpen?: boolean;
  kdsEnabled?: boolean;
  hasPendingItems?: boolean;
  hasPaymentAmount?: boolean;
  total?: number;
  inventoryEnabled?: boolean;
  userRole?: string;
  requiredRole?: string;
}): BlockReasonKey | null {
  const {
    orderStatus,
    hasItems,
    shiftOpen,
    kdsEnabled,
    hasPendingItems,
    hasPaymentAmount,
    total,
    inventoryEnabled,
    userRole,
    requiredRole,
  } = conditions;

  // Permission check first
  if (requiredRole && userRole && userRole !== requiredRole && userRole !== "system_admin") {
    return "permission_denied";
  }

  // Shift check
  if (shiftOpen === false) return "shift_closed";

  // Order status checks
  if (orderStatus === "held") return "order_held";
  if (orderStatus === "cancelled") return "order_cancelled";
  if (orderStatus === "voided") return "order_voided";
  if (orderStatus === "paid") return "order_paid";
  if (orderStatus && !["new", "open"].includes(orderStatus)) return "order_not_open";

  // Item checks
  if (hasItems === false) return "no_items";

  // KDS check
  if (kdsEnabled === false) return "kds_disabled";

  // Pending items check
  if (hasPendingItems === false) return "no_pending_items";

  // Payment check
  if (hasPaymentAmount === false) return "no_payment";

  // Total check
  if (total !== undefined && total <= 0) return "zero_total";

  // Inventory check
  if (inventoryEnabled === false) return "inventory_disabled";

  return null;
}

// === FIRST-TIME ACTION COACH ===

/**
 * Step-by-step guidance configurations for sensitive actions
 */
export const FIRST_TIME_COACH_CONFIGS: Record<SensitiveActionKey, FirstTimeCoachConfig> = {
  refund: {
    title: { ar: "أول استرداد لك", en: "Your First Refund" },
    steps: [
      { ar: "اختر سبب الإرجاع", en: "Select return reason" },
      { ar: "تأكد من المبلغ", en: "Confirm the amount" },
      { ar: "اعتمد العملية", en: "Confirm the operation" },
    ],
  },
  void_order: {
    title: { ar: "أول إلغاء طلب", en: "Your First Void" },
    steps: [
      { ar: "اختر سبب الإلغاء", en: "Select cancellation reason" },
      { ar: "تأكد أن الطلب لم يُدفع", en: "Confirm order is not paid" },
      { ar: "اعتمد الإلغاء", en: "Confirm the void" },
    ],
  },
  split_payment: {
    title: { ar: "أول تقسيم دفع", en: "Your First Split Payment" },
    steps: [
      { ar: "أدخل المبلغ الأول", en: "Enter first amount" },
      { ar: "اختر طريقة الدفع", en: "Select payment method" },
      { ar: "أضف طريقة الدفع الثانية", en: "Add second payment method" },
      { ar: "تأكد أن المجموع صحيح", en: "Verify total is correct" },
    ],
  },
  merge_orders: {
    title: { ar: "أول دمج طلبات", en: "Your First Order Merge" },
    steps: [
      { ar: "اختر الطلب الأول (الأساسي)", en: "Select first order (primary)" },
      { ar: "اختر الطلب الثاني", en: "Select second order" },
      { ar: "راجع الأصناف المدمجة", en: "Review merged items" },
      { ar: "اعتمد الدمج", en: "Confirm merge" },
    ],
  },
  hold_order: {
    title: { ar: "أول تعليق طلب", en: "Your First Hold Order" },
    steps: [
      { ar: "اضغط على زر Hold", en: "Press the Hold button" },
      { ar: "الطلب يُحفظ تلقائياً", en: "Order saves automatically" },
      { ar: "استأنف من قائمة الطلبات المعلقة", en: "Resume from held orders list" },
    ],
  },
  transfer_items: {
    title: { ar: "أول نقل أصناف", en: "Your First Item Transfer" },
    steps: [
      { ar: "اختر الأصناف للنقل", en: "Select items to transfer" },
      { ar: "اختر الطلب الهدف", en: "Choose target order" },
      { ar: "اعتمد النقل", en: "Confirm transfer" },
    ],
  },
  cash_out: {
    title: { ar: "أول سحب نقد", en: "Your First Cash Out" },
    steps: [
      { ar: "أدخل المبلغ المسحوب", en: "Enter withdrawal amount" },
      { ar: "اكتب سبب السحب", en: "Write reason for withdrawal" },
      { ar: "اعتمد العملية", en: "Confirm operation" },
    ],
  },
  close_shift: {
    title: { ar: "أول إغلاق وردية", en: "Your First Shift Close" },
    steps: [
      { ar: "تأكد من عدم وجود طلبات مفتوحة", en: "Ensure no open orders" },
      { ar: "أدخل النقد الفعلي في الدرج", en: "Enter actual cash in drawer" },
      { ar: "راجع تقرير Z", en: "Review Z Report" },
      { ar: "اعتمد الإغلاق", en: "Confirm close" },
    ],
  },
  stock_count: {
    title: { ar: "أول جرد مخزون", en: "Your First Stock Count" },
    steps: [
      { ar: "اختر الصنف للجرد", en: "Select item to count" },
      { ar: "أدخل الكمية الفعلية", en: "Enter actual quantity" },
      { ar: "راجع الفرق إن وجد", en: "Review variance if any" },
      { ar: "اعتمد الجرد", en: "Confirm count" },
    ],
  },
  waste_entry: {
    title: { ar: "أول تسجيل هدر", en: "Your First Waste Entry" },
    steps: [
      { ar: "اختر الصنف التالف", en: "Select wasted item" },
      { ar: "أدخل الكمية", en: "Enter quantity" },
      { ar: "اختر سبب الهدر", en: "Select waste reason" },
      { ar: "اعتمد التسجيل", en: "Confirm entry" },
    ],
  },
};

/**
 * Get completed first-time actions from localStorage
 */
export function getCompletedFirstTimeActions(): SensitiveActionKey[] {
  try {
    const stored = localStorage.getItem(FIRST_TIME_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a sensitive action as completed (won't show guidance again)
 */
export function markActionCompleted(actionKey: SensitiveActionKey): void {
  const completed = getCompletedFirstTimeActions();
  if (!completed.includes(actionKey)) {
    completed.push(actionKey);
    localStorage.setItem(FIRST_TIME_ACTIONS_KEY, JSON.stringify(completed));
  }
}

/**
 * Check if this is the first time user performs this action
 */
export function isFirstTimeAction(actionKey: SensitiveActionKey): boolean {
  const completed = getCompletedFirstTimeActions();
  return !completed.includes(actionKey);
}

/**
 * Get first-time coaching content if applicable
 */
export function getFirstTimeCoaching(
  actionKey: SensitiveActionKey,
  language: "ar" | "en"
): { title: string; steps: string[] } | null {
  if (!isFirstTimeAction(actionKey)) {
    return null;
  }

  const config = FIRST_TIME_COACH_CONFIGS[actionKey];
  if (!config) {
    return null;
  }

  return {
    title: config.title[language],
    steps: config.steps.map((step) => step[language]),
  };
}

// === SUGGESTED NEXT ACTION ===

/**
 * Smart continuation suggestions after completing actions
 */
export const NEXT_ACTION_SUGGESTIONS: Record<ActionCompletedKey, NextActionSuggestion> = {
  send_to_kitchen: {
    action: {
      ar: "الخطوة التالية عادةً: متابعة حالة الطلب.",
      en: "Next step usually: Monitor order status.",
    },
  },
  complete_payment: {
    action: {
      ar: "يمكنك الآن طباعة الفاتورة أو بدء طلب جديد.",
      en: "You can now print receipt or start a new order.",
    },
  },
  close_shift: {
    action: {
      ar: "قد ترغب بمراجعة ملخص اليوم.",
      en: "You may want to review today's summary.",
    },
  },
  create_order: {
    action: {
      ar: "أضف الأصناف المطلوبة للطلب.",
      en: "Add the requested items to the order.",
    },
  },
  apply_discount: {
    action: {
      ar: "راجع المجموع ثم أكمل الدفع.",
      en: "Review total then complete payment.",
    },
  },
  accept_qr_order: {
    action: {
      ar: "الطلب جاهز للإرسال للمطبخ.",
      en: "Order ready to send to kitchen.",
    },
  },
  receive_purchase: {
    action: {
      ar: "تم تحديث المخزون. راجع الكميات الجديدة.",
      en: "Inventory updated. Review new quantities.",
    },
  },
  stock_count_complete: {
    action: {
      ar: "راجع تقرير الفروقات لفهم الأسباب.",
      en: "Review variance report to understand causes.",
    },
  },
};

/**
 * Get suggested next action after completing an action
 */
export function getNextActionSuggestion(
  completedAction: ActionCompletedKey,
  language: "ar" | "en"
): string | null {
  const suggestion = NEXT_ACTION_SUGGESTIONS[completedAction];
  return suggestion ? suggestion.action[language] : null;
}

// === ROLE-AWARE HELPERS ===

/**
 * Check if user role can perform a sensitive action
 */
export function canRolePerformAction(
  userRole: string,
  action: SensitiveActionKey
): boolean {
  // Actions that require owner role
  const ownerOnlyActions: SensitiveActionKey[] = [];
  
  // Actions cashiers can perform
  const cashierActions: SensitiveActionKey[] = [
    "refund",
    "void_order",
    "split_payment",
    "merge_orders",
    "hold_order",
    "transfer_items",
    "cash_out",
    "close_shift",
  ];

  // Actions that require owner for inventory
  const inventoryActions: SensitiveActionKey[] = ["stock_count", "waste_entry"];

  if (userRole === "owner" || userRole === "system_admin") {
    return true;
  }

  if (userRole === "cashier") {
    return cashierActions.includes(action);
  }

  if (userRole === "kitchen") {
    return false; // Kitchen staff don't perform sensitive actions
  }

  return false;
}

/**
 * Get role-specific message if action is not allowed
 */
export function getRoleRestrictionMessage(
  action: SensitiveActionKey,
  userRole: string,
  language: "ar" | "en"
): string | null {
  if (canRolePerformAction(userRole, action)) {
    return null;
  }

  return language === "ar"
    ? "هذا الإجراء يتطلب صلاحيات أعلى."
    : "This action requires higher permissions.";
}
