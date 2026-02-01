// Kastana POS - Cashier Training Flow Engine
// State-aware progressive training for Cashier role
// NOT AI-driven - systematic guidance through cashier workflow

// ============================================
// TYPE DEFINITIONS
// ============================================

export type CashierStepId = 
  | "what_is_shift"
  | "opening_shift"
  | "tabs_overview"
  | "order_states"
  | "closing_shift"
  | "z_report"
  | "complete";

export interface CashierTrainingStep {
  id: CashierStepId;
  progressStart: number;
  progressEnd: number;
  message: { ar: string; en: string };
  requiresShift?: boolean; // Only show when shift is open
  requiresNoShift?: boolean; // Only show when no shift
}

export interface CashierTrainingProgress {
  currentStepId: CashierStepId | null;
  completedSteps: CashierStepId[];
  isPaused: boolean;
  isCompleted: boolean;
  lastUpdated: number;
}

// ============================================
// TRAINING STEPS DEFINITION
// ============================================

export const CASHIER_TRAINING_STEPS: CashierTrainingStep[] = [
  // STEP 1: What is a shift (NO SHIFT REQUIRED)
  {
    id: "what_is_shift",
    progressStart: 0,
    progressEnd: 15,
    requiresNoShift: true,
    message: {
      ar: "🕐 ما هي الوردية؟\n\nالوردية هي فترة عملك من بداية الدوام حتى نهايته.\n\nخلال الوردية، يتتبع النظام:\n• جميع الطلبات التي تستقبلها\n• المبالغ النقدية المستلمة\n• المدفوعات بجميع أنواعها\n\nلماذا الوردية مهمة؟\nلأنها تضمن محاسبة دقيقة وشفافة في نهاية كل دوام.",
      en: "🕐 What is a Shift?\n\nA shift is your work period from start to finish.\n\nDuring a shift, the system tracks:\n• All orders you receive\n• Cash amounts collected\n• All payment types\n\nWhy are shifts important?\nThey ensure accurate and transparent accounting at the end of each workday."
    }
  },

  // STEP 2: Opening a shift (NO SHIFT REQUIRED)
  {
    id: "opening_shift",
    progressStart: 15,
    progressEnd: 30,
    requiresNoShift: true,
    message: {
      ar: "🔓 فتح الوردية\n\nقبل أن تبدأ العمل، يجب فتح وردية.\n\nعند الضغط على \"فتح الوردية\":\n• أدخل رصيد الصندوق الافتتاحي (المبلغ النقدي المتوفر)\n• بعد الفتح، ستتمكن من استقبال الطلبات\n\n📍 زر فتح الوردية يظهر في أعلى الشاشة.",
      en: "🔓 Opening a Shift\n\nBefore you can work, you must open a shift.\n\nWhen you click \"Open Shift\":\n• Enter the opening cash balance (available cash amount)\n• After opening, you can start receiving orders\n\n📍 The Open Shift button appears at the top of the screen."
    }
  },

  // STEP 3: Cashier Tabs Overview (SHIFT REQUIRED)
  {
    id: "tabs_overview",
    progressStart: 30,
    progressEnd: 50,
    requiresShift: true,
    message: {
      ar: "📑 التبويبات الرئيسية\n\nبعد فتح الوردية، ستظهر لك التبويبات التالية:\n\n• طلب جديد: لإنشاء طلبات جديدة\n• الطاولات: لعرض حالة الطاولات (إن وُجدت)\n• الطلبات المعلقة: الطلبات المحتفظ بها مؤقتًا\n• طلبات QR: الطلبات الواردة من العملاء (إن كانت مفعّلة)\n\nكل تبويب له وظيفة محددة. استخدمها حسب الحاجة.",
      en: "📑 Main Tabs\n\nAfter opening a shift, you'll see these tabs:\n\n• New Order: Create new orders\n• Tables: View table status (if available)\n• Held Orders: Temporarily held orders\n• QR Orders: Customer orders via QR (if enabled)\n\nEach tab has a specific function. Use them as needed."
    }
  },

  // STEP 4: Order States (SHIFT REQUIRED)
  {
    id: "order_states",
    progressStart: 50,
    progressEnd: 70,
    requiresShift: true,
    message: {
      ar: "📋 حالات الطلب\n\nكل طلب يمر بحالات مختلفة:\n\n• مفتوح (Open): الطلب قيد العمل، يمكنك إضافة أصناف\n• معلّق (Held): تم حفظه مؤقتًا لاستكماله لاحقًا\n• مدفوع (Paid): تم الدفع وأُغلق الطلب\n\nلماذا بعض الأزرار معطّلة؟\nلأن بعض الإجراءات متاحة فقط في حالات معينة.\nمثلاً: لا يمكنك الدفع على طلب معلّق قبل استئنافه.",
      en: "📋 Order States\n\nEach order goes through different states:\n\n• Open: Order in progress, you can add items\n• Held: Temporarily saved to complete later\n• Paid: Payment completed and order closed\n\nWhy are some buttons disabled?\nBecause some actions are only available in certain states.\nExample: You can't pay for a held order before resuming it."
    }
  },

  // STEP 5: Closing a Shift (SHIFT REQUIRED)
  {
    id: "closing_shift",
    progressStart: 70,
    progressEnd: 85,
    requiresShift: true,
    message: {
      ar: "🔒 إغلاق الوردية\n\nفي نهاية دوامك، يجب إغلاق الوردية.\n\nعند الإغلاق:\n• أدخل المبلغ النقدي الموجود في الصندوق\n• النظام يقارنه مع المبلغ المتوقع\n• إذا وُجد فرق، سيتم تسجيله\n\nلماذا الإغلاق مهم؟\n• يُنهي فترة عملك رسميًا\n• يمنع أي إضافات أو تعديلات بعد الإغلاق\n• يوفر محاسبة دقيقة",
      en: "🔒 Closing a Shift\n\nAt the end of your workday, you must close the shift.\n\nWhen closing:\n• Enter the cash amount in the drawer\n• The system compares it to the expected amount\n• Any difference will be recorded\n\nWhy is closing important?\n• Officially ends your work period\n• Prevents additions or changes after closing\n• Provides accurate accounting"
    }
  },

  // STEP 6: Z Report (SHIFT REQUIRED)
  {
    id: "z_report",
    progressStart: 85,
    progressEnd: 95,
    requiresShift: true,
    message: {
      ar: "📊 تقرير Z (التقرير الختامي)\n\nتقرير Z هو ملخص الوردية الذي يظهر عند الإغلاق.\n\nيعرض:\n• إجمالي المبيعات\n• عدد الطلبات\n• المبالغ حسب طريقة الدفع\n• الفرق النقدي (إن وُجد)\n\nماذا يجب أن تتأكد منه؟\n• تطابق النقد الفعلي مع المتوقع\n• عدم وجود طلبات مفتوحة غير مكتملة",
      en: "📊 Z Report (End-of-Day Report)\n\nThe Z Report is the shift summary shown at closing.\n\nIt displays:\n• Total sales\n• Number of orders\n• Amounts by payment method\n• Cash difference (if any)\n\nWhat should you verify?\n• Actual cash matches expected\n• No incomplete open orders remain"
    }
  },

  // STEP 7: Training Complete
  {
    id: "complete",
    progressStart: 95,
    progressEnd: 100,
    message: {
      ar: "🎉 تهانينا!\n\nأنت الآن جاهز للعمل على شاشة الكاشير.\n\nتذكّر:\n• افتح الوردية قبل بدء العمل\n• أغلق الوردية في نهاية الدوام\n• راجع تقرير Z للتأكد من صحة الأرقام\n\nيمكنك دائمًا إعادة التدريب من البداية.",
      en: "🎉 Congratulations!\n\nYou're now ready to work on the cashier screen.\n\nRemember:\n• Open shift before starting work\n• Close shift at the end of the day\n• Review Z Report to verify numbers\n\nYou can always restart training from the beginning."
    }
  }
];

