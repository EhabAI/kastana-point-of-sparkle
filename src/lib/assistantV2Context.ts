// Kastana POS Assistant - V2 Controlled Hybrid Mode
// Context Enrichment & Smart Response System
// All V1 rules remain active - V2 is additive only

import type { ScreenContext } from "@/lib/smartAssistantContext";
import type { FeatureVisibility } from "@/lib/assistantScreenLock";
import { getScreenUIElements } from "@/lib/assistantUIResolver";
import { getScreenName, getScreenPrimaryElement, SCREEN_BOUNDARIES } from "@/lib/assistantScreenLock";

/**
 * V2 System Context - Explicit, READ-ONLY context
 * The assistant MUST trust this context and NEVER infer it
 */
export interface V2SystemContext {
  screen_id: ScreenContext;
  visible_ui_elements: string[];  // Element IDs only
  user_role: "owner" | "cashier" | "kitchen" | "system_admin" | null;
  user_display_name?: string;
  system_state: {
    shift_open: boolean;
    restaurant_active: boolean;
    has_open_orders: boolean;
  };
  enabled_features: {
    inventory: boolean;
    kds: boolean;
    discounts: boolean;
  };
  language: "ar" | "en";
  // Branch context for Owner (all responses scoped to selected branch)
  branch_context?: {
    branch_id: string | null;
    branch_name: string | null;
    restaurant_name: string | null;
  };
}

/**
 * V2 Soft Intent Types - Classify QUESTION TYPE only, not destination
 * AI may NOT redirect screens or interpret navigation intent
 */
export type V2SoftIntent = 
  | "explanation"     // User wants to understand something
  | "clarification"   // User wants more detail on a topic
  | "light_analysis"  // User wants simple reasoning about visible data
  | "practical_advice"; // User wants actionable guidance

/**
 * V2 Response Priority Order (UI-First):
 * 1. Exact UI keyword match on current screen
 * 2. Most important visible UI element
 * 3. Screen-level explanation
 */
export type V2ResponsePriority = 
  | "ui_exact_match"
  | "primary_element"
  | "screen_level";

/**
 * V2 Smart Suggestion - Follow-up that requires NO action
 */
export interface V2SmartSuggestion {
  text: { ar: string; en: string };
  elementId?: string;  // Must be in visible_ui_elements
}

/**
 * Build V2 System Context from available data
 */
export function buildV2Context(
  screenContext: ScreenContext,
  userRole: string | null,
  displayName?: string,
  shiftOpen: boolean = false,
  restaurantActive: boolean = true,
  hasOpenOrders: boolean = false,
  featureVisibility?: FeatureVisibility,
  language: "ar" | "en" = "ar",
  branchContext?: { branchId?: string; branchName?: string; restaurantName?: string }
): V2SystemContext {
  // Get visible UI elements for this screen
  const uiElements = getScreenUIElements(screenContext);
  const visibleElementIds = uiElements.map(e => e.id);

  return {
    screen_id: screenContext,
    visible_ui_elements: visibleElementIds,
    user_role: normalizeRole(userRole),
    user_display_name: displayName,
    system_state: {
      shift_open: shiftOpen,
      restaurant_active: restaurantActive,
      has_open_orders: hasOpenOrders,
    },
    enabled_features: {
      inventory: featureVisibility?.inventoryEnabled ?? false,
      kds: featureVisibility?.kdsEnabled ?? false,
      discounts: featureVisibility?.discountsEnabled ?? true,
    },
    language,
    branch_context: branchContext ? {
      branch_id: branchContext.branchId ?? null,
      branch_name: branchContext.branchName ?? null,
      restaurant_name: branchContext.restaurantName ?? null,
    } : undefined,
  };
}

/**
 * Normalize role string to V2 role type
 */
function normalizeRole(role: string | null): V2SystemContext["user_role"] {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === "owner") return "owner";
  if (r === "cashier") return "cashier";
  if (r === "kitchen") return "kitchen";
  if (r === "system_admin") return "system_admin";
  return null;
}

/**
 * Classify soft intent from user query
 * V2 Rule 3: Classify QUESTION TYPE only, not destination
 */
