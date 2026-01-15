// Kastana POS Assistant Knowledge Loader
// Reads from static assistant_knowledge.json
// Enhanced with role/screen filtering for Smart Guided Assistant

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

// Confidence threshold for search results
const CONFIDENCE_THRESHOLD = 10;

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
 * Normalize Arabic text for better matching
 * Removes diacritics and normalizes common variations
 */
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics
    .replace(/[أإآ]/g, 'ا') // Normalize alef variations
    .replace(/ى/g, 'ي') // Normalize ya
    .replace(/ة/g, 'ه') // Normalize ta marbuta
    .toLowerCase();
}

/**
 * Enhanced search with role/screen filtering and Arabic normalization
 */
export function searchKnowledge(
  query: string,
  language: "ar" | "en",
  intent?: AssistantIntent,
  options?: {
    role?: string;
    screen?: string;
  }
): KnowledgeEntry | null {
  const lowerQuery = query.toLowerCase();
  const normalizedQuery = language === "ar" ? normalizeArabic(query) : lowerQuery;
  const entries = Object.values(knowledge.entries);
  
  let bestMatch: KnowledgeEntry | null = null;
  let bestScore = 0;
  
  for (const entry of entries) {
    let score = 0;
    
    // Role filtering boost/penalty
    if (options?.role && entry.metadata?.user_roles) {
      if (entry.metadata.user_roles.includes(options.role)) {
        score += 5; // Boost for role match
      } else {
        score -= 3; // Slight penalty for non-matching role
      }
    }
    
    // Screen filtering boost
    if (options?.screen && entry.metadata?.affected_screens) {
      const screenMatch = entry.metadata.affected_screens.some(s => 
        s.toLowerCase().includes(options.screen!.toLowerCase()) ||
        options.screen!.toLowerCase().includes(s.toLowerCase())
      );
      if (screenMatch) {
        score += 5; // Boost for screen match
      }
    }
    
    // Check keyword matches with normalization for Arabic
    const keywords = entry.keywords[language];
    for (const keyword of keywords) {
      const normalizedKeyword = language === "ar" ? normalizeArabic(keyword) : keyword.toLowerCase();
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += 10;
      }
      // Partial match for longer keywords
      if (normalizedKeyword.length > 3 && normalizedQuery.includes(normalizedKeyword.substring(0, 3))) {
        score += 3;
      }
    }
    
    // Also check the other language keywords (user might mix)
    const otherLang = language === "ar" ? "en" : "ar";
    const otherKeywords = entry.keywords[otherLang];
    for (const keyword of otherKeywords) {
      const normalizedKeyword = otherLang === "ar" ? normalizeArabic(keyword) : keyword.toLowerCase();
      if (lowerQuery.includes(normalizedKeyword)) {
        score += 5;
      }
    }
    
    // Boost score if intent matches
    if (intent && entry.intent.includes(intent)) {
      score += 15;
    }
    
    // Check title match (if title exists)
    if (entry.title) {
      const titleText = language === "ar" ? normalizeArabic(entry.title[language]) : entry.title[language].toLowerCase();
      if (normalizedQuery.includes(titleText)) {
        score += 20;
      }
      // Partial title match
      if (titleText.includes(normalizedQuery)) {
        score += 10;
      }
    }
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = entry;
    }
  }
  
  // Only return if we have a reasonable match (above confidence threshold)
  return bestScore >= CONFIDENCE_THRESHOLD ? bestMatch : null;
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
 * Get topics filtered by role
 */
export function getTopicsForRole(
  language: "ar" | "en", 
  role: string
): Array<{ id: string; title: string }> {
  return Object.values(knowledge.entries)
    .filter(entry => 
      !entry.metadata?.user_roles || 
      entry.metadata.user_roles.includes(role)
    )
    .map((entry) => ({
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

/**
 * Get entries by screen
 */
export function getEntriesByScreen(screen: string): KnowledgeEntry[] {
  return Object.values(knowledge.entries).filter(entry =>
    entry.metadata?.affected_screens?.some(s => 
      s.toLowerCase().includes(screen.toLowerCase())
    )
  );
}

/**
 * Get entries marked as requiring training
 */
export function getTrainingRequiredEntries(): KnowledgeEntry[] {
  return Object.values(knowledge.entries).filter(entry =>
    entry.metadata?.training_required === true
  );
}
