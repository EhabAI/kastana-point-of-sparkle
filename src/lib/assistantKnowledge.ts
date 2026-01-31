// Kastana POS Assistant Knowledge Loader
// Reads from static assistant_knowledge.json
// Enhanced with role/screen filtering for Smart Guided Assistant
// PRODUCTION RULES: Screen-locked, role-aware, feature-filtered

import knowledgeData from "@/data/assistant_knowledge.json";
import type { AssistantIntent } from "@/lib/assistantScopeGuard";
import { 
  buildSafeFallbackResponse, 
  type FeatureVisibility 
} from "@/lib/assistantScreenLock";
import type { ScreenContext } from "@/lib/smartAssistantContext";

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

export interface SystemRule {
  id: string;
  priority: "critical" | "high" | "normal";
  title: {
    ar: string;
    en: string;
  };
  rules: {
    ar: string[];
    en: string[];
  };
  overrides?: string;
  affected_roles: string[];
}

export interface KnowledgeBase {
  version: string;
  lastUpdated: string;
  systemRules?: SystemRule[];
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

// Type-safe access to knowledge data with explicit unknown cast for safety
const knowledge = knowledgeData as unknown as KnowledgeBase;

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
 * Extract individual words and common report-related terms from query
 */
function extractSearchTerms(query: string): string[] {
  const normalized = query.toLowerCase();
  const terms: string[] = [];
  
  // Add the full query
  terms.push(normalized);
  
  // Extract individual words
  const words = normalized.split(/\s+/).filter(w => w.length > 1);
  terms.push(...words);
  
  // Check for common report patterns
  if (normalized.includes('z') || normalized.includes('زد') || normalized.includes('زي')) {
    terms.push('z report', 'z_report', 'تقرير z', 'زد');
  }
  if (normalized.includes('كاش') || normalized.includes('cash') || normalized.includes('نقد')) {
    terms.push('cash report', 'تقرير الكاش', 'تقرير النقد');
  }
  if (normalized.includes('مخزون') || normalized.includes('inventory') || normalized.includes('جرد')) {
    terms.push('inventory report', 'تقرير المخزون');
  }
  
  return [...new Set(terms)];
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
  const searchTerms = extractSearchTerms(query);
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
      
      // Exact match in query - high score
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += 15;
      }
      
      // Check if any extracted search term matches keyword
      for (const term of searchTerms) {
        const normalizedTerm = language === "ar" ? normalizeArabic(term) : term.toLowerCase();
        if (normalizedKeyword.includes(normalizedTerm) || normalizedTerm.includes(normalizedKeyword)) {
          score += 10;
        }
      }
      