export function classifySoftIntent(query: string, language: "ar" | "en"): V2SoftIntent {
  const q = query.toLowerCase();
  
  // Explanation indicators
  const explanationPatterns = language === "ar"
    ? ["ايش", "ما هو", "ما هي", "اشرح", "شرح", "يعني", "وش", "كيف يعمل", "ما معنى", "شو هذا", "شو يعني"]
    : ["what is", "what are", "explain", "how does", "what does", "meaning of"];
  
  // Clarification indicators
  const clarificationPatterns = language === "ar"
    ? ["اكثر", "أكثر", "بالتفصيل", "تفصيل", "وضح", "توضيح", "ليش", "لماذا", "سبب", "ليش ظهر", "ليش مكتوب"]
    : ["more", "detail", "clarify", "why", "reason", "because"];
  
  // Concern indicators (user worried)
  const concernPatterns = language === "ar"
    ? ["مشكلة", "هل في", "لازم", "قلق", "خطأ", "غلط", "عادي"]
    : ["problem", "should i", "worry", "wrong", "error", "normal", "okay"];
  
  // Analysis indicators
  const analysisPatterns = language === "ar"
    ? ["ليش صفر", "ليش منخفض", "الحالة", "علاقة", "علاقته"]
    : ["why zero", "why low", "status", "relation", "related"];
  
  // Practical advice indicators
  const advicePatterns = language === "ar"
    ? ["كيف", "طريقة", "خطوات", "اعمل", "افعل", "الحل", "حل"]
    : ["how to", "how do", "steps", "do i", "solution", "fix"];

  // Check patterns in order of specificity
  if (advicePatterns.some(p => q.includes(p))) return "practical_advice";
  if (analysisPatterns.some(p => q.includes(p))) return "light_analysis";
  if (concernPatterns.some(p => q.includes(p))) return "clarification"; // Treat concerns as clarification
  if (clarificationPatterns.some(p => q.includes(p))) return "clarification";
  return "explanation";
}

/**
 * Check if query is a vague contextual question that needs inference
 * V2 Rule: Infer context from visible cards for short queries
 */
export function isVagueContextualQuestion(query: string): boolean {
  const shortVaguePatterns = [
    // Arabic
    "ليش", "ليش؟", "شو هذا", "شو هذا؟", "يعني؟", "يعني ايش", 
    "ما هذا", "ما هذا؟", "شو يعني", "هل في مشكلة", "لازم اعمل شي",
    // English
    "why", "why?", "what is this", "what's this", "what does this mean",
    "should i worry", "is there a problem", "what should i do"
  ];
  
  const normalizedQuery = query.toLowerCase().trim();
  return shortVaguePatterns.some(p => normalizedQuery === p || normalizedQuery.includes(p));
}

/**
 * Get the most prominent dashboard insight to explain for vague questions
 * Priority: Operational Notes > What Changed > Confidence Score > Inventory Risk
 */
export function getPrimaryDashboardInsight(
  visibleElements: string[],
  language: "ar" | "en"
): { elementId: string; response: { ar: string; en: string } } | null {
  // Priority order for dashboard insights
  const insightPriority = [
    {
      id: "operational_notes",
      response: {
        ar: "هذه ملاحظات تشغيلية هادئة حول أنماط متكررة أو غير معتادة.\n\nتظهر فقط بعد تكرار السلوك، ولا تشير إلى أخطاء.\nلا تتطلب أي إجراء فوري - مجرد معلومات للاطلاع.",
        en: "These are calm operational notes about repeated or unusual patterns.\n\nThey appear only after repeated behavior and don't indicate errors.\nNo immediate action required - just informational awareness."
      }
    },
    {
      id: "what_changed_yesterday",
      response: {
        ar: "هذه البطاقة تعرض ملخصاً للتغييرات التشغيلية المهمة بين اليوم والأمس.\n\nإذا لم تظهر تغييرات، فهذا يعني استقرار العمليات - وهو أمر إيجابي.\nهذه معلومات فقط، وليست تنبيهاً.",
        en: "This card shows a summary of important operational changes between today and yesterday.\n\nIf no changes appear, it means stable operations - which is positive.\nThis is informational only, not an alert."
      }
    },
    {
      id: "system_confidence_score",
      response: {
        ar: "درجة ثقة النظام تعكس مستوى الاستقرار التشغيلي الإجمالي.\n\nالدرجة الأعلى تعني استقرار أكبر، وتتغير تدريجياً.\nليست مرتبطة بالأرباح أو حجم المبيعات.",
        en: "System Confidence Score reflects overall operational stability.\n\nHigher score means more stability, and it changes gradually.\nNot related to profit or sales volume."
      }
    },
    {
      id: "inventory_risk_card",
      response: {
        ar: "هذه البطاقة تُبرز الأصناف التي قد تحتاج مراجعة في الإعداد.\n\nمعلومات لدعم دقة المخزون على المدى الطويل.\nلا تمنع العمليات ولا تتطلب إجراء فوري.",
        en: "This card highlights items that may need setup review.\n\nInformational to support long-term inventory accuracy.\nDoes not block operations and requires no immediate action."
      }
    }
  ];
  
  for (const insight of insightPriority) {
    if (visibleElements.includes(insight.id)) {
      return {
        elementId: insight.id,
        response: insight.response
      };
    }
  }
  
  return null;
}

