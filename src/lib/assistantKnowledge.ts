// Kastana POS Assistant Knowledge Loader
// Reads from static assistant_knowledge.json

import knowledgeData from "@/data/assistant_knowledge.json";
import type { AssistantIntent } from "@/lib/assistantScopeGuard";

export interface KnowledgeEntry {
  id: string;
  intent: string[];
  keywords: {
    ar: string[];
    en: string[];
  };
  title: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: string;
  entries: Record<string, KnowledgeEntry>;
  fallbackResponses: {
    ar: string;
    en: string;
  };
  quickReplies: {
    ar: string[];
    en: string[];
  };
}

// Type-safe access to knowledge data
const knowledge = knowledgeData as KnowledgeBase;

/**
 * Search the knowledge base for the best matching entry
 */
export function searchKnowledge(
  query: string,
  language: "ar" | "en",
  intent?: AssistantIntent
): KnowledgeEntry | null {
  const lowerQuery = query.toLowerCase();
  const entries = Object.values(knowledge.entries);
  
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;
  
  for (const entry of entries) {
    let score = 0;
    
    // Check keyword matches
    const keywords = entry.keywords[language];
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    
    // Also check the other language keywords (user might mix)
    const otherLang = language === "ar" ? "en" : "ar";
    const otherKeywords = entry.keywords[otherLang];
    for (const keyword of otherKeywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        score += 5;
      }
    }
    
    // Boost score if intent matches
    if (intent && entry.intent.includes(intent)) {
      score += 15;
    }
    
    // Check title match
    if (lowerQuery.includes(entry.title[language].toLowerCase())) {
      score += 20;
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  // Only return if we have a reasonable match
  return bestScore >= 10 ? bestMatch : null;
}

/**
 * Get the content from a knowledge entry in the specified language
 */
export function getKnowledgeContent(
  entry: KnowledgeEntry,
  language: "ar" | "en"
): string {
  return entry.content[language];
}

/**
 * Get the fallback response when no match is found
 */
export function getFallbackResponse(language: "ar" | "en"): string {
  return knowledge.fallbackResponses[language];
}

/**
 * Get quick reply suggestions
 */
export function getQuickReplies(language: "ar" | "en"): string[] {
  return knowledge.quickReplies[language];
}

/**
 * Get all available topics for listing
 */
export function getAllTopics(language: "ar" | "en"): Array<{ id: string; title: string }> {
  return Object.values(knowledge.entries).map((entry) => ({
    id: entry.id,
    title: entry.title[language],
  }));
}

/**
 * Get a specific entry by ID
 */
export function getEntryById(id: string): KnowledgeEntry | null {
  return knowledge.entries[id] || null;
}
