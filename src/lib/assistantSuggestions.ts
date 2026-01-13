// Kastana POS Assistant - Smart Suggestions Layer
// Optional, data-driven suggestions based on visible report data

export type SuggestionType =
  | "low_sales"
  | "high_refunds"
  | "cash_mismatch"
  | "repeated_voids"
  | "inventory_variance";

export interface SmartSuggestion {
  type: SuggestionType;
  why: {
    ar: string;
    en: string;
  };
  whatToCheck: {
    ar: string[];
    en: string[];
  };
  insufficientDataMessage: {
    ar: string;
    en: string;
  };
}

// Suggestion templates - read-only, no commands
const SUGGESTIONS: Record<SuggestionType, SmartSuggestion> = {
  low_sales: {
    type: "low_sales",
    why: {
      ar: "المبيعات أقل من الفترة المقارنة",
      en: "Sales lower than comparable period",
    },
    whatToCheck: {
      ar: [
        "هل كانت ساعات العمل أقل؟",
        "هل توقف صنف رئيسي عن التوفر؟",
        "هل هناك منافس جديد أو عروض؟",
        "راجع تقرير الأصناف الأكثر مبيعاً",
      ],
      en: [
        "Were operating hours shorter?",
        "Was a popular item unavailable?",
        "New competitor or promotions nearby?",
        "Review best sellers report",
      ],
    },
    insufficientDataMessage: {
      ar: "لا تتوفر بيانات كافية للمقارنة. أحتاج رقم المبيعات الحالي والسابق.",
      en: "Insufficient data for comparison. Need current and previous sales figures.",
    },
  },

  high_refunds: {
    type: "high_refunds",
    why: {
      ar: "نسبة المرتجعات أعلى من المعتاد",
      en: "Refund rate higher than usual",
    },
    whatToCheck: {
      ar: [
        "هل هناك صنف معين يُرجع كثيراً؟",
        "هل المشكلة في جودة التحضير؟",
        "هل الأوصاف واضحة للعملاء؟",
        "راجع أسباب الاسترداد المسجلة",
      ],
      en: [
        "Is one item being returned frequently?",
        "Is there a preparation quality issue?",
        "Are menu descriptions clear to customers?",
        "Review recorded refund reasons",
      ],
    },
    insufficientDataMessage: {
      ar: "لا تتوفر بيانات مرتجعات كافية. أحتاج إجمالي المرتجعات مقارنة بالمبيعات.",
      en: "Insufficient refund data. Need refund total compared to sales.",
    },
  },

  cash_mismatch: {
    type: "cash_mismatch",
    why: {
      ar: "فرق بين النقد المتوقع والفعلي",
      en: "Difference between expected and actual cash",
    },
    whatToCheck: {
      ar: [
        "هل تم تسجيل جميع المبالغ المستلمة؟",
        "هل هناك باقي لم يُعطَ للعميل؟",
        "هل تم سحب نقدي غير مسجل؟",
        "راجع حركات النقد (Cash In/Out)",
      ],
      en: [
        "Were all received amounts recorded?",
        "Was any change not given to customer?",
        "Any unrecorded cash withdrawal?",
        "Review cash movements (Cash In/Out)",
      ],
    },
    insufficientDataMessage: {
      ar: "لا يظهر فرق النقد. أحتاج قيمة النقد المتوقع والفعلي.",
      en: "Cash variance not visible. Need expected and actual cash values.",
    },
  },

  repeated_voids: {
    type: "repeated_voids",
    why: {
      ar: "عدد الإلغاءات (Voids) مرتفع",
      en: "High number of void transactions",
    },
    whatToCheck: {
      ar: [
        "هل الكاشير يخطئ في إدخال الأصناف؟",
        "هل العملاء يغيرون رأيهم كثيراً؟",
        "هل أسعار القائمة محدّثة؟",
        "راجع أسباب الإلغاء لكل كاشير",
      ],
      en: [
        "Is cashier making entry errors?",
        "Are customers changing minds often?",
        "Are menu prices up to date?",
        "Review void reasons per cashier",
      ],
    },
    insufficientDataMessage: {
      ar: "لا تتوفر بيانات إلغاء كافية. أحتاج عدد الإلغاءات مقارنة بعدد الطلبات.",
      en: "Insufficient void data. Need void count compared to order count.",
    },
  },

  inventory_variance: {
    type: "inventory_variance",
    why: {
      ar: "فرق بين المخزون المتوقع والفعلي بعد الجرد",
      en: "Difference between expected and actual inventory after count",
    },
    whatToCheck: {
      ar: [
        "هل تم تسجيل جميع عمليات الاستلام؟",
        "هل هناك هدر غير مسجل؟",
        "هل الوصفات (Recipes) محدّثة؟",
        "راجع حركات الصنف خلال الفترة",
      ],
      en: [
        "Were all purchase receipts recorded?",
        "Is there unrecorded waste?",
        "Are recipes up to date?",
        "Review item transactions for the period",
      ],
    },
    insufficientDataMessage: {
      ar: "لا تتوفر بيانات جرد. أحتاج الكمية المتوقعة والفعلية.",
      en: "No stock count data. Need expected and actual quantities.",
    },
  },
};