/**
 * Generate up to 2 smart suggestions based on current screen
 * V2 Rule 5: Suggestions must require NO execution or navigation
 */
export function generateSmartSuggestions(
  context: V2SystemContext
): V2SmartSuggestion[] {
  const suggestions: V2SmartSuggestion[] = [];
  const elements = context.visible_ui_elements;
  
  // Screen-specific suggestions based on visible elements
  switch (context.screen_id) {
    case "owner_dashboard":
      // Prioritize new smart dashboard insights
      if (elements.includes("what_changed_yesterday")) {
        suggestions.push({
          text: { ar: "فهم التغييرات الأخيرة", en: "Understand recent changes" },
          elementId: "what_changed_yesterday"
        });
      }
      if (elements.includes("system_confidence_score")) {
        suggestions.push({
          text: { ar: "فهم درجة الاستقرار", en: "Understand stability score" },
          elementId: "system_confidence_score"
        });
      }
      if (elements.includes("operational_notes")) {
        suggestions.push({
          text: { ar: "فهم الملاحظات التشغيلية", en: "Understand operational notes" },
          elementId: "operational_notes"
        });
      }
      if (elements.includes("today_summary")) {
        suggestions.push({
          text: { ar: "مراجعة ملخص اليوم", en: "Review today's summary" },
          elementId: "today_summary"
        });
      }
      break;
      
    case "pos_main":
      if (elements.includes("order_panel")) {
        suggestions.push({
          text: { ar: "مراجعة الطلب الحالي", en: "Review current order" },
          elementId: "order_panel"
        });
      }
      if (elements.includes("shift_button") && !context.system_state.shift_open) {
        suggestions.push({
          text: { ar: "كيفية فتح الوردية", en: "How to open shift" },
          elementId: "shift_button"
        });
      }
      break;
      
    case "pos_tables":
      if (elements.includes("table_map")) {
        suggestions.push({
          text: { ar: "فهم ألوان الطاولات", en: "Understand table colors" },
          elementId: "table_map"
        });
      }
      break;
      
    case "kds":
      if (elements.includes("order_cards")) {
        suggestions.push({
          text: { ar: "فهم ألوان البطاقات", en: "Understand card colors" },
          elementId: "order_cards"
        });
      }
      break;
      
    case "owner_inventory":
      if (context.enabled_features.inventory && elements.includes("inventory_items")) {
        suggestions.push({
          text: { ar: "مراجعة المخزون الحالي", en: "Review current inventory" },
          elementId: "inventory_items"
        });
      }
      break;
      
    case "owner_reports":
      if (elements.includes("reports_section")) {
        suggestions.push({
          text: { ar: "أنواع التقارير المتاحة", en: "Available report types" },
          elementId: "reports_section"
        });
      }
      break;
  }
  
  // Return max 2 suggestions
  return suggestions.slice(0, 2);
}

/**
 * Build safe "Explain Why" response
 * V2 Rule 6: Only explain from VISIBLE data, no speculation
 */
