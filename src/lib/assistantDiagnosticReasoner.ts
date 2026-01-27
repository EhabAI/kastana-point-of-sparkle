// Kastana POS Smart Assistant - Diagnostic Reasoning Engine
// CRITICAL: This module enables the assistant to DIAGNOSE before explaining
// It uses system invariants, actions registry, and flow diagnostics
// to understand WHY something isn't working

import {
  SYSTEM_INVARIANTS,
  ACTIONS_REGISTRY,
  SCREENS_REGISTRY,
  FLOW_DIAGNOSTICS,
  type SystemInvariant,
  type ActionEntry,
  type ScreenEntry,
  type FlowDiagnostic,
} from "./assistantKnowledgeArchitecture";

// ============================================
// TYPES
// ============================================

export interface DiagnosticContext {
  // Order state
  orderStatus?: "new" | "open" | "held" | "paid" | "closed" | "voided" | "cancelled" | null;
  orderEmpty?: boolean;
  
  // Shift state
  shiftOpen?: boolean;
  
  // Restaurant state
  restaurantActive?: boolean;
  subscriptionValid?: boolean;
  
  // Module states
  inventoryEnabled?: boolean;
  kdsEnabled?: boolean;
  qrEnabled?: boolean;
  
  // User context
  userRole?: "cashier" | "owner" | "kitchen" | "system_admin" | null;
  currentScreen?: string;
  
  // Action being attempted
  attemptedAction?: string;
}

export interface DiagnosticResult {
  issue: "invariant_violation" | "precondition_unmet" | "flow_broken" | "no_issue" | "unknown";
  blockedBy?: SystemInvariant;
  missingPreconditions?: string[];
  suggestedFlow?: FlowDiagnostic;
  topCauses?: string[]; // TOP 2 most likely causes
  diagnosticQuestion?: { ar: string; en: string };
  explanation: { ar: string; en: string };
  suggestedAction?: { ar: string; en: string };
  confidence: number; // 0-1
}

// ============================================
// ARABIC DIAGNOSTIC PATTERNS
// ============================================

const DIAGNOSTIC_PATTERNS = {
  // "Why isn't X working" patterns
  why_not_working: [
    "ليش ما", "ليش مش", "ما بيشتغل", "مش شغال", "ما راضي", "ما بزبط",
    "لا يعمل", "لا تعمل", "ما اشتغل", "ما اشتغلت", "معطل", "مش راضي",
    "why isn't", "why won't", "not working", "doesn't work", "can't",
  ],
  
  // "Where did X go" patterns
  where_gone: [
    "وين راح", "وين ال", "اختفى", "اختفت", "ما لقيت", "ما شفت",
    "where did", "where is", "disappeared", "can't find", "missing",
  ],
  
  // "Why can't I" patterns
  why_cant: [
    "ليش ما قدرت", "ليش مش قادر", "ما بقدر", "لا أستطيع",
    "why can't i", "cannot", "unable to", "won't let me",
  ],
  
  // Kitchen/KDS specific
  kds_issues: [
    "ما راح على المطبخ", "ما وصل المطبخ", "المطبخ ما شاف",
    "didn't reach kitchen", "not on kds", "kitchen didn't receive",
  ],
  
  // Payment specific
  payment_issues: [
    "زر الدفع", "ما بيدفع", "الدفع مش شغال", "ما بيسكر",
    "pay button", "can't pay", "payment not", "won't close",
  ],
};

// ============================================
// DIAGNOSTIC DETECTION
// ============================================

/**
 * Detect if the user's message is a diagnostic question (asking why something isn't working)
 */
export function isDiagnosticQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  return Object.values(DIAGNOSTIC_PATTERNS).some(patterns =>
    patterns.some(p => lowerMessage.includes(p.toLowerCase()))
  );
}

/**
 * Detect the specific diagnostic category from user message
 */
