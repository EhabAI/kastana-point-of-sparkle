// Kastana POS Smart Assistant - Session Memory
// Implements short-term session memory for contextual follow-ups
// CRITICAL: Memory is session-only, not persisted

import type { ScreenContext } from "@/lib/smartAssistantContext";

// ============================================
// TYPES
// ============================================

export type EntityType = 
  | "menu_item"
  | "order"
  | "shift"
  | "recipe"
  | "inventory_item"
  | "table"
  | "payment"
  | "discount"
  | "refund"
  | "z_report"
  | "branch"
  | "staff"
  | "qr_order"
  | null;

export type IntentType =
  | "how_to"
  | "what_is"
  | "why"
  | "troubleshoot"
  | "recipe"
  | "payment"
  | "discount"
  | "refund"
  | "shift"
  | "inventory"
  | "kds"
  | "qr_order"
  | "z_report"
  | "general"
  | null;

export interface SessionMemory {
  lastIntent: IntentType;
  lastEntity: EntityType;
  lastTopicId: string | null;
  lastTopicName: { ar: string; en: string } | null;
  questionCount: number;
  timestamp: number;
}

export interface FollowUpSuggestion {
  text: { ar: string; en: string };
  topicId: string;
}

// ============================================
// SESSION STATE (In-memory only)
// ============================================

let sessionMemory: SessionMemory = {
  lastIntent: null,
  lastEntity: null,
  lastTopicId: null,
  lastTopicName: null,
  questionCount: 0,
  timestamp: Date.now(),
};

// ============================================
// MEMORY MANAGEMENT
// ============================================

/**
 * Update session memory with new intent and entity
 */
export function updateSessionMemory(
  intent: IntentType,
  entity: EntityType,
  topicId?: string | null,
  topicName?: { ar: string; en: string } | null
): void {
  sessionMemory = {
    lastIntent: intent,
    lastEntity: entity,
    lastTopicId: topicId || sessionMemory.lastTopicId,
    lastTopicName: topicName || sessionMemory.lastTopicName,
    questionCount: sessionMemory.questionCount + 1,
    timestamp: Date.now(),
  };
}

/**
 * Get current session memory
 */
export function getSessionMemory(): SessionMemory {
  return { ...sessionMemory };
}

/**
 * Reset session memory (e.g., on logout or page refresh)
 */
export function resetSessionMemory(): void {
  sessionMemory = {
    lastIntent: null,
    lastEntity: null,
    lastTopicId: null,
    lastTopicName: null,
    questionCount: 0,
    timestamp: Date.now(),
  };
}

// ============================================
// INTENT DETECTION FROM MESSAGE
// ============================================

/**
 * Detect intent type from user message
 */
export function detectIntentFromMessage(message: string): IntentType {
  const lowerMessage = message.toLowerCase();
  
  // How-to patterns
  const howToPatterns = [
    "كيف", "طريقة", "خطوات", "اعمل", "افعل", "how to", "how do", "how can", "steps",
  ];
  if (howToPatterns.some(p => lowerMessage.includes(p))) {
    // Determine specific how-to type
    if (/وصفة|وصفه|recipe|مكونات|خلطة/.test(lowerMessage)) return "recipe";
    if (/دفع|payment|pay|فاتورة/.test(lowerMessage)) return "payment";
    if (/خصم|discount/.test(lowerMessage)) return "discount";
    if (/مرتجع|refund|استرداد/.test(lowerMessage)) return "refund";
    if (/وردية|shift|شفت/.test(lowerMessage)) return "shift";
    if (/مخزون|inventory|جرد/.test(lowerMessage)) return "inventory";
    if (/مطبخ|kitchen|kds/.test(lowerMessage)) return "kds";
    if (/qr|كيو ار/.test(lowerMessage)) return "qr_order";
    if (/z report|تقرير z|زد/.test(lowerMessage)) return "z_report";
    return "how_to";
  }
  
  // What-is patterns
  const whatIsPatterns = [
    "شو هو", "ما هو", "ايش هو", "وش هو", "what is", "what's", "explain",
  ];
  if (whatIsPatterns.some(p => lowerMessage.includes(p))) return "what_is";
  
  // Why patterns
  const whyPatterns = [
    "ليش", "لماذا", "السبب", "why", "reason",
  ];
  if (whyPatterns.some(p => lowerMessage.includes(p))) return "why";
  
  // Troubleshoot patterns
  const troubleshootPatterns = [
    "مشكلة", "خطأ", "error", "not working", "doesn't work", "ما يشتغل", "مو شغال",
  ];
  if (troubleshootPatterns.some(p => lowerMessage.includes(p))) return "troubleshoot";
  
  // Specific topic patterns
  if (/وصفة|وصفه|recipe|مكونات|خلطة/.test(lowerMessage)) return "recipe";
  if (/دفع|payment|pay/.test(lowerMessage)) return "payment";
  if (/خصم|discount/.test(lowerMessage)) return "discount";
  if (/مرتجع|refund/.test(lowerMessage)) return "refund";
  if (/وردية|shift/.test(lowerMessage)) return "shift";
  if (/مخزون|inventory/.test(lowerMessage)) return "inventory";
  if (/z report|تقرير z/.test(lowerMessage)) return "z_report";
  
  return "general";
}