/**
 * Detect if user is asking about a suggestion-related topic
 */
export function detectSuggestionType(message: string): SuggestionType | null {
  const lowerMessage = message.toLowerCase();

  const patterns: Record<SuggestionType, string[]> = {
    low_sales: [
      "مبيعات قليلة", "مبيعات منخفضة", "مبيعات أقل", "لماذا المبيعات",
      "low sales", "sales down", "sales decreased", "why sales",
    ],
    high_refunds: [
      "مرتجعات كثيرة", "استرداد عالي", "لماذا المرتجعات", "مرتجعات مرتفعة",
      "high refunds", "many refunds", "refund rate", "why refunds",
    ],
    cash_mismatch: [
      "فرق النقد", "نقص في الدرج", "زيادة في الدرج", "النقد لا يطابق",
      "cash mismatch", "cash short", "cash over", "drawer difference",
    ],
    repeated_voids: [
      "إلغاءات كثيرة", "voids كثير", "لماذا الإلغاء", "إلغاء متكرر",
      "many voids", "repeated voids", "void rate", "why voids",
    ],
    inventory_variance: [
      "فرق المخزون", "نقص مخزون", "فروقات الجرد", "انحراف المخزون",
      "inventory variance", "stock difference", "count variance", "stock short",
    ],
  };

  for (const [type, keywords] of Object.entries(patterns)) {
    if (keywords.some((kw) => lowerMessage.includes(kw))) {
      return type as SuggestionType;
    }
  }

  return null;
}

/**
 * Format a smart suggestion response
 */
export function formatSuggestion(
  type: SuggestionType,
  language: "ar" | "en",
  hasData: boolean = true
): string {
  const suggestion = SUGGESTIONS[type];

  if (!hasData) {
    return suggestion.insufficientDataMessage[language];
  }

  const header = language === "ar" ? "📊 اقتراح (اختياري):" : "📊 Suggestion (optional):";
  const whyLabel = language === "ar" ? "السبب المحتمل:" : "Possible reason:";
  const checkLabel = language === "ar" ? "يمكن التحقق من:" : "Consider checking:";

  const checkItems = suggestion.whatToCheck[language]
    .map((item, i) => `${i + 1}. ${item}`)
    .join("\n");

  const footer =
    language === "ar"
      ? "💡 هذا اقتراح فقط بناءً على البيانات المعروضة"
      : "💡 This is only a suggestion based on displayed data";

  return `${header}\n\n${whyLabel} ${suggestion.why[language]}\n\n${checkLabel}\n${checkItems}\n\n${footer}`;
}

/**
 * Get all available suggestion types
 */
export function getSuggestionTypes(): SuggestionType[] {
  return Object.keys(SUGGESTIONS) as SuggestionType[];
}