// ============================================
// STORAGE KEY
// ============================================

const STORAGE_KEY = "kastana_cashier_training_progress";

// ============================================
// DEFAULT PROGRESS STATE
// ============================================

function getDefaultProgress(): CashierTrainingProgress {
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

function loadProgress(): CashierTrainingProgress {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error("Failed to load cashier training progress:", error);
  }
  return getDefaultProgress();
}

function saveProgress(progress: CashierTrainingProgress): void {
  try {
    progress.lastUpdated = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save cashier training progress:", error);
  }
}

// ============================================
// PUBLIC API
// ============================================

export function getCashierTrainingProgress(): CashierTrainingProgress {
  return loadProgress();
}

export function isCashierTrainingActive(): boolean {
  const progress = loadProgress();
  return progress.currentStepId !== null && !progress.isPaused && !progress.isCompleted;
}

export function isCashierTrainingCompleted(): boolean {
  const progress = loadProgress();
  return progress.isCompleted;
}

export function isCashierTrainingPaused(): boolean {
  const progress = loadProgress();
  return progress.isPaused && !progress.isCompleted;
}

export function cashierNeedsTraining(): boolean {
  const progress = loadProgress();
  return !progress.isCompleted && progress.completedSteps.length === 0;
}

export function getCashierCurrentStep(hasActiveShift: boolean): CashierTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId || progress.isCompleted) return null;
  
  const step = CASHIER_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  if (!step) return null;
  
  // Check shift requirements
  if (step.requiresShift && !hasActiveShift) return null;
  if (step.requiresNoShift && hasActiveShift) return null;
  
  return step;
}