export function detectDiagnosticCategory(message: string): keyof typeof DIAGNOSTIC_PATTERNS | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [category, patterns] of Object.entries(DIAGNOSTIC_PATTERNS)) {
    if (patterns.some(p => lowerMessage.includes(p.toLowerCase()))) {
      return category as keyof typeof DIAGNOSTIC_PATTERNS;
    }
  }
  
  return null;
}

/**
 * Detect the related flow from user message
 */
export function detectRelatedFlow(message: string): FlowDiagnostic | null {
  const lowerMessage = message.toLowerCase();
  
  // QR → KDS flow
  if (lowerMessage.includes("qr") || lowerMessage.includes("كيو ار") ||
      lowerMessage.includes("المطبخ") || lowerMessage.includes("kds")) {
    if (lowerMessage.includes("ما راح") || lowerMessage.includes("ما وصل") ||
        lowerMessage.includes("didn't") || lowerMessage.includes("not reaching")) {
      return FLOW_DIAGNOSTICS.find(f => f.id === "flow_qr_to_kds") || null;
    }
  }
  
  // Hold → Resume → Payment flow
  if (lowerMessage.includes("معلق") || lowerMessage.includes("held") ||
      lowerMessage.includes("hold") || lowerMessage.includes("تعليق")) {
    if (lowerMessage.includes("دفع") || lowerMessage.includes("pay") ||
        lowerMessage.includes("استئناف") || lowerMessage.includes("resume")) {
      return FLOW_DIAGNOSTICS.find(f => f.id === "flow_hold_resume_payment") || null;
    }
  }
  
  // Payment flow
  if (lowerMessage.includes("دفع") || lowerMessage.includes("pay") ||
      lowerMessage.includes("فاتورة") || lowerMessage.includes("invoice") ||
      lowerMessage.includes("إغلاق") || lowerMessage.includes("close")) {
    return FLOW_DIAGNOSTICS.find(f => f.id === "flow_payment_receipt_zreport") || null;
  }
  
  // Refund flow
  if (lowerMessage.includes("مرتجع") || lowerMessage.includes("refund") ||
      lowerMessage.includes("استرداد") || lowerMessage.includes("return")) {
    return FLOW_DIAGNOSTICS.find(f => f.id === "flow_refund") || null;
  }
  
  // Inventory deduction flow
  if (lowerMessage.includes("مخزون") || lowerMessage.includes("inventory") ||
      lowerMessage.includes("ما نقص") || lowerMessage.includes("didn't deduct")) {
    return FLOW_DIAGNOSTICS.find(f => f.id === "flow_inventory_deduction") || null;
  }
  
  // Shift flow
  if (lowerMessage.includes("وردية") || lowerMessage.includes("shift") ||
      lowerMessage.includes("z report") || lowerMessage.includes("تقرير z")) {
    return FLOW_DIAGNOSTICS.find(f => f.id === "flow_shift_open_close") || null;
  }
  
  return null;
}

// ============================================
// INVARIANT CHECKING
// ============================================

/**
 * Check which system invariants are currently violated based on context
 */
export function checkViolatedInvariants(context: DiagnosticContext): SystemInvariant[] {
  const violations: SystemInvariant[] = [];
  
  for (const invariant of SYSTEM_INVARIANTS) {
    const isViolated = checkInvariantViolation(invariant, context);
    if (isViolated) {
      violations.push(invariant);
    }
  }
  
  return violations;
}

/**
 * Check if a specific invariant is violated
 */
