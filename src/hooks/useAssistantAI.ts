import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  KnowledgeEntry, 
  getEntryById, 
  getFallbackResponse,
  getAllTopics
} from "@/lib/assistantKnowledge";

interface IntentResult {
  intent: "report" | "training" | "explanation" | "example" | "follow_up" | "unknown";
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
 * Generate response strictly from Knowledge Base entries
 */
function generateResponseFromKnowledge(
  intent: IntentResult,
  language: "ar" | "en"
): string {
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
