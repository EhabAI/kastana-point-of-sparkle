// Kastana POS Smart Trainer - Active Topic Tracker
// Implements context preservation and intelligent follow-up handling
// CRITICAL: Maintains conversation context and prevents unwanted topic switches

import type { ScreenContext } from "@/lib/smartAssistantContext";

export interface ActiveTopic {
  id: string;
  name: {
    ar: string;
    en: string;
  };
  screen: ScreenContext;
  timestamp: number;
}

// Follow-up phrases that MUST continue the same topic (Arabic)
const ARABIC_FOLLOW_UP_PHRASES = [
  "اشرح أكثر",
  "اشرح اكثر",
  "وضح",
  "وضّح",
  "مش فاهم",
  "مافهمت",
  "ما فهمت",
  "كمّل",
  "كمل",
  "كيف يعني",
  "ليش",
  "لماذا",
  "شو السبب",
  "ايش السبب",
  "وش السبب",
  "طيب وبعدين",
  "وبعدين",
  "يعني ايش",
  "يعني شو",
  "يعني وش",
  "ما فهمت",
  "مش واضح",
  "غير واضح",
  "زيادة شرح",
  "شرح اكثر",
  "فصّل",
  "فصل",
  "تفصيل",
  "أكثر",
  "اكثر",
  "بالتفصيل",
  "تفاصيل",
  "ممكن توضح",
  "ممكن تشرح",
  "عطيني مثال",
  "مثال",
  "مثلا",
  "كيف بالضبط",
  "ايش الخطوات",
  "شو الخطوات",
  "خطوة بخطوة",
  "زي ايش",
  "مثل ايش",
  "ازاي",
  "إزاي",
];

// Follow-up phrases that MUST continue the same topic (English)
const ENGLISH_FOLLOW_UP_PHRASES = [
  "explain more",
  "more details",
  "what do you mean",
  "i don't understand",
  "can you explain",
  "clarify",
  "elaborate",
  "why",
  "why is that",
  "how exactly",
  "what's the reason",
  "tell me more",
  "go on",
  "continue",
  "step by step",
  "give me an example",
  "example please",
  "for example",
  "like what",
  "how so",
  "what does that mean",
  "meaning",
  "not clear",
  "unclear",
  "details",
  "in detail",
];

// Explicit topic switch phrases (Arabic)
const ARABIC_TOPIC_SWITCH_PHRASES = [
  "سؤال ثاني",
  "سؤال تاني",
  "غير موضوع",
  "موضوع ثاني",
  "موضوع تاني",
  "بعيدًا عن هذا",
  "بعيدا عن هذا",
  "خلينا ننتقل",
  "ننتقل إلى",
  "ننتقل الى",
  "بالنسبة ل",
  "عن موضوع",
  "شي ثاني",
  "شي تاني",
  "حاجة تانية",
  "شغلة ثانية",
];

// Explicit topic switch phrases (English)
const ENGLISH_TOPIC_SWITCH_PHRASES = [
  "different question",
  "another question",
  "change topic",
  "new topic",
  "moving on",
  "let's talk about",
  "switching to",
  "about something else",
  "different thing",
  "on another note",
  "by the way",
  "regarding",
];

// Screen reference keywords that indicate explicit screen switch
const SCREEN_REFERENCE_KEYWORDS: Record<string, ScreenContext[]> = {
  // Arabic screen references
  "شاشة المطبخ": ["kds"],
  "المطبخ": ["kds"],
  "kds": ["kds"],
  "الكاشير": ["pos_main", "pos_tables"],
  "نقطة البيع": ["pos_main"],
  "pos": ["pos_main"],
  "التقارير": ["owner_dashboard", "owner_reports"],
  "لوحة التحكم": ["owner_dashboard"],
  "الداشبورد": ["owner_dashboard"],
  "الإعدادات": ["owner_settings"],
  "إعدادات": ["owner_settings"],
  "المخزون": ["owner_inventory"],
  "الجرد": ["owner_inventory"],
  "inventory": ["owner_inventory"],
  "الموظفين": ["owner_staff"],
  "القائمة": ["owner_menu"],
  "المنيو": ["owner_menu"],
  "الطاولات": ["pos_tables"],
  "طاولات": ["pos_tables"],
  // English screen references
  "kitchen screen": ["kds"],
  "kitchen display": ["kds"],
  "cashier": ["pos_main"],
  "point of sale": ["pos_main"],
  "reports": ["owner_dashboard", "owner_reports"],
  "dashboard": ["owner_dashboard"],
  "settings": ["owner_settings"],
  "staff": ["owner_staff"],
  "menu management": ["owner_menu"],
  "tables": ["pos_tables"],
};