function checkInvariantViolation(invariant: SystemInvariant, context: DiagnosticContext): boolean {
  switch (invariant.id) {
    case "inv_order_hold_no_pay":
      return context.orderStatus === "held" && context.attemptedAction === "pay";
    
    case "inv_order_paid_immutable":
      return (context.orderStatus === "paid" || context.orderStatus === "closed") &&
             (context.attemptedAction === "edit" || context.attemptedAction === "add_item");
    
    case "inv_order_empty_no_pay":
      return context.orderEmpty === true && context.attemptedAction === "pay";
    
    case "inv_payment_shift_required":
      return context.shiftOpen === false && context.attemptedAction === "pay";
    
    case "inv_shift_one_active":
      return context.shiftOpen === true && context.attemptedAction === "open_shift";
    
    case "inv_shift_close_open_orders":
      // Would need open orders count - simplified check
      return false;
    
    case "inv_inventory_module_check":
      return context.inventoryEnabled === false && 
             (context.attemptedAction === "add_recipe" || context.attemptedAction === "inventory_deduction");
    
    case "inv_kds_module_check":
      return context.kdsEnabled === false && context.attemptedAction === "send_to_kitchen";
    
    case "inv_qr_module_check":
      return context.qrEnabled === false && context.attemptedAction === "accept_qr_order";
    
    case "inv_restaurant_inactive":
      return context.restaurantActive === false;
    
    case "inv_subscription_expired":
      return context.subscriptionValid === false;
    
    default:
      return false;
  }
}

/**
 * Get the blocking invariant for a specific action attempt
 */
export function getBlockingInvariantForAction(
  actionId: string,
  context: DiagnosticContext
): SystemInvariant | null {
  const action = ACTIONS_REGISTRY.find(a => a.id === actionId);
  if (!action) return null;
  
  // Check related invariants
  for (const invId of action.related_invariants) {
    const invariant = SYSTEM_INVARIANTS.find(i => i.id === invId);
    if (invariant && checkInvariantViolation(invariant, context)) {
      return invariant;
    }
  }
  
  return null;
}

// ============================================
// DIAGNOSTIC RESPONSE GENERATION
// ============================================

/**
 * Generate a diagnostic response for a user's problem
 */
export function generateDiagnosticResponse(
  message: string,
  context: DiagnosticContext,
  language: "ar" | "en"
): DiagnosticResult {
  // Step 1: Check for invariant violations first
  const violations = checkViolatedInvariants(context);
  
  if (violations.length > 0) {
    // Find the most relevant blocking invariant
    const blocking = violations.find(v => v.severity === "blocking");
    
    if (blocking) {
      return {
        issue: "invariant_violation",
        blockedBy: blocking,
        explanation: blocking.rule,
        suggestedAction: getSuggestedActionForInvariant(blocking.id, language),
        confidence: 1.0,
      };
    }
  }
  
  // Step 2: Detect related flow and provide TOP 2 causes + 1 confirmation question
  const relatedFlow = detectRelatedFlow(message);
  
  if (relatedFlow) {
    // Get TOP 2 most likely causes
    const cause1 = relatedFlow.most_likely_causes[language][0];
    const cause2 = relatedFlow.most_likely_causes[language][1] || null;
    
    // Get ONE confirmation question (the most discriminating one)
    const confirmationQuestion = relatedFlow.diagnostic_questions[language][0];
    
    return {
      issue: "flow_broken",
      suggestedFlow: relatedFlow,
      topCauses: cause2 
        ? [cause1, cause2] 
        : [cause1],
      diagnosticQuestion: {
        ar: relatedFlow.diagnostic_questions.ar[0],
        en: relatedFlow.diagnostic_questions.en[0],
      },
      explanation: {
        ar: cause2 
          ? `أغلب سببين:\n1️⃣ ${relatedFlow.most_likely_causes.ar[0]}\n2️⃣ ${relatedFlow.most_likely_causes.ar[1]}`
          : `السبب المحتمل: ${relatedFlow.most_likely_causes.ar[0]}`,
        en: cause2
          ? `Most likely causes:\n1️⃣ ${relatedFlow.most_likely_causes.en[0]}\n2️⃣ ${relatedFlow.most_likely_causes.en[1]}`
          : `Likely cause: ${relatedFlow.most_likely_causes.en[0]}`,
      },
      suggestedAction: undefined, // Will be determined after confirmation
      confidence: 0.85,
    };
  }
  
  // Step 3: Detect from screen confusions
  const screenConfusion = detectScreenConfusion(message, context.currentScreen || "");
  
  if (screenConfusion) {
    return {
      issue: "precondition_unmet",
      explanation: screenConfusion.explanation,
      suggestedAction: screenConfusion.suggestion,
      confidence: 0.7,
    };
  }
  
  // Step 4: Unknown issue - ask one diagnostic question
  return {
    issue: "unknown",
    explanation: {
      ar: "أحتاج معلومات إضافية لتشخيص المشكلة.",
      en: "I need more information to diagnose the issue.",
    },
    diagnosticQuestion: getGenericDiagnosticQuestion(message, language),
    confidence: 0.3,
  };
}

