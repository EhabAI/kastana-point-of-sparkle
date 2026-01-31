// Kastana POS - Owner Training Flow Engine
// Lightweight, rule-based guided training for first-time owners
// NOT AI-driven - simple step progression with optional navigation

export type OwnerTrainingStepId = 
  | "welcome" 
  | "dashboard_overview" 
  | "suggest_settings"
  | "settings_guide"
  | "completed";

export interface OwnerTrainingStep {
  id: OwnerTrainingStepId;
  progressStart: number;
  progressEnd: number;
  message: { ar: string; en: string };
  highlights?: string[]; // CSS selectors for light highlights
  actions?: OwnerTrainingAction[];
}

export interface OwnerTrainingAction {
  id: string;
  label: { ar: string; en: string };
  type: "navigate" | "skip" | "next" | "finish";
  navigateTo?: string; // Route to navigate to
}

// ============================================
// TRAINING STEPS DEFINITION
// ============================================

export const OWNER_TRAINING_STEPS: OwnerTrainingStep[] = [
  // Step 1: Welcome (0% → 5%)
  {
    id: "welcome",
    progressStart: 0,
    progressEnd: 5,
    message: {
      ar: "أهلاً بك في كاستنا 👋\n\nخلّينا نراجع لوحة التحكم بسرعة حتى تتعرّف على أهم المعلومات.",
      en: "Welcome to Kastana 👋\n\nLet's quickly walk through your dashboard."
    },
    actions: [
      {
        id: "continue",
        label: { ar: "التالي", en: "Next" },
        type: "next"
      }
    ]
  },
  
  // Step 2: Dashboard Explanation (5% → 10%)
  {
    id: "dashboard_overview",
    progressStart: 5,
    progressEnd: 10,
    message: {
      ar: "هنا تشاهد حالة مطعمك اليوم: المبيعات، الطلبات، العروض، والتنبيهات المهمة.",
      en: "Here you can see your restaurant's daily status: sales, orders, offers, and alerts."
    },
    highlights: [
      "[data-trainer='daily-summary']",
      "[data-trainer='offers-status']",
      "[data-trainer='notifications-alerts']"
    ],
    actions: [
      {
        id: "continue",
        label: { ar: "التالي", en: "Next" },
        type: "next"
      }
    ]
  },
  
  // Step 3: Smart Guidance - Suggest Settings (stays at 10%)
  {
    id: "suggest_settings",
    progressStart: 10,
    progressEnd: 10,
    message: {
      ar: "الخطوة المقترحة التالية هي التأكد من الإعدادات الأساسية لمطعمك.",
      en: "The recommended next step is to review your restaurant's basic settings."
    },
    actions: [
      {
        id: "go_settings",
        label: { ar: "الذهاب إلى الإعدادات", en: "Go to Settings" },
        type: "navigate",
        navigateTo: "settings"
      },
      {
        id: "skip",
        label: { ar: "تخطي الآن", en: "Skip for now" },
        type: "skip"
      }
    ]
  },
  
  // Step 4: Settings Guide (10% → 20%)
  {
    id: "settings_guide",
    progressStart: 10,
    progressEnd: 20,
    message: {
      ar: "ممتاز 👍\n\nتأكد من العملة، الضريبة، وساعات العمل. هذه الإعدادات تُضبط مرة واحدة فقط.",
      en: "Great 👍\n\nMake sure currency, tax, and business hours are correct. These are usually set once."
    },
    actions: [
      {
        id: "finish",
        label: { ar: "فهمت", en: "Got it" },
        type: "finish"
      }
    ]
  },
  
  // Step 5: Completed (hidden step - marks completion)
  {
    id: "completed",
    progressStart: 20,
    progressEnd: 20,
    message: {
      ar: "تم! يمكنك دائماً العودة للمدرب للمزيد من المساعدة.",
      en: "Done! You can always return to the trainer for more help."
    }
  }
];

// ============================================
// LOCAL STORAGE - PROGRESS PERSISTENCE
// ============================================

const OWNER_TRAINING_KEY = "kastana_owner_training_progress";

export interface OwnerTrainingProgress {
  currentStepId: OwnerTrainingStepId | null;
  completed: boolean;
  paused: boolean;
  progressPercent: number;
  lastUpdated: number;
}

