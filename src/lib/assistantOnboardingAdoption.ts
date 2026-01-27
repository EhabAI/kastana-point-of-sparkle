// Kastana POS Smart Assistant - Onboarding & Adoption Module
// Provides role-based checklists and soft adoption nudges
// CRITICAL: Show checklist ONCE per session, never repeat

import type { ScreenContext } from "./smartAssistantContext";

// ============================================
// TYPES
// ============================================

export type UserRole = "cashier" | "owner" | "kitchen" | "system_admin";

export interface OnboardingChecklist {
  role: UserRole;
  title: { ar: string; en: string };
  items: { ar: string; en: string }[];
  completionHint: { ar: string; en: string };
}

export interface AdoptionNudge {
  id: string;
  featureId: string;
  condition: (context: AdoptionContext) => boolean;
  message: { ar: string; en: string };
  priority: "high" | "medium" | "low";
}

export interface AdoptionContext {
  userRole: UserRole | null;
  screenContext?: ScreenContext;
  inventoryEnabled?: boolean;
  kdsEnabled?: boolean;
  qrEnabled?: boolean;
  hasRecipes?: boolean;
  hasInventoryItems?: boolean;
  shiftOpen?: boolean;
}

// ============================================
// ONBOARDING CHECKLISTS (ROLE-BASED)
// ============================================

const ONBOARDING_CHECKLISTS: OnboardingChecklist[] = [
  {
    role: "cashier",
    title: {
      ar: "✅ البداية السريعة للكاشير",
      en: "✅ Quick Start for Cashier",
    },
    items: [
      { ar: "1️⃣ افتح وردية (Shift)", en: "1️⃣ Open a shift" },
      { ar: "2️⃣ أنشئ طلب جديد", en: "2️⃣ Create a new order" },
      { ar: "3️⃣ أضف أصناف للطلب", en: "3️⃣ Add items to the order" },
      { ar: "4️⃣ أرسل للمطبخ (إذا مفعّل)", en: "4️⃣ Send to kitchen (if enabled)" },
      { ar: "5️⃣ ادفع وأغلق الطلب", en: "5️⃣ Complete payment" },
    ],
    completionHint: {
      ar: "💡 عند انتهاء الشفت، أغلق الوردية لإصدار تقرير Z.",
      en: "💡 At end of shift, close it to generate Z Report.",
    },
  },
  {
    role: "owner",
    title: {
      ar: "✅ البداية السريعة للمالك",
      en: "✅ Quick Start for Owner",
    },
    items: [
      { ar: "1️⃣ راجع لوحة التحكم اليومية", en: "1️⃣ Review daily dashboard" },
      { ar: "2️⃣ أضف/عدّل أصناف القائمة", en: "2️⃣ Add/edit menu items" },
      { ar: "3️⃣ أضف وصفات للأصناف (إذا المخزون مفعّل)", en: "3️⃣ Add recipes (if inventory enabled)" },
      { ar: "4️⃣ راجع تقارير المبيعات", en: "4️⃣ Review sales reports" },
      { ar: "5️⃣ اضبط إعدادات المطعم", en: "5️⃣ Configure restaurant settings" },
    ],
    completionHint: {
      ar: "💡 الوصفات تساعدك تحسب التكلفة وتكتشف الفروقات.",
      en: "💡 Recipes help you calculate costs and detect variance.",
    },
  },
  {
    role: "kitchen",
    title: {
      ar: "✅ البداية السريعة للمطبخ",
      en: "✅ Quick Start for Kitchen",
    },
    items: [
      { ar: "1️⃣ راقب الطلبات الجديدة (أزرق)", en: "1️⃣ Watch new orders (blue)" },
      { ar: "2️⃣ ابدأ التحضير (برتقالي)", en: "2️⃣ Start preparing (orange)" },
      { ar: "3️⃣ علّم جاهز عند الانتهاء (أخضر)", en: "3️⃣ Mark ready when done (green)" },
      { ar: "4️⃣ الطلبات القديمة تظهر أولاً", en: "4️⃣ Oldest orders appear first" },
    ],
    completionHint: {
      ar: "💡 اضغط على الطلب لتغيير حالته.",
      en: "💡 Click on order to change its status.",
    },
  },
  {
    role: "system_admin",
    title: {
      ar: "✅ البداية السريعة لمدير النظام",
      en: "✅ Quick Start for System Admin",
    },
    items: [
      { ar: "1️⃣ أنشئ مطاعم جديدة", en: "1️⃣ Create new restaurants" },
      { ar: "2️⃣ أدر الاشتراكات", en: "2️⃣ Manage subscriptions" },
      { ar: "3️⃣ فعّل/عطّل المطاعم", en: "3️⃣ Activate/deactivate restaurants" },
      { ar: "4️⃣ أعد تعيين كلمات المرور", en: "4️⃣ Reset passwords" },
    ],
    completionHint: {
      ar: "💡 المطاعم غير النشطة لا تستطيع استخدام النظام.",
      en: "💡 Inactive restaurants cannot use the system.",
    },
  },
];

