// Kastana POS Assistant - Audit-Aware Explanations
// Explains blocked actions and mentions audit logging

export interface AuditExplanation {
  reason: {
    ar: string;
    en: string;
  };
  policy: {
    ar: string;
    en: string;
  };
  auditNote: {
    ar: string;
    en: string;
  };
}

// Common blocked action explanations
const BLOCKED_ACTION_EXPLANATIONS: Record<string, AuditExplanation> = {
  shift_not_open: {
    reason: {
      ar: "الوردية غير مفتوحة",
      en: "Shift is not open",
    },
    policy: {
      ar: "جميع عمليات البيع تتطلب وردية مفتوحة لضمان دقة التقارير",
      en: "All sales operations require an open shift to ensure accurate reporting",
    },
    auditNote: {
      ar: "محاولات البيع بدون وردية تُسجل في سجل التدقيق",
      en: "Attempts to sell without shift are recorded in audit log",
    },
  },
  
  order_already_paid: {
    reason: {
      ar: "الطلب مدفوع مسبقاً",
      en: "Order is already paid",
    },
    policy: {
      ar: "الطلبات المدفوعة لا يمكن تعديلها. يجب استخدام الاسترداد إذا لزم الأمر",
      en: "Paid orders cannot be modified. Use refund if necessary",
    },
    auditNote: {
      ar: "أي تغييرات على الطلبات المدفوعة تتطلب صلاحيات خاصة وتُسجل",
      en: "Any changes to paid orders require special permissions and are logged",
    },
  },
  
  order_cancelled: {
    reason: {
      ar: "الطلب ملغي",
      en: "Order is cancelled",
    },
    policy: {
      ar: "الطلبات الملغاة لا يمكن استئنافها أو تعديلها",
      en: "Cancelled orders cannot be resumed or modified",
    },
    auditNote: {
      ar: "سبب الإلغاء والمستخدم مسجلان في سجل التدقيق",
      en: "Cancellation reason and user are recorded in audit log",
    },
  },
  
  insufficient_permissions: {
    reason: {
      ar: "صلاحيات غير كافية",
      en: "Insufficient permissions",
    },
    policy: {
      ar: "هذا الإجراء يتطلب صلاحيات أعلى (مالك أو مدير النظام)",
      en: "This action requires higher permissions (Owner or System Admin)",
    },
    auditNote: {
      ar: "محاولات الوصول غير المصرح بها تُسجل تلقائياً",
      en: "Unauthorized access attempts are automatically logged",
    },
  },
  
  inventory_disabled: {
    reason: {
      ar: "إدارة المخزون غير مفعلة",
      en: "Inventory management is not enabled",
    },
    policy: {
      ar: "يجب تفعيل إضافة المخزون من إدارة النظام أولاً",
      en: "Inventory add-on must be enabled by System Admin first",
    },
    auditNote: {
      ar: "تفعيل/إيقاف الإضافات يُسجل في سجل التدقيق",
      en: "Add-on enable/disable is recorded in audit log",
    },
  },
  
  kds_disabled: {
    reason: {
      ar: "شاشة المطبخ غير مفعلة",
      en: "Kitchen Display System is not enabled",
    },
    policy: {
      ar: "يجب تفعيل إضافة KDS من إدارة النظام أولاً",
      en: "KDS add-on must be enabled by System Admin first",
    },
    auditNote: {
      ar: "تفعيل/إيقاف الإضافات يُسجل في سجل التدقيق",
      en: "Add-on enable/disable is recorded in audit log",
    },
  },
  
  refund_limit_exceeded: {
    reason: {
      ar: "تجاوز حد الاسترداد",
      en: "Refund limit exceeded",
    },
    policy: {
      ar: "مبلغ الاسترداد يتجاوز الحد المسموح. يتطلب موافقة المالك",
      en: "Refund amount exceeds allowed limit. Requires owner approval",
    },
    auditNote: {
      ar: "جميع عمليات الاسترداد تُسجل مع السبب والمبلغ",
      en: "All refund operations are logged with reason and amount",
    },
  },
};

/**
 * Get explanation for a blocked action
 */
export function getBlockedActionExplanation(
  actionType: string,
  language: "ar" | "en"
): string {
  const explanation = BLOCKED_ACTION_EXPLANATIONS[actionType];
  
  if (!explanation) {
    // Generic blocked message
    return language === "ar"
      ? "⚠️ هذا الإجراء غير متاح حالياً.\n\n📋 السياسة: يحكم هذا الإجراء قواعد النظام.\n\n🔒 ملاحظة: جميع المحاولات تُسجل في سجل التدقيق."
      : "⚠️ This action is currently unavailable.\n\n📋 Policy: This action is governed by system rules.\n\n🔒 Note: All attempts are recorded in audit log.";
  }
  
  const reasonLabel = language === "ar" ? "السبب:" : "Reason:";
  const policyLabel = language === "ar" ? "السياسة:" : "Policy:";
  const auditLabel = language === "ar" ? "التدقيق:" : "Audit:";
  
  return `⚠️ ${reasonLabel} ${explanation.reason[language]}

📋 ${policyLabel} ${explanation.policy[language]}

🔒 ${auditLabel} ${explanation.auditNote[language]}`;
}

/**
 * Get generic audit awareness message
 */
export function getAuditAwarenessMessage(language: "ar" | "en"): string {
  return language === "ar"
    ? "🔒 هذا الإجراء يخضع لسياسات النظام ويُسجل في سجل التدقيق."
    : "🔒 This action is governed by system policies and is recorded in audit log.";
}

/**
 * Format blocked explanation with audit note
 */
export function formatBlockedWithAudit(
  reason: string,
  language: "ar" | "en"
): string {
  const auditNote = language === "ar"
    ? "\n\n🔒 ملاحظة: هذا الإجراء يُسجل في سجل التدقيق"
    : "\n\n🔒 Note: This action is recorded in audit log";
  
  return reason + auditNote;
}
