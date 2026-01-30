// Kastana POS Assistant - Domain Guard
// Hard-locks assistant to Kastana POS domain ONLY
// All queries outside scope are politely refused

import knowledgeData from "@/data/assistant_knowledge.json";

export interface DomainCheckResult {
  isAllowed: boolean;
  matchedKeywords: string[];
  confidence: number;
}

// Kastana POS domain keywords - comprehensive list
const KASTANA_DOMAIN_KEYWORDS = {
  ar: [
    // System
    "kastana", "كاستانا", "نظام", "البرنامج", "التطبيق", "الشاشة", "لوحة",
    // POS Operations
    "كاشير", "طلب", "طلبات", "فاتورة", "فواتير", "دفع", "نقد", "بطاقة",
    "فيزا", "ماستركارد", "محفظة", "خصم", "ضريبة", "إجمالي", "مبلغ",
    "طاولة", "طاولات", "عميل", "زبون", "استلام", "توصيل", "تيك اواي",
    "takeaway", "dine-in", "صالة", "سفري",
    // Menu
    "قائمة", "منيو", "صنف", "أصناف", "فئة", "فئات", "سعر", "أسعار",
    // Inventory
    "مخزون", "مخازن", "كمية", "وحدة", "نقل", "هدر", "جرد", "variance",
    // Staff & Shifts
    "موظف", "موظفين", "مالك", "owner", "وردية", "شفت", "shift",
    "فتح", "إغلاق", "افتتاحي", "z report", "تقرير z", "تقرير زد",
    // Reports
    "تقرير", "تقارير", "إحصائيات", "مبيعات", "أرباح", "تكلفة", "هامش",
    "gross", "net", "صافي", "إجمالي",
    // Settings
    "إعدادات", "ضبط", "فرع", "فروع", "مطعم",
    // KDS
    "مطبخ", "شاشة المطبخ", "kds", "تحضير", "جاهز", "قيد التحضير",
    "شيف", "طباخ", "أداء المطبخ", "وقت التحضير",
    // Actions
    "تعليق", "hold", "دمج", "merge", "نقل", "transfer", "إلغاء", "void",
    "مرتجع", "refund", "استرداد",
    // Permissions
    "صلاحية", "صلاحيات", "دور", "أدوار", "حظر", "سماح",
    // Common questions
    "كيف", "لماذا", "أين", "متى", "مشكلة", "خطأ", "لا يعمل", "معطل",
  ],
  en: [
    // System
    "kastana", "pos", "system", "app", "application", "screen", "dashboard",
    // POS Operations
    "cashier", "order", "orders", "invoice", "payment", "pay", "cash", "card",
    "visa", "mastercard", "wallet", "discount", "tax", "total", "amount",
    "table", "tables", "customer", "pickup", "delivery", "takeaway", "dine-in",
    // Menu
    "menu", "item", "items", "category", "categories", "price", "prices",
    // Inventory
    "inventory", "stock", "quantity", "unit", "receive", "transfer", "waste", "count",
    "variance",
    // Staff & Shifts
    "staff", "employee", "owner", "shift", "open", "close", "z report", "z-report",
    // Reports
    "report", "reports", "statistics", "sales", "profit", "cost", "margin", "cogs",
    "gross", "net", "revenue",
    // Settings
    "settings", "branch", "branches", "restaurant",
    // KDS
    "kitchen", "kitchen display", "kds", "cooking", "ready", "in progress",
    "chef", "cook", "kitchen performance", "prep time", "preparation",
    // Actions
    "hold", "merge", "transfer", "void", "refund", "cancel",
    // Permissions
    "permission", "permissions", "role", "roles", "access", "allow", "deny",
    // Common questions
    "how", "why", "where", "when", "problem", "error", "not working", "disabled",
  ],
};

// Explicitly blocked topics
const BLOCKED_TOPICS = {
  ar: [
    "طبخ", "وصفة", "وصفات", "مكونات", "طبق",
    "أخبار", "رياضة", "سياسة", "طقس", "جو",
    "برمجة", "كود", "javascript", "python", "react",
    "أغنية", "فيلم", "مسلسل", "موسيقى",
    "سفر", "فندق", "حجز رحلة", "طيران",
    "صحة", "دواء", "علاج", "طبيب",
    "ذكاء اصطناعي", "chatgpt", "gpt",
    "رأيك", "ماذا تفضل", "احكي لي", "قصة",
  ],
  en: [
    "recipe", "cook", "cooking", "ingredients", "dish",
    "news", "sports", "politics", "weather",
    "code", "programming", "javascript", "python", "react",
    "song", "movie", "series", "music",
    "travel", "hotel", "book flight", "airline",
    "health", "medicine", "treatment", "doctor",
    "artificial intelligence", "chatgpt", "gpt",
    "your opinion", "what do you think", "tell me a story", "joke",
  ],
};