// ============================================
// ADOPTION NUDGES (SOFT, ONE-TIME)
// ============================================

const ADOPTION_NUDGES: AdoptionNudge[] = [
  {
    id: "nudge_recipes_missing",
    featureId: "recipes",
    condition: (ctx) => 
      ctx.userRole === "owner" && 
      ctx.inventoryEnabled === true && 
      ctx.hasRecipes === false,
    message: {
      ar: "💡 ملاحظة: إضافة الوصفات للأصناف تساعدك تحسب التكلفة وتقلل الهدر.",
      en: "💡 Note: Adding recipes to items helps calculate costs and reduce waste.",
    },
    priority: "high",
  },
  {
    id: "nudge_inventory_not_enabled",
    featureId: "inventory",
    condition: (ctx) => 
      ctx.userRole === "owner" && 
      ctx.inventoryEnabled === false,
    message: {
      ar: "💡 ملاحظة: تفعيل المخزون يساعدك تتبع المواد الخام وتكتشف الفروقات.",
      en: "💡 Note: Enabling inventory helps track raw materials and detect variance.",
    },
    priority: "medium",
  },
  {
    id: "nudge_kds_not_enabled",
    featureId: "kds",
    condition: (ctx) => 
      ctx.userRole === "owner" && 
      ctx.kdsEnabled === false,
    message: {
      ar: "💡 ملاحظة: شاشة المطبخ (KDS) تسرّع التحضير وتقلل الأخطاء.",
      en: "💡 Note: Kitchen Display (KDS) speeds up preparation and reduces errors.",
    },
    priority: "low",
  },
  {
    id: "nudge_shift_not_open",
    featureId: "shift",
    condition: (ctx) => 
      ctx.userRole === "cashier" && 
      ctx.shiftOpen === false &&
      ctx.screenContext === "pos_main",
    message: {
      ar: "💡 افتح وردية أولاً لتتمكن من قبول الطلبات والدفعات.",
      en: "💡 Open a shift first to accept orders and payments.",
    },
    priority: "high",
  },
];

// ============================================
// SESSION TRACKING (IN-MEMORY)
// ============================================

// Track shown checklists and nudges per session
const sessionShownChecklists = new Set<string>();
const sessionShownNudges = new Set<string>();

/**
 * Reset session tracking (call on logout or session end)
 */
export function resetOnboardingSession(): void {
  sessionShownChecklists.clear();
  sessionShownNudges.clear();
}

// ============================================
// ONBOARDING FUNCTIONS
// ============================================

/**
 * Get onboarding checklist for a role (returns null if already shown)
 */
export function getOnboardingChecklist(
  role: UserRole,
  language: "ar" | "en"
): string | null {
  const key = `checklist_${role}`;
  
  // Already shown this session
  if (sessionShownChecklists.has(key)) {
    return null;
  }
  
  const checklist = ONBOARDING_CHECKLISTS.find(c => c.role === role);
  if (!checklist) return null;
  
  // Mark as shown
  sessionShownChecklists.add(key);
  
  // Format checklist
  const parts: string[] = [
    checklist.title[language],
    "",
    ...checklist.items.map(item => item[language]),
    "",
    checklist.completionHint[language],
  ];
  
  return parts.join("\n");
}

/**
 * Check if onboarding checklist was already shown for a role
 */
export function wasOnboardingShown(role: UserRole): boolean {
  return sessionShownChecklists.has(`checklist_${role}`);
}

/**
 * Manually mark onboarding as shown (for external tracking)
 */
export function markOnboardingShown(role: UserRole): void {
  sessionShownChecklists.add(`checklist_${role}`);
}

// ============================================
// ADOPTION NUDGE FUNCTIONS
// ============================================

