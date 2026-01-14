// Kastana POS Assistant - AI Coach Preparation
// Architecture ready for future Edge Function integration
// Does NOT auto-enable AI calls - requires explicit activation

export interface CoachRequest {
  message: string;
  language: "ar" | "en";
  context: CoachContext;
  mode: "training" | "deep_explanation";
}

export interface CoachContext {
  userRole: string;
  currentScreen: string;
  enabledAddons: string[];
  knowledgeContext?: string;
  previousMessages?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface CoachResponse {
  content: string;
  sources: string[];
  confidence: number;
  followUpSuggestions?: string[];
}

// System prompt constraints for AI Coach
export const COACH_SYSTEM_PROMPT = `You are the Kastana POS AI Coach.

CRITICAL CONSTRAINTS:
1. You ONLY answer questions about Kastana POS system
2. You CANNOT perform any actions or change data
3. You CANNOT access external information
4. You MUST use ONLY the provided context and knowledge base
5. If the answer is not in the provided context, say "I don't have information about this"

RESPONSE RULES:
- Arabic is primary language
- English POS terms are acceptable
- Maximum 24 lines for training mode
- Maximum 14 lines for deep explanation
- Use numbered steps where applicable
- Include practical examples when relevant

FORBIDDEN:
- General chat or advice
- Personal opinions
- Information outside Kastana POS
- Executing any system actions
- Bypassing permission rules`;

/**
 * Check if AI Coach should be invoked
 */
export function shouldInvokeCoach(
  mode: string,
  userExplicitlyAsked: boolean
): boolean {
  // Only invoke when:
  // 1. Training mode is active AND user explicitly asked for more detail
  // 2. OR user explicitly asked for AI explanation
  return (mode === "training" && userExplicitlyAsked);
}

/**
 * Build context for AI Coach request
 */
export function buildCoachContext(
  userRole: string,
  currentScreen: string,
  enabledAddons: string[],
  knowledgeContent?: string
): CoachContext {
  return {
    userRole,
    currentScreen,
    enabledAddons,
    knowledgeContext: knowledgeContent,
  };
}

/**
 * Prepare request payload for AI Coach Edge Function
 * This is ready for future implementation
 */
export function prepareCoachRequest(
  message: string,
  language: "ar" | "en",
  context: CoachContext,
  isTrainingMode: boolean
): CoachRequest {
  return {
    message,
    language,
    context,
    mode: isTrainingMode ? "training" : "deep_explanation",
  };
}

/**
 * Validate that AI Coach response is within domain
 * This would be used to filter responses from the AI
 */
export function validateCoachResponse(response: string): boolean {
  // Check for out-of-scope content
  const outOfScopePatterns = [
    "I cannot help with that",
    "لا أستطيع المساعدة",
    "outside my scope",
    "خارج نطاقي",
    // Check for general chat patterns
    "how are you",
    "كيف حالك",
    "tell me a joke",
    "احكي لي",
  ];
  
  const lowerResponse = response.toLowerCase();
  return !outOfScopePatterns.some(pattern => 
    lowerResponse.includes(pattern.toLowerCase())
  );
}

/**
 * Get fallback message when AI Coach is not available
 */
export function getCoachFallbackMessage(language: "ar" | "en"): string {
  return language === "ar"
    ? "المساعد الذكي غير متاح حالياً. يمكنني مساعدتك من قاعدة المعرفة الموجودة."
    : "AI Coach is currently unavailable. I can help you from the existing knowledge base.";
}

/**
 * Edge Function URL (for future implementation)
 */
export const COACH_EDGE_FUNCTION = "assistant-coach";

/**
 * Check if AI Coach feature is enabled (for future toggle)
 */
export function isCoachEnabled(): boolean {
  // This would check a feature flag or setting
  // Currently always returns false to prevent auto-enabling
  return false;
}