/**
 * Check if a message is within Kastana POS domain
 */
export function domainGuard(
  message: string,
  context?: { role?: string; screen?: string }
): DomainCheckResult {
  const lowerMessage = message.toLowerCase().trim();
  
  // Short greetings are always allowed
  if (lowerMessage.length < 15) {
    const greetings = ["مرحبا", "السلام", "أهلا", "هلا", "hello", "hi", "hey"];
    if (greetings.some(g => lowerMessage.includes(g))) {
      return { isAllowed: true, matchedKeywords: ["greeting"], confidence: 1.0 };
    }
  }
  
  // Check for blocked topics first
  const blockedMatch = [...BLOCKED_TOPICS.ar, ...BLOCKED_TOPICS.en]
    .filter(topic => lowerMessage.includes(topic.toLowerCase()));
  
  // Check for Kastana domain keywords
  const domainMatches = [...KASTANA_DOMAIN_KEYWORDS.ar, ...KASTANA_DOMAIN_KEYWORDS.en]
    .filter(keyword => lowerMessage.includes(keyword.toLowerCase()));
  
  // Check knowledge base keywords
  const knowledgeMatches = checkKnowledgeKeywords(lowerMessage);
  
  const allMatches = [...new Set([...domainMatches, ...knowledgeMatches])];
  
  // If blocked topic found AND no Kastana context, reject
  if (blockedMatch.length > 0 && allMatches.length === 0) {
    return { isAllowed: false, matchedKeywords: [], confidence: 0.9 };
  }
  
  // If has Kastana context, allow
  if (allMatches.length > 0) {
    return { 
      isAllowed: true, 
      matchedKeywords: allMatches.slice(0, 5), 
      confidence: Math.min(0.5 + allMatches.length * 0.1, 1.0) 
    };
  }
  
  // Long message with no Kastana context - likely off-topic
  if (lowerMessage.length > 30 && allMatches.length === 0) {
    return { isAllowed: false, matchedKeywords: [], confidence: 0.7 };
  }
  
  // Short ambiguous messages - allow with low confidence
  return { isAllowed: true, matchedKeywords: [], confidence: 0.3 };
}

// Type for knowledge entries
interface KnowledgeDataEntry {
  keywords?: {
    ar?: string[];
    en?: string[];
  };
}

interface KnowledgeData {
  entries?: Record<string, KnowledgeDataEntry>;
}

/**
 * Check message against knowledge base keywords
 */
function checkKnowledgeKeywords(message: string): string[] {
  const matches: string[] = [];
  const data = knowledgeData as unknown as KnowledgeData;
  const entries = Object.values(data.entries || {});
  
  for (const entry of entries) {
    const keywords = entry.keywords;
    if (keywords) {
      const allKeywords = [...(keywords.ar || []), ...(keywords.en || [])];
      for (const kw of allKeywords) {
        if (message.includes(kw.toLowerCase())) {
          matches.push(kw);
        }
      }
    }
  }
  
  return matches;
}

/**
 * Get domain refusal message in the specified language
 * Brand name is localized based on language
 */
export function getDomainRefusal(language: "ar" | "en"): string {
  const brandName = language === "ar" ? "كاستنا" : "Kastana";
  if (language === "ar") {
    return `أنا مخصص لمساعدتك داخل نظام ${brandName} POS فقط.

يمكنني مساعدتك في:
• شرح كيفية استخدام شاشات النظام
• توضيح التقارير (Z Report، المبيعات، المخزون)
• حل المشاكل التقنية في النظام
• شرح سبب تعطل بعض الميزات

كيف يمكنني مساعدتك في نظام ${brandName}؟`;
  }
  
  return `I'm designed to help you only within the ${brandName} POS system.

I can assist you with:
• Explaining how to use system screens
• Clarifying reports (Z Report, Sales, Inventory)
• Troubleshooting technical issues
• Explaining why certain features are disabled

How can I help you with ${brandName}?`;
}

/**
 * Check if message requires admin-level response
 */
export function requiresAdminContext(message: string): boolean {
  const adminKeywords = [
    "صلاحية", "صلاحيات", "permission", "permissions",
    "تفعيل", "enable", "disable", "إيقاف",
    "addon", "إضافة", "add-on",
    "system admin", "مدير النظام",
  ];
  
  const lowerMessage = message.toLowerCase();
  return adminKeywords.some(kw => lowerMessage.includes(kw.toLowerCase()));
}
