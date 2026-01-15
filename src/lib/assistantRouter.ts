/**
 * Kastana Smart Guided Assistant - Central Router
 * Decides how to respond based on role, screen, state, and query
 * NO AI CLIENT - Pure deterministic logic
 */

import { evaluateRules, getTopAlert, type RuleContext, type SmartRule } from "./smartAssistantRules";
import { searchKnowledge, getFallbackResponse, type KnowledgeEntry } from "./assistantKnowledge";
import { getTrainingForContext, shouldShowTraining, type TrainingCard } from "./assistantSmartTraining";
import type { ScreenContext } from "./smartAssistantContext";

// Types
export type UserRole = "cashier" | "owner" | "kitchen" | "system_admin" | null;
export type ResponseSource = "rule" | "training" | "knowledge" | "fallback";
export type ResponseSeverity = "info" | "warning" | "critical";

/**
 * AI-Ready response interface
 * Designed to be compatible with future AI integration
 */
export interface AssistantResponse {
  source: ResponseSource;
  severity: ResponseSeverity;
  content: {
    ar: string;
    en: string;
  };
  actionable: boolean;
  // Optional metadata for UI handling
  metadata?: {
    ruleId?: string;
    knowledgeId?: string;
    trainingId?: string;
    confidence?: number; // 0-1, for future AI responses
    safe?: boolean; // For AI safety checks
  };
}

/**
 * Context passed to the router for decision making
 */
export interface RouterContext {
  // User context
  userRole: UserRole;
  
  // Screen context
  currentScreen: ScreenContext;
  
  // Entity states
  orderStatus?: string | null;
  shiftStatus?: string | null;
  tableStatus?: string | null;
  
  // Inventory flags (for owner)
  hasLowStock?: boolean;
  hasHighVariance?: boolean;
  variancePercentage?: number;
  
  // KDS flags (for kitchen)
  hasStuckOrders?: boolean;
  rushOrderCount?: number;
  
  // Training flags
  isFirstTimeOnScreen?: boolean;
  hasRepeatedMistake?: boolean;
  
  // Rule context (for detailed rule evaluation)
  ruleContext?: RuleContext;
  
  // Optional user question
  userQuestion?: string;
  
  // Language
  language: "ar" | "en";
}

/**
 * Routing priority:
 * 1. RULE-BASED AUTO INTERVENTION (highest priority)
 * 2. TRAINING (first use / mistake)
 * 3. KNOWLEDGE BASE ANSWER (for user questions)
 * 4. FALLBACK (no answer found)
 */
export function routeAssistantRequest(context: RouterContext): AssistantResponse {
  // Priority 1: Rule-based auto interventions
  if (context.ruleContext) {
    const topAlert = getTopAlert(context.ruleContext);
    if (topAlert) {
      return createRuleResponse(topAlert, context.language);
    }
  }
  
  // Check role-specific auto interventions
  const roleIntervention = checkRoleSpecificIntervention(context);
  if (roleIntervention) {
    return roleIntervention;
  }
  
  // Priority 2: Training triggers
  if (shouldShowTraining(context)) {
    const training = getTrainingForContext(context);
    if (training) {
      return createTrainingResponse(training, context.language);
    }
  }
  
  // Priority 3: Knowledge base answer (if user asked a question)
  if (context.userQuestion) {
    const knowledgeEntry = searchKnowledge(
      context.userQuestion, 
      context.language,
      undefined // intent
    );
    
    if (knowledgeEntry) {
      return createKnowledgeResponse(knowledgeEntry, context.language);
    }
  }
  
  // Priority 4: Fallback
  return createFallbackResponse(context.language);
}

/**
 * Check for role-specific auto interventions
 */
