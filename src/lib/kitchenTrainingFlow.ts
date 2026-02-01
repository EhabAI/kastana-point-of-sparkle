// Kastana POS - Kitchen Training Flow Engine
// State-aware progressive training for Kitchen (KDS) role
// NOT AI-driven - systematic guidance through kitchen workflow

// ============================================
// TYPE DEFINITIONS
// ============================================

export type KitchenStepId = 
  | "what_is_kds"
  | "order_status_flow"
  | "kitchen_actions"
  | "kitchen_restrictions"
  | "complete";

export interface KitchenTrainingStep {
  id: KitchenStepId;
  progressStart: number;
  progressEnd: number;
  message: { ar: string; en: string };
}

export interface KitchenTrainingProgress {
  currentStepId: KitchenStepId | null;
  completedSteps: KitchenStepId[];
  isPaused: boolean;
  isCompleted: boolean;
  lastUpdated: number;
}

// ============================================
// TRAINING STEPS DEFINITION
// ============================================

export const KITCHEN_TRAINING_STEPS: KitchenTrainingStep[] = [
  // STEP 1: What is KDS
  {
    id: "what_is_kds",
    progressStart: 0,
    progressEnd: 25,
    message: {
      ar: "👨‍🍳 ما هي شاشة المطبخ (KDS)؟\n\nشاشة المطبخ هي شاشة عرض مخصصة لفريق المطبخ.\n\nالغرض منها:\n• عرض الطلبات الواردة من الكاشير\n• متابعة حالة كل طلب\n• تنظيم العمل بين فريق المطبخ\n\nالفرق بين الكاشير والمطبخ:\n• الكاشير يستقبل الطلبات والمدفوعات\n• المطبخ يحضّر الطلبات فقط",
      en: "👨‍🍳 What is the Kitchen Display (KDS)?\n\nThe Kitchen Display is a dedicated screen for the kitchen team.\n\nIts purpose:\n• Show orders from the cashier\n• Track each order's status\n• Organize work among kitchen staff\n\nDifference between Cashier and Kitchen:\n• Cashier receives orders and payments\n• Kitchen prepares orders only"
    }
  },

  // STEP 2: Order Status Flow
  {
    id: "order_status_flow",
    progressStart: 25,
    progressEnd: 50,
    message: {
      ar: "📋 حالات الطلب في المطبخ\n\nكل طلب يمر بثلاث مراحل:\n\n🔵 جديد (New)\nالطلب وصل للتو من الكاشير وينتظر البدء.\n\n🟠 قيد التحضير (In Progress)\nالمطبخ بدأ بتحضير الطلب.\n\n🟢 جاهز (Ready)\nالطلب جاهز للتقديم أو الاستلام.\n\nمتى تتغير الحالة؟\n• تتغير عند ضغطك على زر التحديث\n• الكاشير يرى التحديثات مباشرة",
      en: "📋 Order Status in Kitchen\n\nEach order goes through three stages:\n\n🔵 New\nOrder just arrived from cashier, waiting to start.\n\n🟠 In Progress\nKitchen started preparing the order.\n\n🟢 Ready\nOrder is ready for serving or pickup.\n\nWhen does status change?\n• It changes when you press the update button\n• Cashier sees updates immediately"
    }
  },

  // STEP 3: Kitchen Actions
  {
    id: "kitchen_actions",
    progressStart: 50,
    progressEnd: 75,
    message: {
      ar: "👆 إجراءات المطبخ\n\nالإجراءات المتاحة لك:\n\n• بدء التحضير: نقل الطلب من \"جديد\" إلى \"قيد التحضير\"\n• جاهز: نقل الطلب من \"قيد التحضير\" إلى \"جاهز\"\n\nكيف تستخدم الأزرار:\n• اضغط على الطلب لرؤية التفاصيل\n• اضغط على زر الحالة لنقله للمرحلة التالية\n\nملاحظة: لا يمكنك تعديل الطلب أو حذفه.",
      en: "👆 Kitchen Actions\n\nAvailable actions:\n\n• Start Preparing: Move order from \"New\" to \"In Progress\"\n• Ready: Move order from \"In Progress\" to \"Ready\"\n\nHow to use buttons:\n• Click on order to see details\n• Click status button to move to next stage\n\nNote: You cannot edit or delete orders."
    }
  },

  // STEP 4: Kitchen Restrictions
  {
    id: "kitchen_restrictions",
    progressStart: 75,
    progressEnd: 95,
    message: {
      ar: "🚫 صلاحيات المطبخ\n\nما لا يمكنك فعله من شاشة المطبخ:\n\n❌ تعديل الأسعار\n❌ رؤية المبالغ أو المدفوعات\n❌ إلغاء أو حذف الطلبات\n❌ الوصول إلى التقارير\n❌ تعديل إعدادات النظام\n\nلماذا؟\nشاشة المطبخ مصممة للتركيز على التحضير فقط.\nكل ما يتعلق بالمال والإدارة يكون لدى الكاشير والمالك.",
      en: "🚫 Kitchen Permissions\n\nWhat you cannot do from Kitchen screen:\n\n❌ Edit prices\n❌ See amounts or payments\n❌ Cancel or delete orders\n❌ Access reports\n❌ Change system settings\n\nWhy?\nKitchen screen is designed to focus on preparation only.\nEverything related to money and management is with Cashier and Owner."
    }
  },

  // STEP 5: Training Complete
  {
    id: "complete",
    progressStart: 95,
    progressEnd: 100,
    message: {
      ar: "🎉 تهانينا!\n\nأنت الآن جاهز للعمل على شاشة المطبخ.\n\nتذكّر:\n• راقب الطلبات الجديدة باستمرار\n• حدّث الحالة فور بدء التحضير\n• اضغط \"جاهز\" عند اكتمال الطلب\n\nيمكنك دائمًا إعادة التدريب من البداية.",
      en: "🎉 Congratulations!\n\nYou're now ready to work on the Kitchen screen.\n\nRemember:\n• Monitor new orders continuously\n• Update status when you start preparing\n• Press \"Ready\" when order is complete\n\nYou can always restart training from the beginning."
    }
  }
];

