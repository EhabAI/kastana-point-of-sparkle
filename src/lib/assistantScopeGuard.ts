// Kastana POS Assistant Scope Guard
// Read-only guidance only - no actions executed

export type AssistantIntent = 
  | "how_to" 
  | "why_disabled" 
  | "explain_report" 
  | "troubleshooting" 
  | "out_of_scope"
  | "greeting"
  // Report-specific intents
  | "sales_summary"
  | "z_report"
  | "refunds_report"
  | "payments_report"
  | "inventory_variance_explain";

interface ScopeCheckResult {
  isInScope: boolean;
  intent: AssistantIntent;
  confidence: number;
}

// Keywords that indicate Kastana POS-related queries
const KASTANA_KEYWORDS = {
  // Arabic keywords
  ar: [
    // General POS
    "كاشير", "طلب", "طلبات", "فاتورة", "فواتير", "دفع", "نقد", "بطاقة",
    "فيزا", "ماستركارد", "محفظة", "خصم", "ضريبة", "إجمالي", "مبلغ",
    // Menu
    "قائمة", "منيو", "صنف", "أصناف", "فئة", "فئات", "سعر", "أسعار",
    // Orders
    "طاولة", "طاولات", "عميل", "زبون", "استلام", "توصيل", "تيك اواي",
    // Inventory
    "مخزون", "مخازن", "كمية", "وحدة", "استلام", "نقل", "هدر", "جرد",
    // Staff
    "موظف", "موظفين", "كاشير", "مالك", "وردية", "شفت", "فتح", "إغلاق",
    // Reports
    "تقرير", "تقارير", "إحصائيات", "مبيعات", "أرباح", "تكلفة", "هامش",
    // Settings
    "إعدادات", "ضبط", "فرع", "فروع", "مطعم",
    // System
    "kastana", "كاستانا", "نظام", "البرنامج", "التطبيق", "الشاشة",
    // Actions
    "كيف", "لماذا", "أين", "متى", "مشكلة", "خطأ", "لا يعمل", "معطل",
  ],
  // English keywords
  en: [
    // General POS
    "pos", "cashier", "order", "orders", "invoice", "payment", "cash", "card",
    "visa", "mastercard", "wallet", "discount", "tax", "total", "amount",
    // Menu
    "menu", "item", "items", "category", "categories", "price", "prices",
    // Orders
    "table", "tables", "customer", "pickup", "delivery", "takeaway", "dine-in",
    // Inventory
    "inventory", "stock", "quantity", "unit", "receive", "transfer", "waste", "count",
    // Staff
    "staff", "employee", "cashier", "owner", "shift", "open", "close",
    // Reports
    "report", "reports", "statistics", "sales", "profit", "cost", "margin", "cogs",
    // Settings
    "settings", "branch", "branches", "restaurant",
    // System
    "kastana", "system", "app", "application", "screen",
    // Actions
    "how", "why", "where", "when", "problem", "error", "not working", "disabled",
  ],
};

// Intent detection patterns
const INTENT_PATTERNS = {
  // Report-specific intents (check first for specificity)
  sales_summary: {
    ar: ["ملخص المبيعات", "تقرير المبيعات", "مبيعات اليوم", "إجمالي المبيعات", "كم بعنا", "مجموع المبيعات"],
    en: ["sales summary", "sales report", "today sales", "total sales", "how much sold", "sales overview"],
  },
  z_report: {
    ar: ["تقرير زد", "تقرير z", "z report", "تقرير الوردية", "تقرير الشفت", "تقرير نهاية اليوم"],
    en: ["z report", "z-report", "shift report", "end of day report", "daily summary", "shift summary"],
  },
  refunds_report: {
    ar: ["تقرير المرتجعات", "تقرير الاسترداد", "كم المرتجع", "مجموع المرتجعات", "تقرير الإرجاع"],
    en: ["refunds report", "refund summary", "returns report", "how much refunded", "refund total"],
  },
  payments_report: {
    ar: ["تقرير المدفوعات", "طرق الدفع", "تقرير الدفع", "كم نقد", "كم بطاقات", "توزيع الدفع"],
    en: ["payments report", "payment methods", "payment breakdown", "how much cash", "how much card", "payment summary"],
  },
  inventory_variance_explain: {
    ar: ["فرق المخزون", "انحراف المخزون", "فروقات الجرد", "نقص المخزون", "زيادة المخزون", "variance"],
    en: ["inventory variance", "stock variance", "count difference", "inventory discrepancy", "stock difference"],
  },
  // General intents
  how_to: {
    ar: ["كيف", "طريقة", "خطوات", "أريد أن", "ممكن أ", "اشلون", "شلون"],
    en: ["how to", "how do i", "how can i", "steps to", "way to", "guide"],
  },
  why_disabled: {
    ar: ["لماذا معطل", "ليش مو شغال", "ليش ما يشتغل", "غير متاح", "لا يعمل", "معطل", "مقفل"],
    en: ["why disabled", "why can't", "not available", "greyed out", "can't click", "disabled", "locked"],
  },
  explain_report: {
    ar: ["اشرح تقرير", "ما معنى", "وضح لي", "ماذا يعني", "التقرير يوضح", "أرقام"],
    en: ["explain report", "what does", "meaning of", "understand report", "numbers mean", "show me"],
  },
  troubleshooting: {
    ar: ["مشكلة", "خطأ", "لا يعمل", "توقف", "علق", "ما يفتح", "ما يحفظ"],
    en: ["problem", "error", "not working", "stuck", "frozen", "won't open", "won't save", "issue", "bug"],
  },
  greeting: {
    ar: ["مرحبا", "السلام", "أهلا", "صباح", "مساء", "هلا"],
    en: ["hello", "hi", "hey", "good morning", "good evening", "greetings"],
  },
};