/**
 * Get applicable adoption nudge (returns null if already shown or not applicable)
 */
export function getAdoptionNudge(
  context: AdoptionContext,
  language: "ar" | "en"
): string | null {
  // Find applicable nudges
  const applicableNudges = ADOPTION_NUDGES.filter(nudge => {
    // Already shown this session
    if (sessionShownNudges.has(nudge.id)) {
      return false;
    }
    
    // Check condition
    return nudge.condition(context);
  });
  
  if (applicableNudges.length === 0) {
    return null;
  }
  
  // Pick highest priority nudge
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  applicableNudges.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  const nudge = applicableNudges[0];
  
  // Mark as shown
  sessionShownNudges.add(nudge.id);
  
  return nudge.message[language];
}

/**
 * Check if a specific nudge was already shown
 */
export function wasNudgeShown(nudgeId: string): boolean {
  return sessionShownNudges.has(nudgeId);
}

/**
 * Manually mark nudge as shown
 */
export function markNudgeShown(nudgeId: string): void {
  sessionShownNudges.add(nudgeId);
}

// ============================================
// SMART TRAINER DEEP-LINKING
// ============================================

interface TrainerDeepLink {
  feature: string;
  module: { ar: string; en: string };
  example?: { ar: string; en: string };
}

const TRAINER_DEEP_LINKS: Record<string, TrainerDeepLink> = {
  recipes: {
    feature: "recipes",
    module: { ar: "إدارة الوصفات", en: "Recipe Management" },
    example: { ar: "إضافة وصفة لصنف", en: "Adding recipe to item" },
  },
  inventory: {
    feature: "inventory",
    module: { ar: "إدارة المخزون", en: "Inventory Management" },
    example: { ar: "استلام مشتريات", en: "Receiving purchases" },
  },
  variance: {
    feature: "variance",
    module: { ar: "تحليل الفروقات", en: "Variance Analysis" },
    example: { ar: "تتبع الهدر", en: "Tracking waste" },
  },
  refund: {
    feature: "refund",
    module: { ar: "المرتجعات", en: "Refunds" },
    example: { ar: "مرتجع جزئي", en: "Partial refund" },
  },
  shift: {
    feature: "shift",
    module: { ar: "إدارة الورديات", en: "Shift Management" },
    example: { ar: "تقرير Z", en: "Z Report" },
  },
  hold_order: {
    feature: "hold_order",
    module: { ar: "تعليق واستئناف الطلبات", en: "Hold & Resume Orders" },
  },
  merge_orders: {
    feature: "merge_orders",
    module: { ar: "دمج الطلبات", en: "Merge Orders" },
  },
  kds: {
    feature: "kds",
    module: { ar: "شاشة المطبخ", en: "Kitchen Display" },
    example: { ar: "تغيير حالة الطلب", en: "Changing order status" },
  },
  qr_orders: {
    feature: "qr_orders",
    module: { ar: "طلبات QR", en: "QR Orders" },
    example: { ar: "قبول ورفض الطلبات", en: "Accepting & rejecting" },
  },
  discount: {
    feature: "discount",
    module: { ar: "الخصومات", en: "Discounts" },
  },
  payment: {
    feature: "payment",
    module: { ar: "طرق الدفع", en: "Payment Methods" },
  },
};

/**
 * Get smart trainer deep-link suffix for a feature
 */
export function getTrainerDeepLink(
  featureId: string,
  language: "ar" | "en"
): string | null {
  const link = TRAINER_DEEP_LINKS[featureId];
  if (!link) return null;
  
  const module = link.module[language];
  const example = link.example?.[language];
  
  if (language === "ar") {
    if (example) {
      return `\n\n📚 للشرح التفصيلي مع مثال عملي:\nالمدرب الذكي ← ${module} ← ${example}`;
    }
    return `\n\n📚 للشرح التفصيلي:\nالمدرب الذكي ← ${module}`;
  }
  
  if (example) {
    return `\n\n📚 For detailed explanation with example:\nSmart Trainer → ${module} → ${example}`;
  }
  return `\n\n📚 For detailed explanation:\nSmart Trainer → ${module}`;
}

// ============================================
// EXPORTS
// ============================================

export {
  ONBOARDING_CHECKLISTS,
  ADOPTION_NUDGES,
  TRAINER_DEEP_LINKS,
};