export function buildExplainWhyResponse(
  context: V2SystemContext,
  dataPoint: string,
  value: string | number
): { ar: string; en: string } | null {
  // Only provide explanations for known data points with visible causes
  const safeExplanations: Record<string, (v: string | number) => { ar: string; en: string }> = {
    sales_zero: () => ({
      ar: "المبيعات صفر لأنه لا توجد طلبات مدفوعة مسجلة اليوم.",
      en: "Sales are zero because no paid orders are recorded today."
    }),
    operational_score_low: (v) => ({
      ar: `درجة التشغيل ${v}% قد تكون منخفضة بسبب إلغاءات أو مرتجعات أو ورديات طويلة.`,
      en: `Operational score of ${v}% may be low due to cancellations, refunds, or long shifts.`
    }),
    shift_long: () => ({
      ar: "الوردية مفتوحة لفترة طويلة. يُنصح بإغلاقها وفتح وردية جديدة.",
      en: "Shift has been open for a long time. Consider closing it and opening a new one."
    }),
    no_orders: () => ({
      ar: "لا توجد طلبات لأنه لم يتم إنشاء أي طلب في هذه الفترة.",
      en: "No orders because none were created during this period."
    }),
  };
  
  const explainer = safeExplanations[dataPoint];
  if (!explainer) return null;
  
  return explainer(value);
}

/**
 * Format V2 response with smart suggestions
 */
export function formatV2Response(
  baseResponse: string,
  context: V2SystemContext,
  includeSuggestions: boolean = true
): string {
  let response = baseResponse;
  
  if (includeSuggestions) {
    const suggestions = generateSmartSuggestions(context);
    
    if (suggestions.length > 0) {
      const lang = context.language;
      const suggestionHeader = lang === "ar" 
        ? "\n\n💡 يمكنك أيضاً:" 
        : "\n\n💡 You can also:";
      
      const suggestionList = suggestions
        .map(s => `• ${s.text[lang]}`)
        .join("\n");
      
      response += suggestionHeader + "\n" + suggestionList;
    }
  }
  
  return response;
}

/**
 * Get adaptive tone hint based on context
 * V2 Rule 7: Adapt tone, NOT logic
 */
export function getAdaptiveToneHint(
  context: V2SystemContext,
  questionCount: number
): "formal" | "friendly" | "concise" {
  // Kitchen staff prefer concise responses
  if (context.user_role === "kitchen") return "concise";
  
  // Repeated questions suggest user needs more clarity - be friendlier
  if (questionCount > 2) return "friendly";
  
  // Owners and admins get formal tone
  if (context.user_role === "owner" || context.user_role === "system_admin") {
    return "formal";
  }
  
  // Default friendly for cashiers
  return "friendly";
}

/**
 * Check if a topic/feature should be hidden based on context
 * V2 Rule 2: Never reference hidden UI or disabled features
 */
export function shouldHideFeature(
  featureId: string,
  context: V2SystemContext
): boolean {
  // Hide inventory-related if inventory disabled
  if (!context.enabled_features.inventory) {
    if (featureId.includes("inventory") || featureId.includes("stock") || featureId.includes("recipe")) {
      return true;
    }
  }
  
  // Hide KDS-related if KDS disabled
  if (!context.enabled_features.kds) {
    if (featureId.includes("kitchen") || featureId.includes("kds")) {
      return true;
    }
  }
  
  // Hide discount-related if discounts disabled
  if (!context.enabled_features.discounts) {
    if (featureId.includes("discount")) {
      return true;
    }
  }
  
  // Check if element is in visible list
  if (!context.visible_ui_elements.includes(featureId)) {
    // It's hidden on this screen
    return true;
  }
  
  return false;
}

/**
 * Build screen-aware greeting
 */
export function buildV2Greeting(context: V2SystemContext): string {
  const lang = context.language;
  const name = context.user_display_name;
  const screenName = getScreenName(context.screen_id, lang);
  const primaryElement = getScreenPrimaryElement(context.screen_id, lang);
  
  const greeting = name
    ? (lang === "ar" ? `مرحباً ${name}،` : `Hello ${name},`)
    : (lang === "ar" ? "مرحباً،" : "Hello,");
  
  if (lang === "ar") {
    return `${greeting}

أنت حالياً في **${screenName}**.

📍 **${primaryElement.name}**
${primaryElement.description}`;
  }
  
  return `${greeting}

You are currently on **${screenName}**.

📍 **${primaryElement.name}**
${primaryElement.description}`;
}
