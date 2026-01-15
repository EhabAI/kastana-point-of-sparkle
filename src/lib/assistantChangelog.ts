/**
 * Kastana Smart Guided Assistant - Changelog System
 * Lightweight "What's New" feature alerts
 */

// Changelog entry structure
export interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  roles: string[]; // Which roles should see this
  knowledgeId?: string; // Link to knowledge base entry for "Explain"
}

// Changelog data - add new entries at the top
const CHANGELOG: ChangelogEntry[] = [
  {
    id: "smart_rules_bundle_1",
    version: "2.1.0",
    date: "2026-01-15",
    title: { 
      ar: "ميزات ذكية جديدة", 
      en: "New Smart Features" 
    },
    description: { 
      ar: "تنبيهات ذكية، ملخص نهاية اليوم، مؤشر الثقة، واقتراحات الإجراءات.",
      en: "Smart alerts, end-of-day summary, confidence score, and action suggestions."
    },
    roles: ["owner", "cashier"],
    knowledgeId: "smart_features_overview"
  },
  {
    id: "time_based_alerts_1",
    version: "2.1.0",
    date: "2026-01-15",
    title: { 
      ar: "تنبيهات زمنية ذكية", 
      en: "Time-Based Alerts" 
    },
    description: { 
      ar: "تنبيهات تلقائية للطلبات المفتوحة طويلاً والورديات الممتدة.",
      en: "Automatic alerts for long-open orders and extended shifts."
    },
    roles: ["cashier", "owner"],
    knowledgeId: "time_based_alerts_explained"
  },
  {
    id: "mistake_pattern_1",
    version: "2.1.0",
    date: "2026-01-15",
    title: { 
      ar: "كاشف الأنماط", 
      en: "Mistake Pattern Detector" 
    },
    description: { 
      ar: "يكتشف الأنماط المتكررة مثل الإلغاءات المتعددة.",
      en: "Detects repeated patterns like multiple voids or refunds."
    },
    roles: ["owner"],
    knowledgeId: "mistake_pattern_detector_explained"
  },
  {
    id: "system_confidence_1",
    version: "2.1.0",
    date: "2026-01-15",
    title: { 
      ar: "مؤشر ثقة النظام", 
      en: "System Confidence Score" 
    },
    description: { 
      ar: "درجة يومية تعكس جودة العمليات: ممتاز، جيد، يحتاج انتباه.",
      en: "Daily score reflecting operational quality: Excellent, Good, Needs Attention."
    },
    roles: ["owner"],
    knowledgeId: "system_confidence_score_explained"
  },
  {
    id: "consumption_variance_2c",
    version: "2.0.0",
    date: "2026-01-15",
    title: { 
      ar: "تحليل فروقات الاستهلاك", 
      en: "Consumption Variance Analysis" 
    },
    description: { 
      ar: "قارن الاستهلاك النظري (من الوصفات) بالاستهلاك الفعلي واكتشف مصادر الهدر.",
      en: "Compare theoretical consumption (from recipes) with actual usage and discover waste sources."
    },
    roles: ["owner"],
    knowledgeId: "inventory_variance_report"
  },
  {
    id: "smart_assistant_2",
    version: "2.0.0",
    date: "2026-01-15",
    title: { 
      ar: "المساعد الذكي الجديد", 
      en: "New Smart Assistant" 
    },
    description: { 
      ar: "مساعد يتدخل تلقائياً عند الحاجة ويدربك حسب السياق.",
      en: "Assistant that intervenes automatically when needed and trains you based on context."
    },
    roles: ["cashier", "owner", "kitchen"]
  },
  {
    id: "kds_addon_1",
    version: "1.5.0",
    date: "2026-01-10",
    title: { 
      ar: "شاشة المطبخ (KDS)", 
      en: "Kitchen Display System (KDS)" 
    },
    description: { 
      ar: "إضافة جديدة تعرض الطلبات للمطبخ بشكل مرئي.",
      en: "New add-on that displays orders to kitchen visually."
    },
    roles: ["owner", "kitchen"],
    knowledgeId: "kds_overview"
  },
  {
    id: "inventory_insights_1",
    version: "1.4.0",
    date: "2026-01-05",
    title: { 
      ar: "تحليلات المخزون", 
      en: "Inventory Insights" 
    },
    description: { 
      ar: "رسوم بيانية وتنبيهات ذكية لفروقات المخزون.",
      en: "Charts and smart alerts for inventory variances."
    },
    roles: ["owner"],
    knowledgeId: "inventory_insights"
  }
];

// Storage key for tracking seen changelog entries
const CHANGELOG_SEEN_KEY = "kastana_changelog_seen";

/**
 * Get IDs of seen changelog entries
 */
function getSeenEntries(): string[] {
  try {
    const stored = localStorage.getItem(CHANGELOG_SEEN_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Mark a changelog entry as seen
 */
export function markChangelogSeen(entryId: string): void {
  const seen = getSeenEntries();
  if (!seen.includes(entryId)) {
    seen.push(entryId);
    localStorage.setItem(CHANGELOG_SEEN_KEY, JSON.stringify(seen));
  }
}

/**
 * Mark all changelog entries as seen
 */
export function markAllChangelogSeen(): void {
  const allIds = CHANGELOG.map(entry => entry.id);
  localStorage.setItem(CHANGELOG_SEEN_KEY, JSON.stringify(allIds));
}

/**
 * Get unseen changelog entries for a specific role
 */
export function getUnseenChangelog(role: string): ChangelogEntry[] {
  const seen = getSeenEntries();
  
  return CHANGELOG.filter(entry => 
    entry.roles.includes(role) && 
    !seen.includes(entry.id)
  );
}

/**
 * Get all changelog entries for a role
 */
export function getAllChangelogForRole(role: string): ChangelogEntry[] {
  return CHANGELOG.filter(entry => entry.roles.includes(role));
}

/**
 * Check if there are unseen features for a role
 */
export function hasUnseenFeatures(role: string): boolean {
  return getUnseenChangelog(role).length > 0;
}

/**
 * Get the count of unseen features
 */
export function getUnseenCount(role: string): number {
  return getUnseenChangelog(role).length;
}

/**
 * Get a specific changelog entry by ID
 */
export function getChangelogById(entryId: string): ChangelogEntry | null {
  return CHANGELOG.find(entry => entry.id === entryId) || null;
}

/**
 * Get the latest changelog entry for a role
 */
export function getLatestChangelog(role: string): ChangelogEntry | null {
  const entries = CHANGELOG.filter(entry => entry.roles.includes(role));
  return entries.length > 0 ? entries[0] : null;
}

/**
 * Reset all changelog seen state (for testing)
 */
export function resetChangelogSeen(): void {
  localStorage.removeItem(CHANGELOG_SEEN_KEY);
}
