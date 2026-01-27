// Kastana POS Assistant - Intent Resolver
// Enhanced intent classification with mode and confidence
// CRITICAL: UI-first matching takes priority over AI classification
// SMART ROUTING: Provide concise answers, guide to Trainer for depth

import type { AssistantIntent } from "@/lib/assistantScopeGuard";
import type { UIElementMatch } from "@/lib/assistantUIResolver";
import type { ScreenContext } from "@/lib/smartAssistantContext";

export type ResolvedMode = 
  | "help"        // Standard help/how-to guidance
  | "blocked"     // Action is blocked due to state/permissions
  | "training"    // User wants deeper explanation
  | "admin_decision" // Requires admin/owner decision
  | "ui_element"; // Direct UI element explanation (highest priority)

export interface ResolvedIntent {
  intent: AssistantIntent;
  mode: ResolvedMode;
  confidence: number;
  escalateDetail?: boolean; // User asked for more detail
  uiMatch?: UIElementMatch; // UI element match if found
  trainerModule?: string; // If deeper content exists in Trainer
}

// Training escalation patterns
const TRAINING_ESCALATION_PATTERNS = {
  ar: [
    "اشرح أكثر", "تفصيل", "بالتفصيل", "دربني", "علمني",
    "خطوات كاملة", "شرح مفصل", "وضح أكثر", "كيف بالضبط",
    "مثال", "أمثلة", "أريد أتعلم", "فهمني",
  ],
  en: [
    "explain more", "in detail", "detailed", "train me", "teach me",
    "full steps", "detailed explanation", "elaborate", "how exactly",
    "example", "examples", "want to learn", "show me how",
  ],
};

// Topics that have deeper content in Trainer module
const TRAINER_AVAILABLE_TOPICS: Record<string, { ar: string; en: string }> = {
  recipes: { ar: "الوصفات", en: "Recipes" },
  inventory: { ar: "المخزون", en: "Inventory" },
  z_report: { ar: "تقرير Z", en: "Z Report" },
  shift: { ar: "الورديات", en: "Shifts" },
  refund: { ar: "المرتجعات", en: "Refunds" },
  void_order: { ar: "إلغاء الطلبات", en: "Void Orders" },
  hold_order: { ar: "تعليق الطلبات", en: "Hold Orders" },
  merge_orders: { ar: "دمج الطلبات", en: "Merge Orders" },
  kds: { ar: "شاشة المطبخ", en: "Kitchen Display" },
  qr_order: { ar: "طلبات QR", en: "QR Orders" },
  payments: { ar: "المدفوعات", en: "Payments" },
  discounts: { ar: "الخصومات", en: "Discounts" },
};

// Blocked state patterns
const BLOCKED_STATE_PATTERNS = {
  ar: [
    "معطل", "لا يعمل", "مقفل", "غير متاح", "رمادي",
    "لا أستطيع", "ما أقدر", "ما يشتغل", "محظور",
    "الطلب مغلق", "الوردية مغلقة", "shift closed",
  ],
  en: [
    "disabled", "not working", "locked", "unavailable", "greyed out",
    "can't", "cannot", "won't work", "blocked",
    "order closed", "shift closed", "held", "pending",
  ],
};

// Admin decision patterns
const ADMIN_DECISION_PATTERNS = {
  ar: [
    "صلاحية", "صلاحيات", "تفعيل", "إيقاف", "addon",
    "إضافة", "ميزة جديدة", "طلب تفعيل", "مدير النظام",
    "system admin", "owner only", "للمالك فقط",
  ],
  en: [
    "permission", "permissions", "enable", "disable", "addon",
    "add-on", "new feature", "request activation", "system admin",
    "owner only", "admin only", "access control",
  ],
};

/**
 * Resolve intent with mode and confidence
 * CRITICAL: UI-first matching is checked in useAssistantAI hook before this function
 * This function handles secondary intent classification (training, blocked, admin patterns)
 */
export function resolveIntent(
  message: string,
  baseIntent: AssistantIntent,
  context?: { 
    userRole?: string; 
    orderStatus?: string;
    shiftStatus?: string;
    screenContext?: ScreenContext;
  }
): ResolvedIntent {
  const lowerMessage = message.toLowerCase();
  
  // Check for training escalation first
  const wantsTraining = checkPatternMatch(lowerMessage, TRAINING_ESCALATION_PATTERNS);
  if (wantsTraining) {
    return {
      intent: baseIntent,
      mode: "training",
      confidence: 0.9,
      escalateDetail: true,
    };
  }
  
  // Check for blocked state patterns
  const isBlockedQuery = checkPatternMatch(lowerMessage, BLOCKED_STATE_PATTERNS);
  if (isBlockedQuery) {
    return {
      intent: baseIntent === "how_to" ? "why_disabled" : baseIntent,
      mode: "blocked",
      confidence: 0.85,
    };
  }
  
  // Check for admin decision patterns
  const isAdminQuery = checkPatternMatch(lowerMessage, ADMIN_DECISION_PATTERNS);
  if (isAdminQuery || context?.userRole === "system_admin") {
    return {
      intent: baseIntent,
      mode: "admin_decision",
      confidence: 0.8,
    };
  }
  
  // Default to help mode
  return {
    intent: baseIntent,
    mode: "help",
    confidence: 0.7,
  };
}