// ============================================
// STORAGE KEY
// ============================================

const STORAGE_KEY = "kastana_kitchen_training_progress";

// ============================================
// DEFAULT PROGRESS STATE
// ============================================

function getDefaultProgress(): KitchenTrainingProgress {
  return {
    currentStepId: null,
    completedSteps: [],
    isPaused: false,
    isCompleted: false,
    lastUpdated: Date.now()
  };
}

// ============================================
// STORAGE FUNCTIONS
// ============================================

function loadProgress(): KitchenTrainingProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load kitchen training progress:", error);
  }
  return getDefaultProgress();
}

function saveProgress(progress: KitchenTrainingProgress): void {
  try {
    progress.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save kitchen training progress:", error);
  }
}

// ============================================
// PUBLIC API
// ============================================

export function getKitchenTrainingProgress(): KitchenTrainingProgress {
  return loadProgress();
}

export function isKitchenTrainingActive(): boolean {
  const progress = loadProgress();
  return progress.currentStepId !== null && !progress.isPaused && !progress.isCompleted;
}

export function isKitchenTrainingCompleted(): boolean {
  const progress = loadProgress();
  return progress.isCompleted;
}

export function isKitchenTrainingPaused(): boolean {
  const progress = loadProgress();
  return progress.isPaused && !progress.isCompleted;
}

export function kitchenNeedsTraining(): boolean {
  const progress = loadProgress();
  return !progress.isCompleted && progress.completedSteps.length === 0;
}

export function getKitchenCurrentStep(): KitchenTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId || progress.isCompleted) return null;
  
  const step = KITCHEN_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  return step || null;
}

export function startKitchenTraining(): KitchenTrainingStep | null {
  const progress = getDefaultProgress();
  const firstStep = KITCHEN_TRAINING_STEPS[0];
  
  progress.currentStepId = firstStep.id;
  saveProgress(progress);
  
  return firstStep;
}

export function resumeKitchenTraining(): KitchenTrainingStep | null {
  const progress = loadProgress();
  progress.isPaused = false;
  saveProgress(progress);
  
  const step = KITCHEN_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  return step || null;
}

export function pauseKitchenTraining(): void {
  const progress = loadProgress();
  progress.isPaused = true;
  saveProgress(progress);
}

export function nextKitchenStep(): KitchenTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId) return null;
  
  // Mark current step as completed
  if (!progress.completedSteps.includes(progress.currentStepId)) {
    progress.completedSteps.push(progress.currentStepId);
  }
  
  // Find next step
  const currentIndex = KITCHEN_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  const nextStep = KITCHEN_TRAINING_STEPS[currentIndex + 1];
  
  if (nextStep) {
    progress.currentStepId = nextStep.id;
    saveProgress(progress);
    return nextStep;
  } else {
    // Training complete
    progress.isCompleted = true;
    progress.currentStepId = null;
    saveProgress(progress);
    return null;
  }
}

export function previousKitchenStep(): KitchenTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId) return null;
  
  const currentIndex = KITCHEN_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  if (currentIndex <= 0) return null;
  
  const prevStep = KITCHEN_TRAINING_STEPS[currentIndex - 1];
  progress.currentStepId = prevStep.id;
  
  // Remove from completed if going back
  const prevIndex = progress.completedSteps.indexOf(prevStep.id);
  if (prevIndex !== -1) {
    progress.completedSteps.splice(prevIndex, 1);
  }
  
  saveProgress(progress);
  return prevStep;
}

export function resetKitchenTraining(): void {
  const progress = getDefaultProgress();
  saveProgress(progress);
}

export function getKitchenTrainingPercentage(): number {
  const progress = loadProgress();
  if (progress.isCompleted) return 100;
  
  const currentStep = KITCHEN_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  if (!currentStep) return 0;
  
  return currentStep.progressStart;
}

export function canGoToPreviousKitchenStep(): boolean {
  const progress = loadProgress();
  if (!progress.currentStepId) return false;
  
  const currentIndex = KITCHEN_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  return currentIndex > 0;
}
