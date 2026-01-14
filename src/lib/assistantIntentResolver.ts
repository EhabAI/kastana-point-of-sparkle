// Kastana POS Assistant - Intent Resolver
// Enhanced intent classification with mode and confidence

import type { AssistantIntent } from "@/lib/assistantScopeGuard";

export type ResolvedMode = 
  | "help"        // Standard help/how-to guidance
  | "blocked"     // Action is blocked due to state/permissions
  | "training"    // User wants deeper explanation
  | "admin_decision"; // Requires admin/owner decision

export interface ResolvedIntent {
  intent: AssistantIntent;
  mode: ResolvedMode;
  confidence: number;
  escalateDetail?: boolean; // User asked for more detail
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
 */
export function resolveIntent(
  message: string,
  baseIntent: AssistantIntent,
  context?: { 
    userRole?: string; 
    orderStatus?: string;
    shiftStatus?: string;
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
