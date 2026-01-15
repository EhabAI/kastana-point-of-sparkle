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
  title?: {
    ar: string;
    en: string;
  };
  content: {
    ar: string;
    en: string;
  };
  metadata?: {
    feature_id?: string;
    is_new?: boolean;
    training_required?: boolean;
    alert_or_guidance_needed?: boolean;
    affected_screens?: string[];
    user_roles?: string[];
  };
}

export interface FeatureAnnouncement {
  id: string;
  title: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  date: string;
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
  featureAnnouncements?: FeatureAnnouncement[];
}

// Type-safe access to knowledge data
const knowledge = knowledgeData as KnowledgeBase;

// Storage key for dismissed announcements
const DISMISSED_ANNOUNCEMENTS_KEY = "kastana_dismissed_announcements";

/**
 * Get feature announcements that haven't been dismissed
 */
export function getActiveAnnouncements(): FeatureAnnouncement[] {
  // Get announcements from new features in knowledge base
  const newFeatures = Object.values(knowledge.entries)
    .filter(entry => entry.metadata?.is_new && entry.metadata?.alert_or_guidance_needed)
    .map(entry => ({
      id: entry.id,
      title: entry.title || { ar: entry.id, en: entry.id },
      description: {
        ar: entry.content.ar.split('\n')[0] || '',
        en: entry.content.en.split('\n')[0] || ''
      },
      date: knowledge.lastUpdated
    }));

  // Also include explicit announcements if defined
  const explicitAnnouncements = knowledge.featureAnnouncements || [];
  
  return [...newFeatures, ...explicitAnnouncements];
}

/**
 * Get dismissed announcement IDs from localStorage
 */
export function getDismissedAnnouncements(): string[] {
  try {
    const stored = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Dismiss an announcement (persists to localStorage)
 */
export function dismissAnnouncement(id: string): void {
  const dismissed = getDismissedAnnouncements();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(DISMISSED_ANNOUNCEMENTS_KEY, JSON.stringify(dismissed));
  }
}

/**
 * Get announcements that haven't been dismissed
 */
export function getUndismissedAnnouncements(): FeatureAnnouncement[] {
  const all = getActiveAnnouncements();
  const dismissed = getDismissedAnnouncements();
  return all.filter(a => !dismissed.includes(a.id));
}

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
    
    // Check title match (if title exists)
    if (entry.title && lowerQuery.includes(entry.title[language].toLowerCase())) {
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
 * Format response for chat - shorter, clearer, instructional
 */
export function formatChatResponse(content: string): string {
  // Shorten content: take first 4-5 meaningful lines
  const lines = content.split('\n').filter(line => line.trim());
  const shortened = lines.slice(0, 5).join('\n');
  return shortened;
}

/**
 * Get the content from a knowledge entry in the specified language
 */
export function getKnowledgeContent(
  entry: KnowledgeEntry,
  language: "ar" | "en"
): string {
  return formatChatResponse(entry.content[language]);
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
    title: entry.title?.[language] || entry.id.replace(/_/g, ' '),
  }));
}

/**
 * Get a specific entry by ID
 */
export function getEntryById(id: string): KnowledgeEntry | null {
  return knowledge.entries[id] || null;
}