      // Partial match for longer keywords
      if (normalizedKeyword.length > 3 && normalizedQuery.includes(normalizedKeyword.substring(0, 3))) {
        score += 3;
      }
    }
    
    // Also check the other language keywords (user might mix languages)
    const otherLang = language === "ar" ? "en" : "ar";
    const otherKeywords = entry.keywords[otherLang];
    for (const keyword of otherKeywords) {
      const normalizedKeyword = otherLang === "ar" ? normalizeArabic(keyword) : keyword.toLowerCase();
      if (lowerQuery.includes(normalizedKeyword)) {
        score += 8;
      }
      // Check search terms against other language keywords too
      for (const term of searchTerms) {
        if (normalizedKeyword.includes(term.toLowerCase()) || term.toLowerCase().includes(normalizedKeyword)) {
          score += 6;
        }
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
    
    // Check entry ID for direct matches (e.g., "z_report" query matches "z_report" id)
    if (lowerQuery.includes(entry.id.replace(/_/g, ' ')) || lowerQuery.includes(entry.id.replace(/_/g, ''))) {
      score += 12;
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
 * Get contextual fallback response when no match is found
 * PRODUCTION RULE 3: Safe fallback - explain most important element on current screen
 * NEVER ask user to clarify or rephrase
 */
export function getFallbackResponse(
  language: "ar" | "en",
  options?: {
    displayName?: string;
    screenContext?: string;
    featureVisibility?: FeatureVisibility;
  }
): string {
  // If no context provided, return generic fallback
  if (!options?.screenContext) {
    return knowledge.fallbackResponses[language];
  }

  const { displayName, screenContext } = options;
  
  // PRODUCTION: Use screen-locked safe fallback
  // This explains the current screen's most important element
  return buildSafeFallbackResponse(
    screenContext as ScreenContext,
    language,
    displayName
  );
}

/**
 * Legacy screen-specific contextual fallbacks (kept for reference)
 * @deprecated Use buildSafeFallbackResponse from assistantScreenLock.ts instead
 */
function getLegacyContextualFallback(
  screenContext: string,
  displayName: string | undefined,
  language: "ar" | "en"
): string | null {
  // Screen-specific contextual fallbacks
  const contextualFallbacks: Record<string, { ar: string; en: string; suggestions: { ar: string[]; en: string[] } }> = {
    pos_main: {
      ar: "هذه شاشة إنشاء الطلبات.\nتساعدك على إضافة الأصناف للطلب واختيار نوع الطلب وإتمام الدفع.",
      en: "This is the Order Creation screen.\nIt helps you add items to orders, select order type, and complete payments.",
      suggestions: {
        ar: ["شرح طريقة إنشاء طلب", "كيف أعمل تخفيض؟", "شرح أنواع الطلبات"],
        en: ["Explain how to create an order", "How to apply a discount?", "Explain order types"]
      }
    },
    pos_tables: {
      ar: "هذه شاشة إدارة الطاولات.\nتعرض حالة جميع الطاولات والطلبات المرتبطة بها.",
      en: "This is the Table Management screen.\nIt shows the status of all tables and their associated orders.",
      suggestions: {
        ar: ["كيف أربط طلب بطاولة؟", "شرح دمج الطاولات", "كيف أنقل طلب لطاولة أخرى؟"],
        en: ["How to assign order to table?", "Explain table merging", "How to transfer order to another table?"]
      }
    },
    pos_open_orders: {
      ar: "هذه شاشة الطلبات المفتوحة.\nتعرض جميع الطلبات النشطة التي لم تُدفع بعد.",
      en: "This is the Open Orders screen.\nIt displays all active orders that haven't been paid yet.",
      suggestions: {
        ar: ["كيف أستأنف طلب معلق؟", "شرح حالات الطلب", "كيف ألغي طلب؟"],
        en: ["How to resume a held order?", "Explain order statuses", "How to cancel an order?"]
      }
    },
    pos_qr_pending: {
      ar: "هذه شاشة طلبات QR المعلقة.\nتعرض الطلبات الواردة من العملاء عبر رمز QR.",
      en: "This is the QR Pending Orders screen.\nIt shows orders received from customers via QR code.",
      suggestions: {
        ar: ["كيف أقبل طلب QR؟", "كيف أرفض طلب QR؟", "شرح نظام QR"],
        en: ["How to accept a QR order?", "How to reject a QR order?", "Explain QR system"]
      }
    },
    owner_dashboard: {
      ar: "هذه لوحة تحكم صاحب المطعم.\nتعرض نظرة عامة على أداء المطعم والمبيعات.",
      en: "This is the Owner Dashboard.\nIt provides an overview of restaurant performance and sales.",
      suggestions: {
        ar: ["شرح مؤشرات الأداء", "كيف أقرأ التقارير؟", "شرح الإعدادات"],
        en: ["Explain performance indicators", "How to read reports?", "Explain settings"]
      }
    },
    owner_menu: {
      ar: "هذه شاشة إدارة القائمة.\nتتيح لك إضافة وتعديل الأصناف والتصنيفات.",
      en: "This is the Menu Management screen.\nIt allows you to add and edit items and categories.",
      suggestions: {
        ar: ["كيف أضيف صنف جديد؟", "شرح الكومبو", "كيف أعدل السعر؟"],
        en: ["How to add a new item?", "Explain combos", "How to change price?"]
      }
    },
    owner_inventory: {
      ar: "هذه شاشة إدارة المخزون.\nتتيح لك تتبع المواد واستلام البضائع ومراقبة المستويات.",
      en: "This is the Inventory Management screen.\nIt allows you to track items, receive goods, and monitor levels.",
      suggestions: {
        ar: ["كيف أستلم بضاعة؟", "شرح الوصفات", "كيف أعمل جرد؟"],
        en: ["How to receive goods?", "Explain recipes", "How to do stock count?"]
      }
    },
    owner_reports: {
      ar: "هذه شاشة التقارير.\nتعرض تقارير المبيعات والأداء والتحليلات.",
      en: "This is the Reports screen.\nIt displays sales, performance, and analytics reports.",
      suggestions: {
        ar: ["ما هو تقرير Z؟", "شرح تقرير المبيعات", "كيف أصدر تقرير؟"],
        en: ["What is Z Report?", "Explain sales report", "How to export a report?"]
      }
    },
    owner_staff: {
      ar: "هذه شاشة إدارة الموظفين.\nتتيح لك إضافة موظفين وتعديل صلاحياتهم.",
      en: "This is the Staff Management screen.\nIt allows you to add staff and modify their permissions.",
      suggestions: {
        ar: ["كيف أضيف كاشير؟", "شرح الصلاحيات", "كيف أعيد تعيين كلمة المرور؟"],
        en: ["How to add a cashier?", "Explain permissions", "How to reset password?"]
      }
    },
    owner_settings: {
      ar: "هذه شاشة الإعدادات.\nتتيح لك تعديل إعدادات المطعم والضرائب والخصومات.",
      en: "This is the Settings screen.\nIt allows you to modify restaurant settings, taxes, and discounts.",
      suggestions: {
        ar: ["كيف أعدل الضريبة؟", "شرح إعدادات الخصم", "كيف أفعّل المخزون؟"],
        en: ["How to change tax rate?", "Explain discount settings", "How to enable inventory?"]
      }
    },
    kds: {
      ar: "هذه شاشة عرض المطبخ (KDS).\nتعرض الطلبات الواردة للتحضير.",
      en: "This is the Kitchen Display Screen (KDS).\nIt shows incoming orders for preparation.",
      suggestions: {
        ar: ["كيف أغير حالة الطلب؟", "شرح ألوان الطلبات", "اختصارات لوحة المفاتيح"],
        en: ["How to change order status?", "Explain order colors", "Keyboard shortcuts"]
      }
    },
    system_admin: {
      ar: "هذه شاشة إدارة النظام.\nتتيح لك إدارة المطاعم والمستخدمين وإعدادات النظام.",
      en: "This is the System Administration screen.\nIt allows you to manage restaurants, users, and system settings.",
      suggestions: {
        ar: ["كيف أضيف مطعم؟", "كيف أضيف صاحب مطعم؟", "كيف أعيد تعيين كلمة المرور؟"],
        en: ["How to add a restaurant?", "How to add an owner?", "How to reset password?"]
      }
    }
  };

  const contextData = contextualFallbacks[screenContext];
  
  if (!contextData) {
    return knowledge.fallbackResponses[language];
  }

  // Build contextual response
  const greeting = displayName 
    ? (language === "ar" ? `مرحباً ${displayName}،` : `Hello ${displayName},`)
    : (language === "ar" ? "مرحباً،" : "Hello,");
  
  const screenDescription = contextData[language];
  const suggestions = contextData.suggestions[language];
  
  const suggestionsText = language === "ar"
    ? `\n\nيمكنك سؤالي عن:\n• ${suggestions.join("\n• ")}`
    : `\n\nYou can ask me to:\n• ${suggestions.join("\n• ")}`;
  
  return `${greeting}\n\n${screenDescription}${suggestionsText}`;
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

/**
 * Get critical system rules for a specific role
 * These rules override any previous assumptions
 */
export function getSystemRulesForRole(
  role: string,
  language: "ar" | "en"
): SystemRule[] {
  if (!knowledge.systemRules) return [];
  
  return knowledge.systemRules.filter(rule =>
    rule.affected_roles.includes(role)
  );
}

/**
 * Get the Owner Branch Context rule specifically
 * This is a mandatory rule that must be enforced
 */
export function getOwnerBranchContextRule(language: "ar" | "en"): {
  title: string;
  rules: string[];
} | null {
  const rule = knowledge.systemRules?.find(r => r.id === "owner_branch_context");
  if (!rule) return null;
  
  return {
    title: rule.title[language],
    rules: rule.rules[language],
  };
}

/**
 * Check if branch context is required for a given operation
 */
export function requiresBranchContext(role: string): boolean {
  if (role !== "owner") return false;
  
  const rule = knowledge.systemRules?.find(r => 
    r.id === "owner_branch_context" && 
    r.priority === "critical"
  );
  
  return !!rule;
}
