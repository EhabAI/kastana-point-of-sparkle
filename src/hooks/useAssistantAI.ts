import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  KnowledgeEntry, 
  getEntryById, 
  getFallbackResponse,
  getAllTopics
} from "@/lib/assistantKnowledge";

interface IntentResult {
  intent: "report" | "training" | "explanation" | "example" | "follow_up" | "system_overview" | "unknown";
  matchedEntryIds: string[];
  depth: "brief" | "detailed";
  reasoning: string;
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

interface UseAssistantAIReturn {
  processQuery: (query: string, language: "ar" | "en") => Promise<string>;
  isLoading: boolean;
  lastIntent: IntentResult | null;
  error: string | null;
}

/**
 * Hook to integrate AI intent understanding with the Knowledge Base
 * Uses OpenAI via Lovable AI to understand user intent, 
 * then retrieves responses strictly from the Knowledge Base
 */
export function useAssistantAI(): UseAssistantAIReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [lastIntent, setLastIntent] = useState<IntentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of last matched entry for follow-up questions
  const lastMatchedEntryRef = useRef<string | null>(null);
  
  // Keep recent conversation for context
  const conversationHistoryRef = useRef<ConversationMessage[]>([]);

  const processQuery = useCallback(async (
    query: string, 
    language: "ar" | "en"
  ): Promise<string> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get all knowledge entry summaries for the AI
      const topics = getAllTopics(language);
      const knowledgeEntries = topics.map(t => {
        const entry = getEntryById(t.id);
        return {
          id: t.id,
          title: t.title,
          keywords: entry ? [...entry.keywords.ar, ...entry.keywords.en] : [],
        };
      });

      // Call the edge function
      const { data, error: fnError } = await supabase.functions.invoke("assistant-intent", {
        body: {
          userQuery: query,
          language,
          knowledgeEntries,
          conversationHistory: conversationHistoryRef.current.slice(-4), // Last 2 exchanges
        },
      });

      if (fnError) {
        console.error("Edge function error:", fnError);
        throw new Error(fnError.message || "AI service error");
      }

      // Handle rate limit or payment errors
      if (data?.error) {
        setError(data.error);
        // Fall back to basic search
        return getFallbackResponse(language);
      }

      const intentResult: IntentResult = data;
      setLastIntent(intentResult);

      // Handle follow-up questions
      if (intentResult.intent === "follow_up" && lastMatchedEntryRef.current) {
        // Use the last matched entry for detailed response
        intentResult.matchedEntryIds = [lastMatchedEntryRef.current];
        intentResult.depth = "detailed";
      }

      // Generate response from Knowledge Base
      const response = generateResponseFromKnowledge(
        intentResult,
        language
      );

      // Update conversation history
      conversationHistoryRef.current.push({ role: "user", content: query });
      conversationHistoryRef.current.push({ role: "assistant", content: response });
      
      // Keep only last 6 messages
      if (conversationHistoryRef.current.length > 6) {
        conversationHistoryRef.current = conversationHistoryRef.current.slice(-6);
      }

      // Remember last matched entry for follow-ups
      if (intentResult.matchedEntryIds.length > 0) {
        lastMatchedEntryRef.current = intentResult.matchedEntryIds[0];
      }

      return response;

    } catch (err) {
      console.error("Assistant AI error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      // Return fallback on error
      return getFallbackResponse(language);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { processQuery, isLoading, lastIntent, error };
}

/**
 * Built-in system overview responses (not from knowledge base)
 */
const SYSTEM_OVERVIEW_RESPONSES = {
  brief: {
    ar: `نظام Kastana POS هو نظام نقاط بيع متكامل للمطاعم والمقاهي.

✨ المميزات الرئيسية:
• إدارة الطلبات (سفري/صالة)
• الدفع بطرق متعددة (نقد/بطاقة)
• إدارة الورديات وتقارير Z
• المرتجعات والإلغاءات
• إدارة الطاولات والدمج
• تتبع المخزون

💡 اكتب "اشرح أكثر" لمعرفة المزيد عن أي ميزة.`,
    en: `Kastana POS is a complete point-of-sale system for restaurants and cafes.

✨ Key Features:
• Order management (Takeaway/Dine-in)
• Multiple payment methods (Cash/Card)
• Shift management and Z Reports
• Refunds and voids
• Table management and merging
• Inventory tracking

💡 Type "explain more" to learn about any feature.`
  },
  detailed: {
    ar: `نظام Kastana POS - نظرة شاملة

🛒 إدارة الطلبات:
• إنشاء طلبات سفري أو صالة
• إضافة أصناف من القائمة مع تعديلات
• تعليق واستئناف الطلبات
• دمج طلبات الطاولات
• نقل أصناف بين الطلبات

💳 الدفع والمالية:
• دفع نقدي أو بالبطاقة
• تطبيق خصومات
• إدارة المرتجعات
• تقارير Z اليومية

👥 إدارة الورديات:
• فتح وإغلاق الورديات
• إيداع وسحب النقد
• مطابقة الصندوق

📊 التقارير:
• تقرير المبيعات
• تقرير المرتجعات
• أداء الموظفين

📦 المخزون:
• تتبع المواد الخام
• إنشاء الوصفات
• تنبيهات النقص`,
    en: `Kastana POS - Complete Overview

🛒 Order Management:
• Create takeaway or dine-in orders
• Add menu items with modifiers
• Hold and resume orders
• Merge table orders
• Transfer items between orders

💳 Payments & Finance:
• Cash or card payments
• Apply discounts
• Process refunds
• Daily Z Reports

👥 Shift Management:
• Open and close shifts
• Cash in/out
• Drawer reconciliation

📊 Reports:
• Sales reports
• Refunds report
• Staff performance

📦 Inventory:
• Track raw materials
• Create recipes
• Low stock alerts`
  }
};

/**
 * Generate response strictly from Knowledge Base entries
 */
function generateResponseFromKnowledge(
  intent: IntentResult,
  language: "ar" | "en"
): string {
  // Handle system overview intent with built-in responses
  if (intent.intent === "system_overview") {
    return SYSTEM_OVERVIEW_RESPONSES[intent.depth][language];
  }

  // No matches found
  if (intent.matchedEntryIds.length === 0 || intent.intent === "unknown") {
    return getFallbackResponse(language);
  }

  // Get the matched entries
  const entries: KnowledgeEntry[] = intent.matchedEntryIds
    .map(id => getEntryById(id))
    .filter((e): e is KnowledgeEntry => e !== null);

  if (entries.length === 0) {
    return getFallbackResponse(language);
  }

  // For detailed responses, return full content
  if (intent.depth === "detailed") {
    return entries.map(entry => entry.content[language]).join("\n\n---\n\n");
  }

  // For brief responses, return shortened content
  const primaryEntry = entries[0];
  const content = primaryEntry.content[language];
  
  // Get first 5-6 meaningful lines for brief
  const lines = content.split("\n").filter(line => line.trim());
  const briefContent = lines.slice(0, 6).join("\n");
  
  // Add follow-up hint if there's more content
  if (lines.length > 6) {
    const moreHint = language === "ar" 
      ? "\n\n💡 اكتب \"اشرح أكثر\" لمزيد من التفاصيل"
      : "\n\n💡 Type \"explain more\" for more details";
    return briefContent + moreHint;
  }

  return briefContent;
}
