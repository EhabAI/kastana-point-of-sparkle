/**
 * Kastana Smart Guided Assistant - Smart Training System
 * Intelligent training that appears ONLY when needed
 * - On first use of a feature
 * - On repeated mistakes
 * - On confusion (idle with pending action)
 */

import type { ScreenContext } from "./smartAssistantContext";
import type { RouterContext } from "./assistantRouter";

// Training levels
export type TrainingLevel = "explain" | "guide" | "reinforce";

// Training card structure
export interface TrainingCard {
  id: string;
  title: { ar: string; en: string };
  whyMatters: { ar: string; en: string };
  steps: { ar: string[]; en: string[] };
  tip?: { ar: string; en: string };
  level: TrainingLevel;
  // Targeting
  roles: string[];
  screens: string[];
  // Triggers
  trigger: "first_use" | "repeated_mistake" | "idle_pending" | "manual";
}

// Training state stored in localStorage
interface TrainingState {
  seenCards: Record<string, number>; // cardId -> timestamp
  mistakeCounts: Record<string, number>; // actionType -> count
  completedCards: string[];
  skippedCards: string[];
  currentLevel: "beginner" | "intermediate" | "advanced";
  lastVersion: string;
}

const TRAINING_STATE_KEY = "kastana_smart_training";
const CURRENT_VERSION = "2.0.0";
const MISTAKE_THRESHOLD = 3; // Show training after 3 repeated mistakes

// ============= TRAINING CARDS DATABASE =============
const TRAINING_CARDS: TrainingCard[] = [
  // CASHIER - POS Training
  {
    id: "cashier_shift_open",
    title: { ar: "فتح الوردية أولاً", en: "Open Shift First" },
    whyMatters: { 
      ar: "الوردية تتبع جميع مبيعاتك ونقدك حتى الإغلاق",
      en: "Shift tracks all your sales and cash until closing"
    },
    steps: {
      ar: ["اضغط 'فتح وردية' من القائمة", "أدخل المبلغ الافتتاحي في الدرج", "اضغط 'تأكيد'"],
      en: ["Click 'Open Shift' from menu", "Enter opening cash in drawer", "Click 'Confirm'"]
    },
    tip: { ar: "لا يمكن البيع بدون وردية مفتوحة", en: "Cannot sell without open shift" },
    level: "explain",
    roles: ["cashier"],
    screens: ["pos_main"],
    trigger: "first_use"
  },
  {
    id: "cashier_hold_vs_void",
    title: { ar: "التعليق أفضل من الإلغاء", en: "Hold is Better Than Void" },
    whyMatters: {
      ar: "التعليق يحفظ الطلب، الإلغاء يحذفه نهائياً",
      en: "Hold preserves the order, Void deletes it permanently"
    },
    steps: {
      ar: ["استخدم 'تعليق' للطلبات المؤجلة", "الطلب يظهر في 'الطلبات المعلقة'", "استأنفه لاحقاً بضغطة واحدة"],
      en: ["Use 'Hold' for deferred orders", "Order appears in 'Held Orders'", "Resume later with one click"]
    },
    tip: { ar: "الإلغاء يُسجل في سجل التدقيق", en: "Voids are recorded in audit log" },
    level: "guide",
    roles: ["cashier"],
    screens: ["pos_main"],
    trigger: "repeated_mistake"
  },
  {
    id: "cashier_payment_methods",
    title: { ar: "طرق الدفع المتاحة", en: "Available Payment Methods" },
    whyMatters: {
      ar: "اختيار الطريقة الصحيحة يضمن دقة التقارير",
      en: "Correct method ensures accurate reports"
    },
    steps: {
      ar: ["نقد: أدخل المبلغ المستلم", "بطاقة: اختر Visa أو Mastercard", "تقسيم: وزع على أكثر من طريقة"],
      en: ["Cash: Enter received amount", "Card: Select Visa or Mastercard", "Split: Divide across methods"]
    },
    level: "explain",
    roles: ["cashier"],
    screens: ["pos_main"],
    trigger: "first_use"
  },
  {
    id: "cashier_held_order_warning",
    title: { ar: "لا يمكن الدفع لطلب معلق", en: "Cannot Pay Held Order" },
    whyMatters: {
      ar: "الطلب المعلق محفوظ مؤقتاً ويحتاج استئناف أولاً",
      en: "Held order is temporarily saved and needs resume first"
    },
    steps: {
      ar: ["افتح 'الطلبات المعلقة'", "اختر الطلب واضغط 'استئناف'", "أكمل الدفع بعد الاستئناف"],
      en: ["Open 'Held Orders'", "Select order and click 'Resume'", "Complete payment after resume"]
    },
    level: "explain",
    roles: ["cashier"],
    screens: ["pos_main"],
    trigger: "repeated_mistake"
  },
  
  // OWNER - Dashboard Training
  {
    id: "owner_variance_meaning",
    title: { ar: "فهم فروقات المخزون", en: "Understanding Inventory Variance" },
    whyMatters: {
      ar: "الفرق يكشف مشاكل خفية: هدر، سرقة، أو أخطاء",
      en: "Variance reveals hidden issues: waste, theft, or errors"
    },
    steps: {
      ar: ["راجع نسبة الفرق الإجمالية", "افحص الأصناف ذات الفرق الأعلى", "حدد السبب الجذري لكل فرق"],
      en: ["Review overall variance percentage", "Check items with highest variance", "Identify root cause for each"]
    },
    tip: { ar: "فرق < 2% يعتبر طبيعياً", en: "Variance < 2% is considered normal" },
    level: "explain",
    roles: ["owner"],
    screens: ["owner_inventory", "owner_reports"],
    trigger: "first_use"
  },
  {
    id: "owner_empty_report",
    title: { ar: "لماذا التقرير فارغ؟", en: "Why is Report Empty?" },
    whyMatters: {
      ar: "التقارير تعتمد على بيانات الفترة والفرع المحدد",
      en: "Reports depend on period and selected branch data"
    },
    steps: {
      ar: ["تأكد من اختيار فترة صحيحة", "تحقق من اختيار الفرع الصحيح", "تأكد من وجود بيانات في الفترة"],
      en: ["Ensure correct period selected", "Verify correct branch selected", "Confirm data exists in period"]
    },
    tip: { ar: "جرب توسيع نطاق التاريخ", en: "Try expanding date range" },
    level: "guide",
    roles: ["owner"],
    screens: ["owner_reports"],
    trigger: "repeated_mistake"
  },
  
  // KITCHEN - KDS Training
  {
    id: "kitchen_first_time",
    title: { ar: "مرحباً بك في شاشة المطبخ", en: "Welcome to Kitchen Display" },
    whyMatters: {
      ar: "شاشة المطبخ تعرض الطلبات للتحضير بالترتيب",
      en: "Kitchen display shows orders for preparation in order"
    },
    steps: {
      ar: ["الطلبات الجديدة تظهر على اليسار", "اضغط لتغيير الحالة: جديد → قيد التحضير → جاهز", "الألوان تدل على الوقت المنقضي"],
      en: ["New orders appear on the left", "Click to change status: New → In Progress → Ready", "Colors indicate time elapsed"]
    },
    tip: { ar: "ركز على الطلبات الحمراء أولاً", en: "Focus on red orders first" },
    level: "explain",
    roles: ["kitchen", "owner"],
    screens: ["kds"],
    trigger: "first_use"
  },
  {
    id: "kitchen_stuck_order",
    title: { ar: "طلبات متأخرة", en: "Delayed Orders" },
    whyMatters: {
      ar: "الطلب الأحمر = تأخير يؤثر على رضا العميل",
      en: "Red order = delay affecting customer satisfaction"
    },
    steps: {
      ar: ["راجع الطلب الأقدم أولاً", "إذا جاهز: اضغط لتحديث الحالة", "إذا تحتاج مساعدة: نادِ المشرف"],
      en: ["Review oldest order first", "If ready: click to update status", "If need help: call supervisor"]
    },
    level: "reinforce",
    roles: ["kitchen"],
    screens: ["kds"],
    trigger: "idle_pending"
  }
];