/**
 * Check if message matches any pattern in the pattern set
 */
function checkPatternMatch(
  message: string, 
  patterns: { ar: string[]; en: string[] }
): boolean {
  const allPatterns = [...patterns.ar, ...patterns.en];
  return allPatterns.some(pattern => message.includes(pattern.toLowerCase()));
}

/**
 * Get mode-specific response prefix
 */
export function getModePrefix(mode: ResolvedMode, language: "ar" | "en"): string {
  const prefixes: Record<ResolvedMode, { ar: string; en: string }> = {
    help: {
      ar: "",
      en: "",
    },
    blocked: {
      ar: "⚠️ هذا الإجراء غير متاح حالياً.\n\n",
      en: "⚠️ This action is currently unavailable.\n\n",
    },
    training: {
      ar: "📚 شرح تفصيلي:\n\n",
      en: "📚 Detailed Explanation:\n\n",
    },
    admin_decision: {
      ar: "🔐 يتطلب صلاحيات إدارية:\n\n",
      en: "🔐 Requires admin permissions:\n\n",
    },
    ui_element: {
      ar: "",
      en: "",
    },
  };
  
  return prefixes[mode][language];
}

/**
 * Get blocked state explanation
 */
export function getBlockedExplanation(
  context: { orderStatus?: string; shiftStatus?: string },
  language: "ar" | "en"
): string | null {
  if (context.shiftStatus === "closed") {
    return language === "ar"
      ? "الوردية مغلقة. يجب فتح وردية جديدة للمتابعة."
      : "Shift is closed. Open a new shift to continue.";
  }
  
  if (context.orderStatus === "paid" || context.orderStatus === "completed") {
    return language === "ar"
      ? "الطلب مدفوع أو مكتمل. لا يمكن تعديله."
      : "Order is paid or completed. Cannot be modified.";
  }
  
  if (context.orderStatus === "cancelled" || context.orderStatus === "void") {
    return language === "ar"
      ? "الطلب ملغي. لا يمكن اتخاذ إجراءات عليه."
      : "Order is cancelled. No actions can be taken.";
  }
  
  return null;
}

/**
 * Determine if response should include audit mention
 */
export function shouldMentionAudit(mode: ResolvedMode): boolean {
  return mode === "blocked" || mode === "admin_decision";
}

/**
 * ARABIC DISAMBIGUATION: وصفة (recipe) vs وصف (description)
 * Critical for correct intent resolution
 */
export function disambiguateArabicRecipe(message: string): "recipe" | "description" | null {
  // Recipe patterns - ends with ة (taa marbuta) or colloquial variants
  const recipePatterns = [
    "وصفة", "وصفه", // formal and colloquial recipe
    "وصفات", // plural recipes
    "مكونات", // ingredients
    "خلطة", "خلطات", // mix/blend
  ];
  
  // Description patterns - no taa marbuta
  const descriptionPatterns = [
    "وصف الصنف",
    "وصف المنتج", 
    "وصف الطبق",
    "اضافة وصف",
    "تعديل وصف",
  ];
  
  const lowerMessage = message;
  
  // Check description first (more specific)
  if (descriptionPatterns.some(p => lowerMessage.includes(p))) {
    return "description";
  }
  
  // Check recipe patterns
  if (recipePatterns.some(p => lowerMessage.includes(p))) {
    return "recipe";
  }
  
  // Standalone "وصف" without ة = description
  if (/وصف(?!ة|ه)/.test(lowerMessage)) {
    return "description";
  }
  
  return null;
}

/**
 * Check if topic has deeper content in Trainer
 */
export function getTrainerModule(topicKey: string): { ar: string; en: string } | null {
  return TRAINER_AVAILABLE_TOPICS[topicKey] || null;
}

/**
 * Generate smart routing suffix for responses
 * Guides user to Trainer when deeper content exists
 */
export function getTrainerRoutingSuffix(
  topicKey: string,
  language: "ar" | "en"
): string | null {
  const module = TRAINER_AVAILABLE_TOPICS[topicKey];
  if (!module) return null;
  
  if (language === "ar") {
    return `\n\n💡 لو حاب تتعمق أكثر:\nالمدرب الذكي ← ${module.ar}`;
  }
  return `\n\n💡 For step-by-step details:\nSmart Trainer → ${module.en}`;
}

/**
 * Check if question is procedural (how-to)
 * Used to skip welcome messages and provide direct answers
 */
export function isProceduralQuestion(message: string): boolean {
  const proceduralPatterns = [
    // Arabic
    "كيف", "طريقة", "خطوات", "اعمل", "افعل", "ارفع", "اضيف", "احذف",
    "اسجل", "افتح", "اغلق", "اطبع", "ارسل", "انقل", "ادمج",
    // English
    "how to", "how do", "how can", "steps to", "way to",
    "add", "delete", "remove", "create", "open", "close", "print", "send",
  ];
  
  const lowerMessage = message.toLowerCase();
  return proceduralPatterns.some(p => lowerMessage.includes(p));
}