// Out-of-scope patterns (things the assistant should NOT help with)
const OUT_OF_SCOPE_PATTERNS = {
  ar: [
    "طبخ", "وصفة", "وصفات", "مكونات", "طبق", 
    "أخبار", "رياضة", "سياسة", "طقس",
    "برمجة", "كود", "javascript", "python",
    "أغنية", "فيلم", "مسلسل",
    "سفر", "فندق", "حجز رحلة",
    "صحة", "دواء", "علاج",
  ],
  en: [
    "recipe", "cook", "cooking", "ingredients",
    "news", "sports", "politics", "weather",
    "code", "programming", "javascript", "python",
    "song", "movie", "series",
    "travel", "hotel", "book flight",
    "health", "medicine", "treatment",
  ],
};

/**
 * Check if a message is within Kastana POS scope
 */
export function checkScope(message: string): ScopeCheckResult {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check for greetings first
  const isGreeting = [...INTENT_PATTERNS.greeting.ar, ...INTENT_PATTERNS.greeting.en]
    .some(pattern => lowerMessage.includes(pattern.toLowerCase()));
  
  if (isGreeting && lowerMessage.length < 30) {
    return { isInScope: true, intent: "greeting", confidence: 1.0 };
  }

  // Check for out-of-scope patterns
  const outOfScopeMatch = [...OUT_OF_SCOPE_PATTERNS.ar, ...OUT_OF_SCOPE_PATTERNS.en]
    .some(pattern => lowerMessage.includes(pattern.toLowerCase()));
  
  // Check for Kastana-related keywords
  const kastanaKeywordMatch = [...KASTANA_KEYWORDS.ar, ...KASTANA_KEYWORDS.en]
    .filter(keyword => lowerMessage.includes(keyword.toLowerCase()));
  
  const hasKastanaContext = kastanaKeywordMatch.length > 0;
  
  // If out-of-scope and no Kastana context, reject
  if (outOfScopeMatch && !hasKastanaContext) {
    return { isInScope: false, intent: "out_of_scope", confidence: 0.9 };
  }
  
  // If no Kastana context at all and message is long, likely out of scope
  if (!hasKastanaContext && lowerMessage.length > 20) {
    return { isInScope: false, intent: "out_of_scope", confidence: 0.7 };
  }

  // Detect intent
  const intent = detectIntent(lowerMessage);
  
  return {
    isInScope: true,
    intent,
    confidence: hasKastanaContext ? 0.95 : 0.6,
  };
}

/**
 * Detect the user's intent from their message
 */
function detectIntent(message: string): AssistantIntent {
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
    const allPatterns = [...patterns.ar, ...patterns.en];
    if (allPatterns.some(pattern => message.includes(pattern.toLowerCase()))) {
      return intent as AssistantIntent;
    }
  }
  return "how_to"; // Default intent
}

/**
 * Get the out-of-scope rejection message
 */
export function getOutOfScopeMessage(language: "ar" | "en"): string {
  if (language === "ar") {
    return "أنا مخصص لمساعدتك داخل نظام Kastana POS فقط. يمكنني مساعدتك في:\n\n• شرح كيفية استخدام النظام\n• توضيح التقارير والإحصائيات\n• حل المشاكل التقنية\n• شرح سبب تعطل بعض الميزات\n\nكيف يمكنني مساعدتك في نظام Kastana؟";
  }
  return "I'm designed to help you only within the Kastana POS system. I can assist you with:\n\n• Explaining how to use the system\n• Clarifying reports and statistics\n• Troubleshooting technical issues\n• Explaining why certain features are disabled\n\nHow can I help you with Kastana?";
}

/**
 * Get a greeting response
 */
export function getGreetingMessage(language: "ar" | "en"): string {
  if (language === "ar") {
    return "مرحباً! أنا مساعد Kastana الذكي. كيف يمكنني مساعدتك اليوم في نظام نقاط البيع؟\n\nيمكنني مساعدتك في:\n• شرح كيفية تنفيذ المهام\n• توضيح التقارير\n• حل المشاكل\n• شرح الميزات المعطلة";
  }
  return "Hello! I'm Kastana AI Assistant. How can I help you today with the POS system?\n\nI can help you with:\n• Explaining how to perform tasks\n• Clarifying reports\n• Troubleshooting issues\n• Explaining disabled features";
}

/**
 * Get intent-specific prompt context for the AI
 */
export function getIntentContext(intent: AssistantIntent): string {
  switch (intent) {
    case "how_to":
      return "User is asking for step-by-step guidance. Provide clear, numbered steps.";
    case "why_disabled":
      return "User is asking why a feature is disabled. Explain possible reasons (permissions, shift status, missing data, etc.).";
    case "explain_report":
      return "User wants to understand a report. Explain metrics and what they mean for their business.";
    case "troubleshooting":
      return "User has a problem. Ask clarifying questions and suggest solutions.";
    case "greeting":
      return "User is greeting. Respond warmly and offer to help.";
    // Report-specific intents
    case "sales_summary":
      return "User wants to understand sales figures. Explain what the displayed numbers mean - no recalculation.";
    case "z_report":
      return "User wants to understand Z Report. Explain sections and what changed vs expectations.";
    case "refunds_report":
      return "User wants to understand refunds. Explain refund types and impact on net sales.";
    case "payments_report":
      return "User wants to understand payment breakdown. Explain distribution across payment methods.";
    case "inventory_variance_explain":
      return "User wants to understand inventory variance. Explain difference between expected and actual counts.";
    default:
      return "Provide helpful guidance about Kastana POS.";
  }
}