// Feature keywords that indicate explicit topic switch
const FEATURE_KEYWORDS: Record<string, string[]> = {
  refund: ["refund", "مرتجع", "استرداد", "ارجاع"],
  shift: ["shift", "وردية", "الوردية", "شفت"],
  z_report: ["z report", "z-report", "تقرير z", "زي ريبورت", "تقرير زد"],
  payment: ["payment", "دفع", "الدفع", "فاتورة"],
  discount: ["discount", "خصم", "تخفيض"],
  inventory: ["inventory", "مخزون", "جرد", "المخزون"],
  recipe: ["recipe", "وصفة", "الوصفات"],
  table: ["table", "طاولة", "الطاولة", "طاولات"],
  order: ["order", "طلب", "الطلب", "طلبات"],
  void: ["void", "الغاء", "إلغاء", "حذف طلب"],
  hold: ["hold", "تعليق", "معلق"],
  merge: ["merge", "دمج", "جمع"],
  transfer: ["transfer", "نقل", "تحويل"],
  kds: ["kds", "kitchen", "مطبخ", "شاشة المطبخ"],
  qr: ["qr", "qr code", "كيو ار", "رمز"],
};

/**
 * Detect if message is a follow-up that should continue the active topic
 */
export function isFollowUpPhrase(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check Arabic follow-up phrases
  for (const phrase of ARABIC_FOLLOW_UP_PHRASES) {
    if (normalizedMessage.includes(phrase) || normalizedMessage === phrase) {
      return true;
    }
  }
  
  // Check English follow-up phrases
  for (const phrase of ENGLISH_FOLLOW_UP_PHRASES) {
    if (normalizedMessage.includes(phrase) || normalizedMessage === phrase) {
      return true;
    }
  }
  
  // Very short messages (1-3 words) are often follow-ups
  const wordCount = normalizedMessage.split(/\s+/).length;
  if (wordCount <= 3) {
    // Check for common short follow-up patterns
    const shortPatterns = [
      "?", "؟", "ليش", "كيف", "ايش", "شو", "وش", 
      "why", "how", "what", "when", "وضح", "اشرح"
    ];
    return shortPatterns.some(p => normalizedMessage.includes(p));
  }
  
  return false;
}

/**
 * Detect if message explicitly requests a topic switch
 */