/**
 * Detect entity type from user message
 */
export function detectEntityFromMessage(message: string): EntityType {
  const lowerMessage = message.toLowerCase();
  
  if (/وصفة|وصفه|recipe|مكونات|خلطة/.test(lowerMessage)) return "recipe";
  if (/صنف|منتج|item|product|طبق/.test(lowerMessage)) return "menu_item";
  if (/طلب|order|فاتورة/.test(lowerMessage)) return "order";
  if (/وردية|shift/.test(lowerMessage)) return "shift";
  if (/مخزون|inventory|مادة خام/.test(lowerMessage)) return "inventory_item";
  if (/طاولة|table/.test(lowerMessage)) return "table";
  if (/دفع|payment/.test(lowerMessage)) return "payment";
  if (/خصم|discount/.test(lowerMessage)) return "discount";
  if (/مرتجع|refund/.test(lowerMessage)) return "refund";
  if (/z report|تقرير z/.test(lowerMessage)) return "z_report";
  if (/فرع|branch/.test(lowerMessage)) return "branch";
  if (/موظف|staff|كاشير/.test(lowerMessage)) return "staff";
  if (/qr|كيو ار/.test(lowerMessage)) return "qr_order";
  
  return null;
}

// ============================================
// FOLLOW-UP DETECTION (CONTEXT CONTINUATION)
// ============================================

/**
 * Check if message is a context-less follow-up that should use session memory
 */
export function isContextlessFollowUp(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();
  
  // Short follow-up phrases
  const followUpPhrases = [
    // Arabic
    "طيب", "طيب الكمية", "وكمان", "وبعدين", "والخطوة التالية",
    "طيب والسعر", "طيب والتكلفة", "كمان", "بعد", "والباقي",
    "شو بعد", "ايش بعد", "وش بعد", "والكمية", "والوحدة",
    // English
    "and then", "what next", "next step", "what about", "and the",
    "ok and", "okay and", "also", "what else",
  ];
  
  // Check for short phrases or questions without explicit topic
  if (followUpPhrases.some(p => lowerMessage.includes(p))) return true;
  
  // Very short messages (1-3 words) without a clear new topic
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount <= 3) {
    // Check it's not a new topic keyword
    const newTopicKeywords = [
      "وصفة", "مخزون", "وردية", "طلب", "دفع", "خصم", "مرتجع",
      "recipe", "inventory", "shift", "order", "payment", "discount", "refund",
    ];
    if (!newTopicKeywords.some(k => lowerMessage.includes(k))) {
      return true;
    }
  }
  
  return false;
}

/**
 * Build context-aware response prefix for follow-up questions
 */
export function buildFollowUpPrefix(language: "ar" | "en"): string | null {
  const memory = getSessionMemory();
  
  if (!memory.lastTopicName) return null;
  
  if (language === "ar") {
    return `بخصوص ${memory.lastTopicName.ar}:\n\n`;
  }
  return `Regarding ${memory.lastTopicName.en}:\n\n`;
}

// ============================================
// SMART FOLLOW-UP SUGGESTIONS
// ============================================

/**
 * Get contextual follow-up suggestions based on current topic
 * Maximum 2 suggestions, plain text, optional
 */