/**
 * Get suggested action for resolving an invariant violation
 */
function getSuggestedActionForInvariant(
  invariantId: string,
  language: "ar" | "en"
): { ar: string; en: string } {
  const actions: Record<string, { ar: string; en: string }> = {
    inv_order_hold_no_pay: {
      ar: "اضغط على 'الطلبات المعلقة' ثم 'استئناف' للطلب قبل الدفع.",
      en: "Click 'Held Orders' then 'Resume' before paying.",
    },
    inv_order_paid_immutable: {
      ar: "استخدم 'مرتجع' من الطلبات الأخيرة لتعديل طلب مغلق.",
      en: "Use 'Refund' from recent orders to modify a closed order.",
    },
    inv_order_empty_no_pay: {
      ar: "أضف صنفاً واحداً على الأقل للطلب قبل الدفع.",
      en: "Add at least one item to the order before paying.",
    },
    inv_payment_shift_required: {
      ar: "افتح وردية جديدة من زر 'فتح وردية' في الأعلى.",
      en: "Open a new shift from the 'Open Shift' button at the top.",
    },
    inv_shift_one_active: {
      ar: "أغلق الوردية الحالية أولاً قبل فتح وردية جديدة.",
      en: "Close the current shift first before opening a new one.",
    },
    inv_inventory_module_check: {
      ar: "فعّل المخزون من الإعدادات → الإضافات → المخزون.",
      en: "Enable inventory from Settings → Add-ons → Inventory.",
    },
    inv_kds_module_check: {
      ar: "فعّل شاشة المطبخ (KDS) من الإعدادات → الإضافات.",
      en: "Enable Kitchen Display (KDS) from Settings → Add-ons.",
    },
    inv_qr_module_check: {
      ar: "فعّل طلبات QR من الإعدادات → الإضافات.",
      en: "Enable QR Orders from Settings → Add-ons.",
    },
    inv_restaurant_inactive: {
      ar: "المطعم غير نشط. تواصل مع مدير النظام لتفعيله.",
      en: "Restaurant is inactive. Contact system admin to activate it.",
    },
    inv_subscription_expired: {
      ar: "الاشتراك منتهي. تواصل مع الإدارة لتجديده.",
      en: "Subscription expired. Contact admin for renewal.",
    },
  };
  
  return actions[invariantId] || {
    ar: "تحقق من الإعدادات أو تواصل مع الدعم.",
    en: "Check settings or contact support.",
  };
}

/**
 * Detect common screen confusions
 */
function detectScreenConfusion(
  message: string,
  currentScreen: string
): { explanation: { ar: string; en: string }; suggestion: { ar: string; en: string } } | null {
  const screen = SCREENS_REGISTRY.find(s => s.id === currentScreen || s.route === currentScreen);
  if (!screen) return null;
  
  const lowerMessage = message.toLowerCase();
  
  // Check if the message matches any common confusion
  for (const confusion of screen.common_confusions.ar) {
    if (lowerMessage.includes(confusion.substring(0, 10).toLowerCase())) {
      // Found a matching confusion - return guidance
      return {
        explanation: {
          ar: `هذا سؤال شائع في ${screen.screen_name.ar}.`,
          en: `This is a common question on ${screen.screen_name.en}.`,
        },
        suggestion: {
          ar: "تحقق من حالة الطلب والوردية.",
          en: "Check order and shift status.",
        },
      };
    }
  }
  
  return null;
}

