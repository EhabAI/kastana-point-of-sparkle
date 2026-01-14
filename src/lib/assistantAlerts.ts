// Kastana POS Assistant - Smart Alerts Generator
// Non-binding alerts with explanations, severity levels, and report navigation

export type AlertType =
  | "sales_drop"
  | "high_refunds"
  | "cash_mismatch"
  | "inventory_variance"
  | "repeated_voids"
  | "payment_blocked"
  | "shift_left_open"
  | "inventory_mismatch";

export type AlertSeverity = "info" | "warning" | "critical";

// Severity thresholds and descriptions
export const SEVERITY_CONFIG: Record<AlertSeverity, {
  priority: number;
  description: { ar: string; en: string };
  cssClass: string;
}> = {
  critical: {
    priority: 1,
    description: {
      ar: "يتطلب اهتمام فوري",
      en: "Requires immediate attention",
    },
    cssClass: "border-red-500 bg-red-50 dark:bg-red-950/30 animate-pulse",
  },
  warning: {
    priority: 2,
    description: {
      ar: "يحتاج مراجعة قريبة",
      en: "Needs review soon",
    },
    cssClass: "border-amber-500 bg-amber-50 dark:bg-amber-950/30",
  },
  info: {
    priority: 3,
    description: {
      ar: "للعلم فقط",
      en: "For your information",
    },
    cssClass: "border-blue-500 bg-blue-50 dark:bg-blue-950/30",
  },
};

export interface SmartAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  reason: {
    ar: string;
    en: string;
  };
  nextCheck: {
    ar: string;
    en: string;
  };
  reportPath: string;
  reportLabel: {
    ar: string;
    en: string;
  };
  auditRelevant?: boolean;
}

// Alert definitions with explanations
const ALERT_TEMPLATES: Record<AlertType, Omit<SmartAlert, "id">> = {
  sales_drop: {
    type: "sales_drop",
    severity: "warning",
    reason: {
      ar: "المبيعات أقل من الفترة المقارنة السابقة",
      en: "Sales lower than previous comparable period",
    },
    nextCheck: {
      ar: "راجع الأصناف الأقل مبيعاً وساعات الذروة",
      en: "Review low-selling items and peak hours",
    },
    reportPath: "/admin?tab=reports&section=sales",
    reportLabel: {
      ar: "فتح تقرير المبيعات",
      en: "Open Sales Report",
    },
  },

  high_refunds: {
    type: "high_refunds",
    severity: "warning",
    reason: {
      ar: "نسبة المرتجعات أعلى من المعتاد",
      en: "Refund rate higher than usual",
    },
    nextCheck: {
      ar: "تحقق من أسباب الاسترداد والأصناف المتأثرة",
      en: "Check refund reasons and affected items",
    },
    reportPath: "/admin?tab=reports&section=refunds",
    reportLabel: {
      ar: "فتح تقرير المرتجعات",
      en: "Open Refunds Report",
    },
  },

  cash_mismatch: {
    type: "cash_mismatch",
    severity: "critical",
    reason: {
      ar: "فرق بين النقد المتوقع والفعلي في الدرج",
      en: "Difference between expected and actual cash in drawer",
    },
    nextCheck: {
      ar: "راجع حركات النقد وعمليات الدفع النقدي",
      en: "Review cash movements and cash payments",
    },
    reportPath: "/admin?tab=reports&section=shifts",
    reportLabel: {
      ar: "فتح تقرير الورديات",
      en: "Open Shifts Report",
    },
    auditRelevant: true,
  },

  inventory_variance: {
    type: "inventory_variance",
    severity: "warning",
    reason: {
      ar: "فرق كبير بين المخزون المتوقع والفعلي بعد الجرد",
      en: "Significant difference between expected and actual inventory after count",
    },
    nextCheck: {
      ar: "راجع حركات الاستلام والهدر والوصفات",
      en: "Review receiving, waste, and recipe usage",
    },
    reportPath: "/admin?tab=inventory",
    reportLabel: {
      ar: "فتح إدارة المخزون",
      en: "Open Inventory Management",
    },
  },

  repeated_voids: {
    type: "repeated_voids",
    severity: "info",
    reason: {
      ar: "عدد الإلغاءات (Voids) مرتفع مقارنة بعدد الطلبات",
      en: "High number of voids compared to order count",
    },
    nextCheck: {
      ar: "راجع أسباب الإلغاء لكل كاشير",
      en: "Review void reasons per cashier",
    },
    reportPath: "/admin?tab=reports&section=staff",
    reportLabel: {
      ar: "فتح تقرير الموظفين",
      en: "Open Staff Report",
    },
  },

  // New critical alerts
  payment_blocked: {
    type: "payment_blocked",
    severity: "critical",
    reason: {
      ar: "عملية الدفع محظورة بسبب مشكلة في النظام أو الصلاحيات",
      en: "Payment is blocked due to system or permission issue",
    },
    nextCheck: {
      ar: "تأكد من فتح الوردية وصلاحيات الكاشير",
      en: "Verify shift is open and cashier permissions",
    },
    reportPath: "/pos",
    reportLabel: {
      ar: "العودة لشاشة المبيعات",
      en: "Return to POS Screen",
    },
    auditRelevant: true,
  },

  shift_left_open: {
    type: "shift_left_open",
    severity: "critical",
    reason: {
      ar: "الوردية مفتوحة لفترة طويلة (أكثر من 12 ساعة)",
      en: "Shift has been open for too long (over 12 hours)",
    },
    nextCheck: {
      ar: "أغلق الوردية الحالية وافتح وردية جديدة",
      en: "Close current shift and open a new one",
    },
    reportPath: "/pos",
    reportLabel: {
      ar: "إغلاق الوردية",
      en: "Close Shift",
    },
    auditRelevant: true,
  },

  inventory_mismatch: {
    type: "inventory_mismatch",
    severity: "critical",
    reason: {
      ar: "اختلاف كبير في كميات المخزون يحتاج مراجعة عاجلة",
      en: "Significant inventory quantity mismatch requires urgent review",
    },
    nextCheck: {
      ar: "راجع حركات المخزون وقم بجرد فوري",
      en: "Review inventory transactions and perform immediate count",
    },
    reportPath: "/admin?tab=inventory",
    reportLabel: {
      ar: "فتح المخزون",
      en: "Open Inventory",
    },
    auditRelevant: true,
  },
};