export function isExplicitTopicSwitch(message: string): boolean {
  const normalizedMessage = message.toLowerCase().trim();
  
  // Check Arabic switch phrases
  for (const phrase of ARABIC_TOPIC_SWITCH_PHRASES) {
    if (normalizedMessage.includes(phrase)) {
      return true;
    }
  }
  
  // Check English switch phrases
  for (const phrase of ENGLISH_TOPIC_SWITCH_PHRASES) {
    if (normalizedMessage.includes(phrase)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Detect if message references a different screen explicitly
 */
export function detectScreenReference(
  message: string, 
  currentScreen: ScreenContext
): ScreenContext | null {
  const normalizedMessage = message.toLowerCase().trim();
  
  for (const [keyword, screens] of Object.entries(SCREEN_REFERENCE_KEYWORDS)) {
    if (normalizedMessage.includes(keyword.toLowerCase())) {
      // If any referenced screen is different from current, it's a screen switch
      const differentScreen = screens.find(s => !isSameScreenGroup(s, currentScreen));
      if (differentScreen) {
        return differentScreen;
      }
    }
  }
  
  return null;
}

/**
 * Check if two screens belong to the same logical group
 */
function isSameScreenGroup(screen1: ScreenContext, screen2: ScreenContext): boolean {
  const posScreens: ScreenContext[] = ["pos_main", "pos_tables", "pos_open_orders", "pos_qr_pending"];
  const ownerScreens: ScreenContext[] = [
    "owner_dashboard", "owner_reports", "owner_inventory", 
    "owner_menu", "owner_staff", "owner_settings"
  ];
  const kdsScreens: ScreenContext[] = ["kds"];
  
  if (posScreens.includes(screen1) && posScreens.includes(screen2)) return true;
  if (ownerScreens.includes(screen1) && ownerScreens.includes(screen2)) return true;
  if (kdsScreens.includes(screen1) && kdsScreens.includes(screen2)) return true;
  
  return screen1 === screen2;
}

/**
 * Detect if message mentions a specific feature that differs from active topic
 */
export function detectFeatureMention(
  message: string, 
  activeTopicId: string | null
): string | null {
  const normalizedMessage = message.toLowerCase().trim();
  
  for (const [featureId, keywords] of Object.entries(FEATURE_KEYWORDS)) {
    // Skip if this is already the active topic
    if (activeTopicId && activeTopicId.includes(featureId)) {
      continue;
    }
    
    for (const keyword of keywords) {
      if (normalizedMessage.includes(keyword.toLowerCase())) {
        return featureId;
      }
    }
  }
  
  return null;
}

/**
 * Determine if the message should continue the active topic or switch
 */
export function shouldContinueActiveTopic(
  message: string,
  activeTopic: ActiveTopic | null,
  currentScreen: ScreenContext
): { continue: boolean; reason: string; newTopicHint?: string } {
  // No active topic - cannot continue
  if (!activeTopic) {
    return { continue: false, reason: "no_active_topic" };
  }
  
  // Check if it's an explicit topic switch request
  if (isExplicitTopicSwitch(message)) {
    return { continue: false, reason: "explicit_switch" };
  }
  
  // Check if it references a different screen
  const screenRef = detectScreenReference(message, currentScreen);
  if (screenRef) {
    return { 
      continue: false, 
      reason: "screen_reference", 
      newTopicHint: `screen:${screenRef}` 
    };
  }
  
  // Check if it's a follow-up phrase - MUST continue
  if (isFollowUpPhrase(message)) {
    return { continue: true, reason: "follow_up_phrase" };
  }
  
  // Check for explicit feature mention different from active topic
  const featureMention = detectFeatureMention(message, activeTopic.id);
  if (featureMention) {
    return { 
      continue: false, 
      reason: "feature_mention", 
      newTopicHint: featureMention 
    };
  }
  
  // Default: if message is short/ambiguous, continue active topic
  const wordCount = message.trim().split(/\s+/).length;
  if (wordCount <= 5) {
    return { continue: true, reason: "short_ambiguous" };
  }
  
  // Longer messages need more analysis - default to continue if no clear switch signal
  return { continue: true, reason: "default_continue" };
}

/**
 * Generate a clarification question when context is truly ambiguous
 */
export function generateClarificationQuestion(
  ambiguousTerm: string,
  currentScreen: ScreenContext,
  language: "ar" | "en"
): string {
  // Map common ambiguous terms to clarification questions
  const clarifications: Record<string, { ar: string; en: string }> = {
    send: {
      ar: "هل تقصد زر إرسال الطلب من شاشة الكاشير أم إدارة الطلب داخل شاشة المطبخ؟",
      en: "Do you mean the 'Send to Kitchen' button on the cashier screen or managing orders in the kitchen display?"
    },
    order: {
      ar: "هل تقصد إنشاء طلب جديد أم إدارة طلب موجود؟",
      en: "Do you mean creating a new order or managing an existing order?"
    },
    report: {
      ar: "هل تقصد تقرير Z للوردية أم تقارير المبيعات في لوحة التحكم؟",
      en: "Do you mean the shift Z Report or the sales reports in the dashboard?"
    },
  };
  
  const clarification = clarifications[ambiguousTerm];
  if (clarification) {
    return clarification[language];
  }
  
  // Default clarification
  return language === "ar" 
    ? "هل يمكنك توضيح المزيد عما تريد معرفته؟"
    : "Could you clarify what you'd like to know more about?";
}

/**
 * Get response prefix for continuing active topic
 */
export function getContinuationPrefix(
  activeTopic: ActiveTopic,
  language: "ar" | "en"
): string {
  const topicName = activeTopic.name[language];
  
  return language === "ar"
    ? `بخصوص ${topicName}:\n\n`
    : `Regarding ${topicName}:\n\n`;
}

/**
 * Check if the topic is allowed on the current screen
 */
export function isTopicAllowedOnCurrentScreen(
  topicId: string,
  currentScreen: ScreenContext
): boolean {
  // POS screens can discuss POS topics
  const posTopics = ["refund", "shift", "z_report", "payment", "discount", "order", "void", "hold", "merge", "transfer", "qr"];
  const posScreens: ScreenContext[] = ["pos_main", "pos_tables", "pos_open_orders", "pos_qr_pending"];
  
  // Owner screens can discuss owner topics
  const ownerTopics = ["inventory", "recipe", "reports", "settings", "staff", "menu", "branches"];
  const ownerScreens: ScreenContext[] = ["owner_dashboard", "owner_reports", "owner_inventory", "owner_menu", "owner_staff", "owner_settings"];
  
  // KDS topics only on KDS screen
  const kdsTopics = ["kds", "kitchen"];
  const kdsScreens: ScreenContext[] = ["kds"];
  
  // Check topic-screen alignment
  if (posTopics.some(t => topicId.includes(t)) && posScreens.includes(currentScreen)) {
    return true;
  }
  
  if (ownerTopics.some(t => topicId.includes(t)) && ownerScreens.includes(currentScreen)) {
    return true;
  }
  
  if (kdsTopics.some(t => topicId.includes(t)) && kdsScreens.includes(currentScreen)) {
    return true;
  }
  
  // If no specific rule matches, allow general topics
  return true;
}

/**
 * Generate response when user asks about a feature not on current screen
 */
export function getScreenLockedResponse(
  requestedScreen: ScreenContext,
  currentScreen: ScreenContext,
  language: "ar" | "en"
): string {
  const screenNames: Record<ScreenContext, { ar: string; en: string }> = {
    pos_main: { ar: "شاشة الكاشير", en: "Cashier Screen" },
    pos_tables: { ar: "شاشة الطاولات", en: "Tables Screen" },
    pos_open_orders: { ar: "الطلبات المفتوحة", en: "Open Orders" },
    pos_qr_pending: { ar: "طلبات QR", en: "QR Orders" },
    owner_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
    owner_menu: { ar: "إدارة القائمة", en: "Menu Management" },
    owner_staff: { ar: "إدارة الموظفين", en: "Staff Management" },
    owner_inventory: { ar: "إدارة المخزون", en: "Inventory Management" },
    owner_reports: { ar: "التقارير", en: "Reports" },
    owner_settings: { ar: "الإعدادات", en: "Settings" },
    system_admin: { ar: "إدارة النظام", en: "System Admin" },
    kds: { ar: "شاشة المطبخ", en: "Kitchen Display" },
    login: { ar: "تسجيل الدخول", en: "Login" },
    unknown: { ar: "غير معروف", en: "Unknown" },
  };
  
  const requested = screenNames[requestedScreen]?.[language] || requestedScreen;
  const current = screenNames[currentScreen]?.[language] || currentScreen;
  
  return language === "ar"
    ? `هذه الميزة متوفرة في "${requested}". أنت حالياً في "${current}". هل تريد أن أشرح لك ما يمكنك فعله هنا؟`
    : `This feature is available in "${requested}". You're currently in "${current}". Would you like me to explain what you can do here?`;
}