/**
 * Get a generic diagnostic question when we can't determine the specific issue
 */
function getGenericDiagnosticQuestion(
  message: string,
  language: "ar" | "en"
): { ar: string; en: string } {
  const lowerMessage = message.toLowerCase();
  
  // Payment-related
  if (lowerMessage.includes("دفع") || lowerMessage.includes("pay")) {
    return {
      ar: "هل الوردية مفتوحة حالياً؟",
      en: "Is the shift currently open?",
    };
  }
  
  // KDS-related
  if (lowerMessage.includes("مطبخ") || lowerMessage.includes("kitchen") || lowerMessage.includes("kds")) {
    return {
      ar: "هل شاشة المطبخ (KDS) مفعلة في الإعدادات؟",
      en: "Is Kitchen Display (KDS) enabled in settings?",
    };
  }
  
  // Order-related
  if (lowerMessage.includes("طلب") || lowerMessage.includes("order")) {
    return {
      ar: "ما هي حالة الطلب الحالية؟ (مفتوح/معلق/مغلق)",
      en: "What is the current order status? (open/held/closed)",
    };
  }
  
  // Default
  return {
    ar: "هل يمكنك وصف الخطوة التي كنت تحاول القيام بها؟",
    en: "Can you describe the step you were trying to perform?",
  };
}

// ============================================
// FORMAT DIAGNOSTIC RESPONSE
// ============================================

/**
 * Format a diagnostic result into a user-friendly response
 */
export function formatDiagnosticResponse(
  result: DiagnosticResult,
  language: "ar" | "en"
): string {
  const parts: string[] = [];
  
  // For flow-based diagnostics, use the TOP 2 causes format
  if (result.issue === "flow_broken" && result.topCauses) {
    // No header - jump straight to causes
    parts.push(result.explanation[language]);
    
    // Add ONE confirmation question
    if (result.diagnosticQuestion) {
      parts.push("");
      parts.push(result.diagnosticQuestion[language]);
    }
    
    return parts.join("\n");
  }
  
  // For invariant violations, be direct and clear
  if (result.issue === "invariant_violation") {
    parts.push(language === "ar" 
      ? "🔍 السبب:" 
      : "🔍 Cause:");
    parts.push(result.explanation[language]);
    
    if (result.suggestedAction) {
      parts.push("");
      parts.push(language === "ar" ? "✅ الحل:" : "✅ Solution:");
      parts.push(result.suggestedAction[language]);
    }
    
    return parts.join("\n");
  }
  
  // Default format for other cases
  if (result.confidence >= 0.5) {
    parts.push(language === "ar"
      ? "💡 السبب المحتمل:"
      : "💡 Likely cause:");
  }
  
  parts.push(result.explanation[language]);
  
  if (result.suggestedAction) {
    parts.push("");
    parts.push(language === "ar" ? "✅ الحل:" : "✅ Solution:");
    parts.push(result.suggestedAction[language]);
  }
  
  // Add confirmation question if we're not confident
  if (result.confidence < 0.8 && result.diagnosticQuestion) {
    parts.push("");
    parts.push(result.diagnosticQuestion[language]);
  }
  
  return parts.join("\n");
}

/**
 * Get invariant by ID
 */
export function getInvariantById(id: string): SystemInvariant | undefined {
  return SYSTEM_INVARIANTS.find(inv => inv.id === id);
}

/**
 * Get action by ID
 */
export function getActionById(id: string): ActionEntry | undefined {
  return ACTIONS_REGISTRY.find(action => action.id === id);
}

/**
 * Get screen by ID or route
 */
export function getScreenById(idOrRoute: string): ScreenEntry | undefined {
  return SCREENS_REGISTRY.find(
    screen => screen.id === idOrRoute || screen.route === idOrRoute
  );
}

/**
 * Get flow diagnostic by ID
 */
export function getFlowById(id: string): FlowDiagnostic | undefined {
  return FLOW_DIAGNOSTICS.find(flow => flow.id === id);
}