function checkRoleSpecificIntervention(context: RouterContext): AssistantResponse | null {
  const { userRole, language } = context;
  
  // OWNER-specific interventions
  if (userRole === "owner") {
    // High variance alert
    if (context.hasHighVariance && context.variancePercentage !== undefined) {
      return {
        source: "rule",
        severity: context.variancePercentage > 10 ? "critical" : "warning",
        content: {
          ar: `فرق مخزون مرتفع (${context.variancePercentage.toFixed(1)}%). الأسباب المحتملة: هدر، سرقة، خطأ في التسجيل، أو تغيير في الوصفات.`,
          en: `High inventory variance (${context.variancePercentage.toFixed(1)}%). Possible causes: waste, theft, recording error, or recipe changes.`
        },
        actionable: true,
        metadata: {
          ruleId: "owner_high_variance",
          confidence: 1,
          safe: true
        }
      };
    }
    
    // Low stock alert
    if (context.hasLowStock) {
      return {
        source: "rule",
        severity: "warning",
        content: {
          ar: "توجد أصناف منخفضة المخزون. الخطر: انقطاع الأصناف من القائمة وخسارة مبيعات.",
          en: "Some items are low in stock. Risk: Menu items becoming unavailable and lost sales."
        },
        actionable: true,
        metadata: {
          ruleId: "owner_low_stock",
          confidence: 1,
          safe: true
        }
      };
    }
  }
  
  // KITCHEN-specific interventions
  if (userRole === "kitchen") {
    // Stuck orders alert
    if (context.hasStuckOrders) {
      return {
        source: "rule",
        severity: "warning",
        content: {
          ar: "يوجد طلبات متأخرة في الانتظار. اضغط على الطلب لتغيير الحالة.",
          en: "There are delayed orders waiting. Click on order to change status."
        },
        actionable: true,
        metadata: {
          ruleId: "kds_stuck_orders",
          confidence: 1,
          safe: true
        }
      };
    }
    
    // Rush accumulation
    if (context.rushOrderCount && context.rushOrderCount >= 5) {
      return {
        source: "rule",
        severity: "warning",
        content: {
          ar: `${context.rushOrderCount} طلبات في الانتظار. ركز على الأقدم أولاً.`,
          en: `${context.rushOrderCount} orders waiting. Focus on oldest first.`
        },
        actionable: true,
        metadata: {
          ruleId: "kds_rush_accumulation",
          confidence: 1,
          safe: true
        }
      };
    }
  }
  
  return null;
}

/**
 * Create response from triggered rule
 */
function createRuleResponse(rule: SmartRule, language: "ar" | "en"): AssistantResponse {
  const severity: ResponseSeverity = 
    rule.severity === "error" ? "critical" : 
    rule.severity === "warning" ? "warning" : "info";
  
  let content = rule.message[language];
  if (rule.suggestion) {
    content += `\n\n💡 ${rule.suggestion[language]}`;
  }
  
  return {
    source: "rule",
    severity,
    content: {
      ar: language === "ar" ? content : rule.message.ar + (rule.suggestion ? `\n\n💡 ${rule.suggestion.ar}` : ""),
      en: language === "en" ? content : rule.message.en + (rule.suggestion ? `\n\n💡 ${rule.suggestion.en}` : "")
    },
    actionable: !!rule.suggestion,
    metadata: {
      ruleId: rule.id,
      confidence: 1,
      safe: true
    }
  };
}

/**
 * Create response from training card
 */
function createTrainingResponse(training: TrainingCard, language: "ar" | "en"): AssistantResponse {
  const steps = training.steps[language].join("\n");
  let content = `${training.whyMatters[language]}\n\n${steps}`;
  
  if (training.tip) {
    content += `\n\n💡 ${training.tip[language]}`;
  }
  
  return {
    source: "training",
    severity: "info",
    content: {
      ar: language === "ar" ? content : `${training.whyMatters.ar}\n\n${training.steps.ar.join("\n")}${training.tip ? `\n\n💡 ${training.tip.ar}` : ""}`,
      en: language === "en" ? content : `${training.whyMatters.en}\n\n${training.steps.en.join("\n")}${training.tip ? `\n\n💡 ${training.tip.en}` : ""}`
    },
    actionable: true,
    metadata: {
      trainingId: training.id,
      confidence: 1,
      safe: true
    }
  };
}

/**
 * Create response from knowledge base entry
 */
function createKnowledgeResponse(entry: KnowledgeEntry, language: "ar" | "en"): AssistantResponse {
  return {
    source: "knowledge",
    severity: "info",
    content: {
      ar: entry.content.ar,
      en: entry.content.en
    },
    actionable: false,
    metadata: {
      knowledgeId: entry.id,
      confidence: 0.8, // Static KB has high but not perfect confidence
      safe: true
    }
  };
}

/**
 * Create fallback response when nothing matches
 */
function createFallbackResponse(language: "ar" | "en"): AssistantResponse {
  const fallback = getFallbackResponse(language);
  
  return {
    source: "fallback",
    severity: "info",
    content: {
      ar: language === "ar" ? fallback : getFallbackResponse("ar"),
      en: language === "en" ? fallback : getFallbackResponse("en")
    },
    actionable: false,
    metadata: {
      confidence: 0,
      safe: true
    }
  };
}

/**
 * Answer a specific user question using the router
 * Convenience function for Q&A use case
 */
export function answerQuestion(
  question: string,
  role: UserRole,
  screen: ScreenContext,
  language: "ar" | "en"
): AssistantResponse {
  return routeAssistantRequest({
    userRole: role,
    currentScreen: screen,
    userQuestion: question,
    language
  });
}

/**
 * Get auto intervention if any (no user question)
 * For proactive assistant behavior
 */
export function getAutoIntervention(
  context: Omit<RouterContext, "userQuestion">
): AssistantResponse | null {
  const response = routeAssistantRequest(context as RouterContext);
  
  // Only return if it's a rule or training response (not knowledge/fallback)
  if (response.source === "rule" || response.source === "training") {
    return response;
  }
  
  return null;
}