// ============= STATE MANAGEMENT =============

function getTrainingState(): TrainingState {
  try {
    const stored = localStorage.getItem(TRAINING_STATE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  
  return {
    seenCards: {},
    mistakeCounts: {},
    completedCards: [],
    skippedCards: [],
    currentLevel: "beginner",
    lastVersion: ""
  };
}

function saveTrainingState(state: TrainingState): void {
  localStorage.setItem(TRAINING_STATE_KEY, JSON.stringify(state));
}

// ============= PUBLIC FUNCTIONS =============

/**
 * Check if training should be shown for current context
 */
export function shouldShowTraining(context: RouterContext): boolean {
  const { userRole, currentScreen, isFirstTimeOnScreen, hasRepeatedMistake } = context;
  
  // Don't show training in certain conditions
  if (!userRole) return false;
  
  // Check if there's relevant training for this context
  const relevantCards = TRAINING_CARDS.filter(card => 
    card.roles.includes(userRole) && 
    card.screens.includes(currentScreen)
  );
  
  if (relevantCards.length === 0) return false;
  
  const state = getTrainingState();
  
  // First time on screen triggers first_use training
  if (isFirstTimeOnScreen) {
    const firstUseCards = relevantCards.filter(c => c.trigger === "first_use");
    const unseenFirstUse = firstUseCards.filter(c => !state.seenCards[c.id]);
    if (unseenFirstUse.length > 0) return true;
  }
  
  // Repeated mistakes trigger mistake training
  if (hasRepeatedMistake) {
    const mistakeCards = relevantCards.filter(c => c.trigger === "repeated_mistake");
    const uncompletedMistake = mistakeCards.filter(c => !state.completedCards.includes(c.id));
    if (uncompletedMistake.length > 0) return true;
  }
  
  return false;
}

/**
 * Get appropriate training card for context
 */
export function getTrainingForContext(context: RouterContext): TrainingCard | null {
  const { userRole, currentScreen, isFirstTimeOnScreen, hasRepeatedMistake } = context;
  
  if (!userRole) return null;
  
  const state = getTrainingState();
  
  // Filter relevant cards
  const relevantCards = TRAINING_CARDS.filter(card => 
    card.roles.includes(userRole) && 
    card.screens.includes(currentScreen) &&
    !state.completedCards.includes(card.id)
  );
  
  if (relevantCards.length === 0) return null;
  
  // Priority: first_use > repeated_mistake > idle_pending
  if (isFirstTimeOnScreen) {
    const firstUseCard = relevantCards.find(c => 
      c.trigger === "first_use" && !state.seenCards[c.id]
    );
    if (firstUseCard) {
      markCardSeen(firstUseCard.id);
      return firstUseCard;
    }
  }
  
  if (hasRepeatedMistake) {
    const mistakeCard = relevantCards.find(c => c.trigger === "repeated_mistake");
    if (mistakeCard) {
      markCardSeen(mistakeCard.id);
      return mistakeCard;
    }
  }
  
  return null;
}

/**
 * Record a user mistake for training triggers
 */
export function recordMistake(actionType: string): boolean {
  const state = getTrainingState();
  
  state.mistakeCounts[actionType] = (state.mistakeCounts[actionType] || 0) + 1;
  saveTrainingState(state);
  
  return state.mistakeCounts[actionType] >= MISTAKE_THRESHOLD;
}

/**
 * Check if user has repeated mistakes
 */
export function hasRepeatedMistakes(actionType: string): boolean {
  const state = getTrainingState();
  return (state.mistakeCounts[actionType] || 0) >= MISTAKE_THRESHOLD;
}

/**
 * Mark a card as seen (downgrade to hint next time)
 */
export function markCardSeen(cardId: string): void {
  const state = getTrainingState();
  state.seenCards[cardId] = Date.now();
  saveTrainingState(state);
}

/**
 * Mark a card as completed (won't show again)
 */
export function markCardCompleted(cardId: string): void {
  const state = getTrainingState();
  
  if (!state.completedCards.includes(cardId)) {
    state.completedCards.push(cardId);
    
    // Remove from skipped if it was there
    state.skippedCards = state.skippedCards.filter(id => id !== cardId);
    
    // Update level
    updateTrainingLevel(state);
    
    saveTrainingState(state);
  }
}

/**
 * Mark a card as skipped
 */
export function markCardSkipped(cardId: string): void {
  const state = getTrainingState();
  
  if (!state.skippedCards.includes(cardId) && !state.completedCards.includes(cardId)) {
    state.skippedCards.push(cardId);
    saveTrainingState(state);
  }
}

/**
 * Get training card by ID
 */
export function getTrainingCardById(cardId: string): TrainingCard | null {
  return TRAINING_CARDS.find(card => card.id === cardId) || null;
}

/**
 * Get all training cards for a role and screen
 */
export function getTrainingCardsForContext(
  role: string, 
  screen: ScreenContext
): TrainingCard[] {
  return TRAINING_CARDS.filter(card => 
    card.roles.includes(role) && 
    card.screens.includes(screen)
  );
}

/**
 * Get all available training cards for manual training mode
 */
export function getAllTrainingCardsForRole(role: string): TrainingCard[] {
  return TRAINING_CARDS.filter(card => card.roles.includes(role));
}

/**
 * Get training progress stats
 */
export function getTrainingProgress(): {
  completed: number;
  total: number;
  level: string;
  percentage: number;
} {
  const state = getTrainingState();
  const total = TRAINING_CARDS.length;
  const completed = state.completedCards.length;
  
  return {
    completed,
    total,
    level: state.currentLevel,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/**
 * Reset all training state
 */
export function resetTraining(): void {
  localStorage.removeItem(TRAINING_STATE_KEY);
}

/**
 * Reset mistake count for an action
 */
export function resetMistakeCount(actionType: string): void {
  const state = getTrainingState();
  delete state.mistakeCounts[actionType];
  saveTrainingState(state);
}

// ============= PRIVATE HELPERS =============

function updateTrainingLevel(state: TrainingState): void {
  const completedCount = state.completedCards.length;
  
  if (completedCount >= 8) {
    state.currentLevel = "advanced";
  } else if (completedCount >= 4) {
    state.currentLevel = "intermediate";
  } else {
    state.currentLevel = "beginner";
  }
}

/**
 * Check if screen is being visited for first time
 */
export function isFirstTimeScreen(screen: ScreenContext): boolean {
  const key = `kastana_first_visit_${screen}`;
  const visited = localStorage.getItem(key);
  
  if (!visited) {
    localStorage.setItem(key, Date.now().toString());
    return true;
  }
  
  return false;
}