/**
 * Generate an alert of a specific type
 */
export function generateAlert(type: AlertType): SmartAlert {
  const template = ALERT_TEMPLATES[type];
  return {
    id: `alert_${type}_${Date.now()}`,
    ...template,
  };
}

/**
 * Get all alert types
 */
export function getAlertTypes(): AlertType[] {
  return Object.keys(ALERT_TEMPLATES) as AlertType[];
}

/**
 * Detect if user message is asking about an alert topic
 */
export function detectAlertType(message: string): AlertType | null {
  const lowerMessage = message.toLowerCase();

  const patterns: Record<AlertType, string[]> = {
    sales_drop: [
      "مبيعات قليلة", "انخفاض المبيعات", "مبيعات أقل", "هبوط المبيعات", "تراجع المبيعات",
      "sales drop", "low sales", "sales down", "sales decreased", "sales fell",
    ],
    high_refunds: [
      "مرتجعات كثيرة", "استرداد كثير", "مرتجعات عالية", "refunds كثير",
      "high refunds", "many refunds", "refund spike", "too many returns",
    ],
    cash_mismatch: [
      "فرق النقد", "نقص الدرج", "عجز نقدي", "النقد لا يطابق", "فرق في الكاش",
      "cash mismatch", "cash short", "cash over", "drawer difference", "cash variance",
    ],
    inventory_variance: [
      "فرق المخزون", "نقص المخزون بعد الجرد", "فروقات الجرد", "انحراف المخزون",
      "inventory variance", "stock count difference", "inventory short", "stock mismatch",
    ],
    repeated_voids: [
      "إلغاءات كثيرة", "void كثير", "إلغاء متكرر", "كثرة الإلغاءات",
      "many voids", "repeated voids", "void spike", "too many voids",
    ],
    payment_blocked: [
      "الدفع محظور", "لا أستطيع الدفع", "الدفع معطل", "payment blocked",
      "can't pay", "payment disabled", "payment failed",
    ],
    shift_left_open: [
      "الوردية مفتوحة", "shift مفتوح", "نسيت أغلق الشفت",
      "shift still open", "forgot to close shift", "shift open too long",
    ],
    inventory_mismatch: [
      "اختلاف المخزون", "كميات غير متطابقة", "مخزون غير صحيح",
      "inventory mismatch", "stock not matching", "wrong inventory",
    ],
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      return type as AlertType;
    }
  }

  return null;
}

/**
 * Format an alert as a message string
 */
export function formatAlertMessage(
  alert: SmartAlert,
  language: "ar" | "en"
): string {
  const severityEmoji = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🚨",
  };

  const header = language === "ar" ? "تنبيه ذكي" : "Smart Alert";
  const reasonLabel = language === "ar" ? "السبب:" : "Reason:";
  const checkLabel = language === "ar" ? "تحقق من:" : "Check:";

  return `${severityEmoji[alert.severity]} ${header}\n\n${reasonLabel} ${alert.reason[language]}\n\n${checkLabel} ${alert.nextCheck[language]}`;
}

/**
 * Get severity color class for styling
 */
export function getAlertSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "border-red-500 bg-red-50 dark:bg-red-950/30";
    case "warning":
      return "border-amber-500 bg-amber-50 dark:bg-amber-950/30";
    case "info":
    default:
      return "border-blue-500 bg-blue-50 dark:bg-blue-950/30";
  }
}

/**
 * Get severity icon color class
 */
export function getAlertIconColor(severity: AlertSeverity): string {
  switch (severity) {
    case "critical":
      return "text-red-500";
    case "warning":
      return "text-amber-500";
    case "info":
    default:
      return "text-blue-500";
  }
}