function getDefaultProgress(): OwnerTrainingProgress {
  return {
    currentStepId: null,
    completed: false,
    paused: false,
    progressPercent: 0,
    lastUpdated: Date.now()
  };
}

export function getOwnerTrainingProgress(): OwnerTrainingProgress {
  try {
    const stored = localStorage.getItem(OWNER_TRAINING_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return getDefaultProgress();
}

function saveOwnerTrainingProgress(progress: OwnerTrainingProgress): void {
  progress.lastUpdated = Date.now();
  localStorage.setItem(OWNER_TRAINING_KEY, JSON.stringify(progress));
}

// ============================================
// TRAINING ACTIONS
// ============================================

/**
 * Check if owner needs training (never started or paused)
 */
export function ownerNeedsTraining(): boolean {
  const progress = getOwnerTrainingProgress();
  return !progress.completed;
}

/**
 * Check if training is currently active
 */
export function isOwnerTrainingActive(): boolean {
  const progress = getOwnerTrainingProgress();
  return progress.currentStepId !== null && !progress.paused && !progress.completed;
}

/**
 * Get current training step
 */
export function getCurrentOwnerStep(): OwnerTrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentStepId || progress.paused || progress.completed) {
    return null;
  }
  return OWNER_TRAINING_STEPS.find(s => s.id === progress.currentStepId) || null;
}

/**
 * Start owner training from beginning
 */
export function startOwnerTraining(): OwnerTrainingStep {
  const firstStep = OWNER_TRAINING_STEPS[0];
  const progress: OwnerTrainingProgress = {
    currentStepId: firstStep.id,
    completed: false,
    paused: false,
    progressPercent: firstStep.progressEnd,
    lastUpdated: Date.now()
  };
  saveOwnerTrainingProgress(progress);
  return firstStep;
}

/**
 * Resume paused training
 */
export function resumeOwnerTraining(): OwnerTrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentStepId) {
    return startOwnerTraining();
  }
  
  progress.paused = false;
  saveOwnerTrainingProgress(progress);
  
  return OWNER_TRAINING_STEPS.find(s => s.id === progress.currentStepId) || null;
}

/**
 * Go to next step
 */
export function nextOwnerStep(): OwnerTrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentStepId) return null;
  
  const currentIndex = OWNER_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  if (currentIndex === -1) return null;
  
  const nextIndex = currentIndex + 1;
  if (nextIndex >= OWNER_TRAINING_STEPS.length) {
    // Training complete
    completeOwnerTraining();
    return null;
  }
  
  const nextStep = OWNER_TRAINING_STEPS[nextIndex];
  progress.currentStepId = nextStep.id;
  progress.progressPercent = nextStep.progressEnd;
  saveOwnerTrainingProgress(progress);
  
  return nextStep;
}

/**
 * Go to settings step (when user clicks "Go to Settings")
 */
export function goToSettingsStep(): OwnerTrainingStep {
  const settingsStep = OWNER_TRAINING_STEPS.find(s => s.id === "settings_guide")!;
  const progress = getOwnerTrainingProgress();
  progress.currentStepId = settingsStep.id;
  progress.progressPercent = settingsStep.progressEnd;
  saveOwnerTrainingProgress(progress);
  return settingsStep;
}

/**
 * Pause training (user clicked "Skip for now")
 */
export function pauseOwnerTraining(): void {
  const progress = getOwnerTrainingProgress();
  progress.paused = true;
  saveOwnerTrainingProgress(progress);
}

/**
 * Complete training
 */
export function completeOwnerTraining(): void {
  const progress = getOwnerTrainingProgress();
  progress.completed = true;
  progress.currentStepId = "completed";
  progress.progressPercent = 20;
  progress.paused = false;
  saveOwnerTrainingProgress(progress);
}

/**
 * Reset training (for testing)
 */
export function resetOwnerTraining(): void {
  localStorage.removeItem(OWNER_TRAINING_KEY);
}

/**
 * Get current progress percentage
 */
export function getOwnerProgressPercent(): number {
  return getOwnerTrainingProgress().progressPercent;
}

/**
 * Check if training is paused
 */
export function isOwnerTrainingPaused(): boolean {
  const progress = getOwnerTrainingProgress();
  return progress.paused && !progress.completed;
}

/**
 * Check if training is completed
 */
export function isOwnerTrainingCompleted(): boolean {
  return getOwnerTrainingProgress().completed;
}