export function getNextAvailableStep(hasActiveShift: boolean): CashierTrainingStep | null {
  const progress = loadProgress();
  
  for (const step of CASHIER_TRAINING_STEPS) {
    if (progress.completedSteps.includes(step.id)) continue;
    
    // Check shift requirements
    if (step.requiresShift && !hasActiveShift) continue;
    if (step.requiresNoShift && hasActiveShift) continue;
    
    return step;
  }
  
  return null;
}

export function startCashierTraining(hasActiveShift: boolean): CashierTrainingStep | null {
  const progress = getDefaultProgress();
  
  // Find first available step based on shift state
  const firstStep = getNextAvailableStep(hasActiveShift);
  if (!firstStep) return null;
  
  progress.currentStepId = firstStep.id;
  saveProgress(progress);
  
  return firstStep;
}

export function resumeCashierTraining(hasActiveShift: boolean): CashierTrainingStep | null {
  const progress = loadProgress();
  progress.isPaused = false;
  
  // If current step is not available due to shift state, find next available
  if (progress.currentStepId) {
    const currentStep = CASHIER_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
    if (currentStep) {
      if (currentStep.requiresShift && !hasActiveShift) {
        // Can't show this step, find next available
        const nextStep = getNextAvailableStep(hasActiveShift);
        if (nextStep) {
          progress.currentStepId = nextStep.id;
        }
      } else if (currentStep.requiresNoShift && hasActiveShift) {
        // Can't show this step, find next available
        const nextStep = getNextAvailableStep(hasActiveShift);
        if (nextStep) {
          progress.currentStepId = nextStep.id;
        }
      }
    }
  }
  
  saveProgress(progress);
  
  const step = CASHIER_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  return step || null;
}

export function pauseCashierTraining(): void {
  const progress = loadProgress();
  progress.isPaused = true;
  saveProgress(progress);
}

export function nextCashierStep(hasActiveShift: boolean): CashierTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId) return null;
  
  // Mark current step as completed
  if (!progress.completedSteps.includes(progress.currentStepId)) {
    progress.completedSteps.push(progress.currentStepId);
  }
  
  // Find next available step
  const nextStep = getNextAvailableStep(hasActiveShift);
  
  if (nextStep) {
    progress.currentStepId = nextStep.id;
    saveProgress(progress);
    return nextStep;
  } else {
    // Check if all steps are completed
    const allCompleted = CASHIER_TRAINING_STEPS.every(
      s => progress.completedSteps.includes(s.id) || s.id === "complete"
    );
    
    if (allCompleted || progress.currentStepId === "complete") {
      progress.isCompleted = true;
      progress.currentStepId = null;
    }
    
    saveProgress(progress);
    return null;
  }
}

export function previousCashierStep(): CashierTrainingStep | null {
  const progress = loadProgress();
  if (!progress.currentStepId) return null;
  
  const currentIndex = CASHIER_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  if (currentIndex <= 0) return null;
  
  const prevStep = CASHIER_TRAINING_STEPS[currentIndex - 1];
  progress.currentStepId = prevStep.id;
  
  // Remove from completed if going back
  const prevIndex = progress.completedSteps.indexOf(prevStep.id);
  if (prevIndex !== -1) {
    progress.completedSteps.splice(prevIndex, 1);
  }
  
  saveProgress(progress);
  return prevStep;
}

export function resetCashierTraining(): void {
  const progress = getDefaultProgress();
  saveProgress(progress);
}

export function getCashierTrainingPercentage(): number {
  const progress = loadProgress();
  if (progress.isCompleted) return 100;
  
  const currentStep = CASHIER_TRAINING_STEPS.find(s => s.id === progress.currentStepId);
  if (!currentStep) return 0;
  
  return currentStep.progressStart;
}

export function canGoToPreviousCashierStep(): boolean {
  const progress = loadProgress();
  if (!progress.currentStepId) return false;
  
  const currentIndex = CASHIER_TRAINING_STEPS.findIndex(s => s.id === progress.currentStepId);
  return currentIndex > 0;
}