export function getFollowUpSuggestions(
  topicId: string,
  language: "ar" | "en"
): FollowUpSuggestion[] {
  const suggestionMap: Record<string, FollowUpSuggestion[]> = {
    recipes: [
      {
        text: { ar: "كيف أربط الوصفة بالخصم التلقائي؟", en: "How do I link recipe to auto-deduction?" },
        topicId: "recipe_deduction",
      },
      {
        text: { ar: "ما هي الأخطاء الشائعة في الوصفات؟", en: "What are common recipe mistakes?" },
        topicId: "recipe_mistakes",
      },
    ],
    inventory_log: [
      {
        text: { ar: "كيف أعالج فروقات الجرد؟", en: "How to handle inventory variance?" },
        topicId: "variance",
      },
      {
        text: { ar: "كيف أضيف مادة خام جديدة؟", en: "How to add a new raw material?" },
        topicId: "inventory_add",
      },
    ],
    z_report: [
      {
        text: { ar: "ما الفرق بين Gross و Net؟", en: "What's the difference between Gross and Net?" },
        topicId: "gross_net",
      },
      {
        text: { ar: "لماذا يوجد فرق في الصندوق؟", en: "Why is there a drawer difference?" },
        topicId: "drawer_difference",
      },
    ],
    shift: [
      {
        text: { ar: "كيف أفتح وردية جديدة؟", en: "How to open a new shift?" },
        topicId: "shift_open",
      },
      {
        text: { ar: "ماذا لو نسيت إغلاق الوردية؟", en: "What if I forgot to close the shift?" },
        topicId: "shift_forgot",
      },
    ],
    refund: [
      {
        text: { ar: "متى أستخدم الإلغاء بدل المرتجع؟", en: "When to use void instead of refund?" },
        topicId: "void_vs_refund",
      },
      {
        text: { ar: "هل المرتجع يعيد المخزون؟", en: "Does refund restore inventory?" },
        topicId: "refund_inventory",
      },
    ],
    payment: [
      {
        text: { ar: "كيف أقسم الدفع على طريقتين؟", en: "How to split payment between methods?" },
        topicId: "split_payment",
      },
      {
        text: { ar: "ماذا لو فشل الدفع؟", en: "What if payment fails?" },
        topicId: "payment_failed",
      },
    ],
    discount: [
      {
        text: { ar: "ما هي أنواع الخصومات المتاحة؟", en: "What discount types are available?" },
        topicId: "discount_types",
      },
      {
        text: { ar: "هل يمكن إلغاء الخصم بعد تطبيقه؟", en: "Can I remove a discount after applying?" },
        topicId: "discount_remove",
      },
    ],
    qr_pending: [
      {
        text: { ar: "كيف أقبل طلب QR؟", en: "How to accept a QR order?" },
        topicId: "qr_accept",
      },
      {
        text: { ar: "ماذا يحدث بعد قبول طلب QR؟", en: "What happens after accepting QR order?" },
        topicId: "qr_after_accept",
      },
    ],
    kds_status: [
      {
        text: { ar: "كيف أعلم الطلب كجاهز؟", en: "How to mark order as ready?" },
        topicId: "kds_ready",
      },
      {
        text: { ar: "ماذا تعني الألوان في المطبخ؟", en: "What do the colors in KDS mean?" },
        topicId: "kds_colors",
      },
    ],
  };
  
  return suggestionMap[topicId] || [];
}

/**
 * Format follow-up suggestions as plain text
 */
export function formatFollowUpSuggestions(
  suggestions: FollowUpSuggestion[],
  language: "ar" | "en"
): string {
  if (suggestions.length === 0) return "";
  
  const header = language === "ar" ? "هل تحب:" : "Would you like:";
  const lines = suggestions.slice(0, 2).map(s => `• ${s.text[language]}`);
  
  return `\n\n${header}\n${lines.join("\n")}`;
}

// ============================================
// VALUE AWARENESS (WHY-LINES)
// ============================================

/**
 * Get a value/benefit line for a topic
 * Short, business-focused statement about why this matters
 */
export function getValueLine(
  topicId: string,
  language: "ar" | "en"
): string | null {
  const valueLines: Record<string, { ar: string; en: string }> = {
    recipes: {
      ar: "✨ وجود وصفة دقيقة يساعدك على حساب التكلفة وتقليل الهدر.",
      en: "✨ Accurate recipes help you calculate costs and reduce waste.",
    },
    inventory_log: {
      ar: "✨ تتبع المخزون بدقة يمنع نقص المواد ويحسن الربحية.",
      en: "✨ Accurate inventory tracking prevents shortages and improves profitability.",
    },
    z_report: {
      ar: "✨ تقرير Z يساعدك على مطابقة الصندوق واكتشاف الفروقات فوراً.",
      en: "✨ Z Report helps you reconcile the drawer and spot discrepancies instantly.",
    },
    shift: {
      ar: "✨ الورديات المنظمة تضمن محاسبة دقيقة لكل موظف.",
      en: "✨ Organized shifts ensure accurate accountability per employee.",
    },
    refund: {
      ar: "✨ توثيق المرتجعات يحمي من التلاعب ويوفر شفافية مالية.",
      en: "✨ Documented refunds protect against fraud and provide financial transparency.",
    },
    variance: {
      ar: "✨ فهم الفروقات يساعدك على اكتشاف الهدر أو السرقة.",
      en: "✨ Understanding variance helps you detect waste or theft.",
    },
    discount: {
      ar: "✨ الخصومات المحسوبة تحافظ على هامش الربح.",
      en: "✨ Calculated discounts preserve your profit margin.",
    },
    qr_pending: {
      ar: "✨ طلبات QR تقلل الضغط على الكاشير وتسرع الخدمة.",
      en: "✨ QR orders reduce cashier load and speed up service.",
    },
    kds_status: {
      ar: "✨ شاشة المطبخ تضمن عدم نسيان أي طلب وتحسن سرعة التحضير.",
      en: "✨ Kitchen display ensures no order is forgotten and improves prep speed.",
    },
    payment: {
      ar: "✨ طرق الدفع المتنوعة تلبي تفضيلات جميع الزبائن.",
      en: "✨ Diverse payment methods meet all customer preferences.",
    },
  };
  
  return valueLines[topicId]?.[language] || null;
}

// ============================================
// ERROR & GAP AWARENESS
// ============================================

export interface DetectedGap {
  type: "missing_recipe" | "missing_inventory" | "incomplete_setup" | "common_error";
  message: { ar: string; en: string };
  suggestion: { ar: string; en: string };
}

/**
 * Detect common gaps based on context and user role
 * Returns proactive guidance if a gap is detected
 */
export function detectCommonGaps(
  context: {
    topicId: string;
    userRole?: string;
    screenContext?: ScreenContext;
    featureVisibility?: { inventoryEnabled?: boolean; kdsEnabled?: boolean; qrEnabled?: boolean };
  }
): DetectedGap | null {
  const { topicId, userRole, featureVisibility } = context;
  
  // Recipe-related gaps
  if (topicId === "recipes" || topicId === "menu_item") {
    if (featureVisibility?.inventoryEnabled) {
      return {
        type: "missing_recipe",
        message: {
          ar: "لاحظت أنك تسأل عن الوصفات.",
          en: "I notice you're asking about recipes.",
        },
        suggestion: {
          ar: "هل تحتاج مساعدة في إنشاء وصفة جديدة لصنف معين؟",
          en: "Would you like help creating a recipe for a specific item?",
        },
      };
    }
  }
  
  // Inventory-related gaps
  if (topicId === "inventory_log" && userRole === "owner") {
    return {
      type: "incomplete_setup",
      message: {
        ar: "للاستفادة الكاملة من المخزون:",
        en: "To fully benefit from inventory:",
      },
      suggestion: {
        ar: "تأكد من إضافة وصفات لجميع الأصناف لتتبع الخصم التلقائي.",
        en: "Make sure to add recipes for all items to track auto-deduction.",
      },
    };
  }
  
  // QR-related gaps
  if (topicId === "qr_pending" && !featureVisibility?.qrEnabled) {
    return {
      type: "incomplete_setup",
      message: {
        ar: "ميزة طلبات QR غير مفعلة حالياً.",
        en: "QR orders feature is not currently enabled.",
      },
      suggestion: {
        ar: "تواصل مع مدير النظام لتفعيل إضافة QR.",
        en: "Contact System Admin to enable the QR add-on.",
      },
    };
  }
  
  // KDS-related gaps
  if (topicId === "kds_status" && !featureVisibility?.kdsEnabled) {
    return {
      type: "incomplete_setup",
      message: {
        ar: "شاشة المطبخ غير مفعلة حالياً.",
        en: "Kitchen Display is not currently enabled.",
      },
      suggestion: {
        ar: "تواصل مع مدير النظام لتفعيل شاشة المطبخ.",
        en: "Contact System Admin to enable Kitchen Display.",
      },
    };
  }
  
  return null;
}

/**
 * Format detected gap as a proactive message
 */
export function formatGapMessage(
  gap: DetectedGap,
  language: "ar" | "en"
): string {
  return `💡 ${gap.message[language]} ${gap.suggestion[language]}`;
}
