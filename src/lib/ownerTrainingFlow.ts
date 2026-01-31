// Kastana POS - Owner Training Flow Engine (Multi-Track)
// Rule-based progressive training with automatic track triggers
// NOT AI-driven - systematic guidance through multiple phases

// ============================================
// TYPE DEFINITIONS
// ============================================

export type TrackId = "getting_started" | "daily_operations" | "insights_reports" | "management_expansion";

export type StepId = string;

export interface TrainingStep {
  id: StepId;
  trackId: TrackId;
  progressStart: number; // Progress within the track (0-100)
  progressEnd: number;
  message: { ar: string; en: string };
  highlights?: string[]; // CSS selectors for light highlights
  actions?: TrainingAction[];
}

export interface TrainingAction {
  id: string;
  label: { ar: string; en: string };
  type: "navigate" | "skip" | "next" | "finish" | "finish_track";
  navigateTo?: string;
}

export interface TrainingTrack {
  id: TrackId;
  name: { ar: string; en: string };
  description: { ar: string; en: string };
  triggerType: "auto" | "manual" | "conditional";
  triggerCondition?: string; // Description of trigger condition
  steps: TrainingStep[];
  completionMessage: { ar: string; en: string };
}

export interface OwnerTrainingProgress {
  // Track completion status
  completedTracks: TrackId[];
  currentTrackId: TrackId | null;
  currentStepId: StepId | null;
  
  // Per-track progress (0-100)
  trackProgress: Partial<Record<TrackId, number>>;
  
  // State flags
  isPaused: boolean;
  isFullyCompleted: boolean;
  
  // Timestamps for trigger conditions
  firstLoginAt: number | null;
  firstShiftOpenedAt: number | null;
  firstOrderCreatedAt: number | null;
  
  // Last update
  lastUpdated: number;
}

// ============================================
// TRAINING TRACKS DEFINITION
// ============================================

const TRACK_GETTING_STARTED: TrainingTrack = {
  id: "getting_started",
  name: { ar: "التدريب الأساسي", en: "Basic Training" },
  description: { ar: "دليل شامل لإعداد وتشغيل مطعمك", en: "Complete guide to set up and run your restaurant" },
  triggerType: "auto",
  steps: [
    // STAGE 1 - Welcome & Dashboard (0% → 10%)
    {
      id: "gs_welcome",
      trackId: "getting_started",
      progressStart: 0,
      progressEnd: 5,
      message: {
        ar: "أهلاً بك في كاستنا 👋\n\nخلّينا نراجع لوحة التحكم بسرعة حتى تتعرّف على أهم المعلومات.",
        en: "Welcome to Kastana 👋\n\nLet's quickly walk through your dashboard."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "gs_dashboard",
      trackId: "getting_started",
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
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    // STAGE 1 continued - Settings (10% → 25%)
    {
      id: "gs_suggest_settings",
      trackId: "getting_started",
      progressStart: 10,
      progressEnd: 15,
      message: {
        ar: "الخطوة المقترحة التالية هي التأكد من الإعدادات الأساسية لمطعمك.",
        en: "The recommended next step is to review your restaurant's basic settings."
      },
      actions: [
        { id: "go_settings", label: { ar: "الذهاب إلى الإعدادات", en: "Go to Settings" }, type: "navigate", navigateTo: "settings" },
        { id: "skip_settings", label: { ar: "تخطي الآن", en: "Skip for now" }, type: "next" }
      ]
    },
    {
      id: "gs_settings_guide",
      trackId: "getting_started",
      progressStart: 15,
      progressEnd: 25,
      message: {
        ar: "ممتاز 👍\n\nتأكد من العملة، الضريبة، وساعات العمل. هذه الإعدادات تُضبط مرة واحدة فقط.",
        en: "Great 👍\n\nMake sure currency, tax, and business hours are correct. These are usually set once."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    // STAGE 2 - Menu Setup (25% → 45%)
    {
      id: "gs_menu_intro",
      trackId: "getting_started",
      progressStart: 25,
      progressEnd: 30,
      message: {
        ar: "الخطوة التالية هي تحضير قائمة مطعمك 🍽️\n\nبدون قائمة، لا يمكن استقبال الطلبات.",
        en: "The next step is to prepare your restaurant menu 🍽️\n\nWithout a menu, you cannot receive orders."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "gs_menu_explain",
      trackId: "getting_started",
      progressStart: 30,
      progressEnd: 35,
      message: {
        ar: "في شاشة القائمة يمكنك:\n\n• إنشاء تصنيفات (مثل: مشروبات، وجبات)\n• إضافة الأصناف مع الأسعار\n\nلا تحتاج للكمال الآن، يمكنك التعديل لاحقًا.",
        en: "In the Menu screen you can:\n\n• Create categories (e.g., drinks, meals)\n• Add items with prices\n\nNo need to be perfect now, you can edit later."
      },
      actions: [
        { id: "go_menu", label: { ar: "الانتقال إلى القائمة", en: "Go to Menu" }, type: "navigate", navigateTo: "menu" },
        { id: "skip_menu", label: { ar: "تخطي الآن", en: "Skip for now" }, type: "next" }
      ]
    },
    {
      id: "gs_menu_complete",
      trackId: "getting_started",
      progressStart: 35,
      progressEnd: 45,
      message: {
        ar: "رائع! 🎉\n\nالقائمة جاهزة للاستخدام. يمكنك إضافة أصناف جديدة في أي وقت.",
        en: "Great! 🎉\n\nYour menu is ready. You can add new items anytime."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    // STAGE 3 - POS & Daily Operation (45% → 65%)
    {
      id: "gs_pos_intro",
      trackId: "getting_started",
      progressStart: 45,
      progressEnd: 50,
      message: {
        ar: "الآن ننتقل لتشغيل البيع اليومي 💳\n\nالكاشيير هو المكان الذي يتم فيه استقبال الطلبات والدفع.",
        en: "Now let's move to daily sales operation 💳\n\nThe cashier is where orders are received and payments are made."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "gs_pos_explain",
      trackId: "getting_started",
      progressStart: 50,
      progressEnd: 55,
      message: {
        ar: "قبل البدء بالبيع:\n\n• يجب فتح وردية\n• كل المبيعات تُسجل تلقائيًا\n\nمن صفحة 'إدارة' يمكنك إضافة موظفين للكاشيير.",
        en: "Before starting sales:\n\n• You must open a shift\n• All sales are recorded automatically\n\nFrom 'Manage' page you can add cashier staff."
      },
      actions: [
        { id: "go_management", label: { ar: "إدارة الموظفين", en: "Manage Staff" }, type: "navigate", navigateTo: "management" },
        { id: "skip_pos", label: { ar: "تخطي الآن", en: "Skip for now" }, type: "next" }
      ]
    },
    {
      id: "gs_pos_complete",
      trackId: "getting_started",
      progressStart: 55,
      progressEnd: 65,
      message: {
        ar: "ممتاز! 👍\n\nبعد إضافة الموظفين، يمكنهم تسجيل الدخول لشاشة الكاشيير وفتح الوردية.",
        en: "Excellent! 👍\n\nAfter adding staff, they can log in to the POS screen and open a shift."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    // STAGE 4 - Daily Monitoring (65% → 85%)
    {
      id: "gs_monitoring_intro",
      trackId: "getting_started",
      progressStart: 65,
      progressEnd: 70,
      message: {
        ar: "ممتاز 👍\n\nالآن تعرف كيف يتم البيع.\nدعنا نريك كيف تتابع عمل مطعمك يوميًا.",
        en: "Excellent 👍\n\nNow you know how sales work.\nLet us show you how to monitor your restaurant daily."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "gs_monitoring_explain",
      trackId: "getting_started",
      progressStart: 70,
      progressEnd: 85,
      message: {
        ar: "من شاشة نظرة عامة يمكنك:\n\n• متابعة المبيعات\n• مشاهدة الإشعارات\n• معرفة أي فروقات نقدية",
        en: "From the Overview screen you can:\n\n• Monitor sales\n• View notifications\n• See any cash differences"
      },
      highlights: [
        "[data-trainer='daily-summary']",
        "[data-trainer='notifications-alerts']",
        "[data-trainer='cash-differences']"
      ],
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    // STAGE 5 - What's Next (85% → 100%)
    {
      id: "gs_future_intro",
      trackId: "getting_started",
      progressStart: 85,
      progressEnd: 90,
      message: {
        ar: "أنت الآن جاهز لاستخدام النظام بالكامل 🎉\n\nباقي الميزات مثل التقارير، المخزون، والعروض\nيمكنك استخدامها لاحقًا حسب حاجتك.",
        en: "You are now ready to use the full system 🎉\n\nOther features like Reports, Inventory, and Offers\ncan be used later as needed."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "gs_complete",
      trackId: "getting_started",
      progressStart: 90,
      progressEnd: 100,
      message: {
        ar: "تم إكمال تدريب صاحب المطعم بنجاح ✅\n\nيمكنك دائمًا العودة إلى المدرب الذكي لشرح أي شاشة.",
        en: "Owner training completed successfully ✅\n\nYou can always return to the Smart Trainer for explanations."
      },
      actions: [
        { id: "finish", label: { ar: "إنهاء التدريب", en: "Finish Training" }, type: "finish_track" }
      ]
    }
  ],
  completionMessage: {
    ar: "تم إكمال تدريب صاحب المطعم بنجاح ✅",
    en: "Owner training completed successfully ✅"
  }
};

const TRACK_DAILY_OPERATIONS: TrainingTrack = {
  id: "daily_operations",
  name: { ar: "العمليات اليومية", en: "Daily Operations" },
  description: { ar: "تعلم كيفية متابعة العمل اليومي", en: "Learn how to monitor daily work" },
  triggerType: "conditional",
  triggerCondition: "first_shift_or_order_or_24h",
  steps: [
    {
      id: "do_intro",
      trackId: "daily_operations",
      progressStart: 0,
      progressEnd: 20,
      message: {
        ar: "مرحباً بك في مرحلة العمليات اليومية! 📊\n\nسنتعرف الآن على كيفية متابعة الطلبات والمبيعات.",
        en: "Welcome to Daily Operations! 📊\n\nLet's learn how to monitor orders and sales."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "do_menu_overview",
      trackId: "daily_operations",
      progressStart: 20,
      progressEnd: 40,
      message: {
        ar: "من صفحة القائمة يمكنك إدارة الأصناف والأسعار والتصنيفات.\n\nكل تغيير ينعكس فوراً على نقاط البيع.",
        en: "From the Menu page you can manage items, prices, and categories.\n\nEvery change reflects immediately on POS."
      },
      actions: [
        { id: "go_menu", label: { ar: "عرض القائمة", en: "View Menu" }, type: "navigate", navigateTo: "menu" },
        { id: "skip", label: { ar: "تخطي", en: "Skip" }, type: "next" }
      ]
    },
    {
      id: "do_pos_overview",
      trackId: "daily_operations",
      progressStart: 40,
      progressEnd: 60,
      message: {
        ar: "نقاط البيع (POS) هي المكان الذي يعمل منه الكاشير.\n\nيمكنك متابعة الطلبات المفتوحة وحالة الورديات من لوحة التحكم.",
        en: "Point of Sale (POS) is where cashiers work.\n\nYou can monitor open orders and shift status from the dashboard."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "do_monitoring",
      trackId: "daily_operations",
      progressStart: 60,
      progressEnd: 80,
      message: {
        ar: "كمالك، يمكنك متابعة:\n• المبيعات اليومية\n• حالة الورديات\n• فروقات الكاش\n• أداء الموظفين",
        en: "As an owner, you can monitor:\n• Daily sales\n• Shift status\n• Cash differences\n• Staff performance"
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "do_complete",
      trackId: "daily_operations",
      progressStart: 80,
      progressEnd: 100,
      message: {
        ar: "أنت الآن تفهم أساسيات العمليات اليومية! 🎯\n\nتابع عملك بثقة.",
        en: "You now understand daily operations basics! 🎯\n\nContinue working with confidence."
      },
      actions: [
        { id: "finish", label: { ar: "تم", en: "Done" }, type: "finish_track" }
      ]
    }
  ],
  completionMessage: {
    ar: "تم إكمال مرحلة العمليات اليومية ✅",
    en: "Daily Operations completed ✅"
  }
};

const TRACK_INSIGHTS_REPORTS: TrainingTrack = {
  id: "insights_reports",
  name: { ar: "التحليلات والتقارير", en: "Insights & Reports" },
  description: { ar: "تعلم قراءة الأرقام والتقارير", en: "Learn to read numbers and reports" },
  triggerType: "conditional",
  triggerCondition: "reports_data_available",
  steps: [
    {
      id: "ir_intro",
      trackId: "insights_reports",
      progressStart: 0,
      progressEnd: 25,
      message: {
        ar: "حان وقت فهم الأرقام! 📈\n\nسنتعلم كيفية قراءة التقارير والتحليلات.",
        en: "Time to understand the numbers! 📈\n\nLet's learn how to read reports and analytics."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "ir_analytics",
      trackId: "insights_reports",
      progressStart: 25,
      progressEnd: 50,
      message: {
        ar: "صفحة التحليلات تُظهر:\n• رسوم بيانية للمبيعات\n• الأصناف الأكثر مبيعاً\n• مقارنات زمنية",
        en: "Analytics page shows:\n• Sales charts\n• Best-selling items\n• Time comparisons"
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "ir_reports",
      trackId: "insights_reports",
      progressStart: 50,
      progressEnd: 75,
      message: {
        ar: "التقارير تُقدم بيانات مفصّلة عن:\n• الإيرادات والمصروفات\n• أداء الموظفين\n• حركة المخزون",
        en: "Reports provide detailed data on:\n• Revenue and expenses\n• Staff performance\n• Inventory movement"
      },
      actions: [
        { id: "go_reports", label: { ar: "عرض التقارير", en: "View Reports" }, type: "navigate", navigateTo: "reports" },
        { id: "skip", label: { ar: "تخطي", en: "Skip" }, type: "next" }
      ]
    },
    {
      id: "ir_complete",
      trackId: "insights_reports",
      progressStart: 75,
      progressEnd: 100,
      message: {
        ar: "ممتاز! أنت الآن تستطيع قراءة وفهم التقارير. 📊\n\nاستخدمها لاتخاذ قرارات أفضل.",
        en: "Excellent! You can now read and understand reports. 📊\n\nUse them to make better decisions."
      },
      actions: [
        { id: "finish", label: { ar: "تم", en: "Done" }, type: "finish_track" }
      ]
    }
  ],
  completionMessage: {
    ar: "تم إكمال مرحلة التحليلات والتقارير ✅",
    en: "Insights & Reports completed ✅"
  }
};

const TRACK_MANAGEMENT_EXPANSION: TrainingTrack = {
  id: "management_expansion",
  name: { ar: "الإدارة والتوسع", en: "Management & Expansion" },
  description: { ar: "الفروع والموظفين والصلاحيات", en: "Branches, staff, and permissions" },
  triggerType: "manual",
  steps: [
    {
      id: "me_intro",
      trackId: "management_expansion",
      progressStart: 0,
      progressEnd: 20,
      message: {
        ar: "مرحباً بك في مرحلة الإدارة المتقدمة! 🏢\n\nستتعلم هنا إدارة الفروع والموظفين.",
        en: "Welcome to Advanced Management! 🏢\n\nYou'll learn to manage branches and staff here."
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "me_branches",
      trackId: "management_expansion",
      progressStart: 20,
      progressEnd: 40,
      message: {
        ar: "من إدارة الفروع يمكنك:\n• إضافة فروع جديدة\n• تعديل بيانات الفروع\n• تفعيل أو إيقاف فرع",
        en: "From Branches management you can:\n• Add new branches\n• Edit branch details\n• Enable or disable a branch"
      },
      actions: [
        { id: "go_branches", label: { ar: "عرض الفروع", en: "View Branches" }, type: "navigate", navigateTo: "branches" },
        { id: "skip", label: { ar: "تخطي", en: "Skip" }, type: "next" }
      ]
    },
    {
      id: "me_staff",
      trackId: "management_expansion",
      progressStart: 40,
      progressEnd: 60,
      message: {
        ar: "من إدارة الموظفين يمكنك:\n• إضافة كاشير أو طاهٍ\n• تعيين الأدوار والصلاحيات\n• ربط الموظف بفرع معين",
        en: "From Staff management you can:\n• Add cashier or kitchen staff\n• Assign roles and permissions\n• Link staff to specific branch"
      },
      actions: [
        { id: "go_staff", label: { ar: "عرض الموظفين", en: "View Staff" }, type: "navigate", navigateTo: "staff" },
        { id: "skip", label: { ar: "تخطي", en: "Skip" }, type: "next" }
      ]
    },
    {
      id: "me_advanced_settings",
      trackId: "management_expansion",
      progressStart: 60,
      progressEnd: 80,
      message: {
        ar: "الإعدادات المتقدمة تشمل:\n• طرق الدفع لكل فرع\n• إعدادات الخصومات\n• المخزون والوصفات",
        en: "Advanced settings include:\n• Payment methods per branch\n• Discount settings\n• Inventory and recipes"
      },
      actions: [
        { id: "next", label: { ar: "التالي", en: "Next" }, type: "next" }
      ]
    },
    {
      id: "me_complete",
      trackId: "management_expansion",
      progressStart: 80,
      progressEnd: 100,
      message: {
        ar: "أنت الآن مستعد لإدارة مطعمك بالكامل! 🎉\n\nتم إكمال جميع مراحل التدريب.",
        en: "You're now ready to fully manage your restaurant! 🎉\n\nAll training tracks completed."
      },
      actions: [
        { id: "finish", label: { ar: "إنهاء التدريب", en: "Finish Training" }, type: "finish_track" }
      ]
    }
  ],
  completionMessage: {
    ar: "تم إكمال مرحلة الإدارة والتوسع ✅",
    en: "Management & Expansion completed ✅"
  }
};

// All tracks in order
export const TRAINING_TRACKS: TrainingTrack[] = [
  TRACK_GETTING_STARTED,
  TRACK_DAILY_OPERATIONS,
  TRACK_INSIGHTS_REPORTS,
  TRACK_MANAGEMENT_EXPANSION
];

// ============================================
// LOCAL STORAGE - PROGRESS PERSISTENCE
// ============================================

const OWNER_TRAINING_KEY = "kastana_owner_training_v2";

function getDefaultProgress(): OwnerTrainingProgress {
  return {
    completedTracks: [],
    currentTrackId: null,
    currentStepId: null,
    trackProgress: {},
    isPaused: false,
    isFullyCompleted: false,
    firstLoginAt: null,
    firstShiftOpenedAt: null,
    firstOrderCreatedAt: null,
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
// TRACK & STEP HELPERS
// ============================================

export function getTrack(trackId: TrackId): TrainingTrack | null {
  return TRAINING_TRACKS.find(t => t.id === trackId) || null;
}

export function getStep(trackId: TrackId, stepId: StepId): TrainingStep | null {
  const track = getTrack(trackId);
  if (!track) return null;
  return track.steps.find(s => s.id === stepId) || null;
}

export function getCurrentStep(): TrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId || !progress.currentStepId) return null;
  return getStep(progress.currentTrackId, progress.currentStepId);
}

export function getCurrentTrack(): TrainingTrack | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId) return null;
  return getTrack(progress.currentTrackId);
}

// ============================================
// TRIGGER CONDITION CHECKS
// ============================================

export function checkTrack2Trigger(): boolean {
  const progress = getOwnerTrainingProgress();
  
  // Already completed or in progress
  if (progress.completedTracks.includes("daily_operations")) return false;
  if (progress.currentTrackId === "daily_operations") return false;
  
  // Must have completed Track 1
  if (!progress.completedTracks.includes("getting_started")) return false;
  
  // Check triggers: first shift, first order, or 24h after first login
  if (progress.firstShiftOpenedAt) return true;
  if (progress.firstOrderCreatedAt) return true;
  
  if (progress.firstLoginAt) {
    const hoursSinceLogin = (Date.now() - progress.firstLoginAt) / (1000 * 60 * 60);
    if (hoursSinceLogin >= 24) return true;
  }
  
  return false;
}

export function checkTrack3Trigger(): boolean {
  const progress = getOwnerTrainingProgress();
  
  // Already completed or in progress
  if (progress.completedTracks.includes("insights_reports")) return false;
  if (progress.currentTrackId === "insights_reports") return false;
  
  // Must have completed Track 2
  if (!progress.completedTracks.includes("daily_operations")) return false;
  
  // Track 3 triggers when there's data (simplified - just check if Track 2 is done)
  // In a real scenario, you'd check if reports/analytics have data
  return true;
}

// ============================================
// TRAINING STATE CHECKS
// ============================================

export function ownerNeedsTraining(): boolean {
  const progress = getOwnerTrainingProgress();
  return !progress.isFullyCompleted;
}

export function isOwnerTrainingActive(): boolean {
  const progress = getOwnerTrainingProgress();
  return progress.currentTrackId !== null && !progress.isPaused && !progress.isFullyCompleted;
}

export function isOwnerTrainingPaused(): boolean {
  const progress = getOwnerTrainingProgress();
  return progress.isPaused && !progress.isFullyCompleted;
}

export function isOwnerTrainingCompleted(): boolean {
  return getOwnerTrainingProgress().isFullyCompleted;
}

export function isTrackCompleted(trackId: TrackId): boolean {
  return getOwnerTrainingProgress().completedTracks.includes(trackId);
}

export function getTrackProgress(trackId: TrackId): number {
  return getOwnerTrainingProgress().trackProgress[trackId] || 0;
}

export function getOverallProgress(): number {
  const progress = getOwnerTrainingProgress();
  const completedCount = progress.completedTracks.length;
  const totalTracks = TRAINING_TRACKS.length;
  
  // Add current track partial progress
  let currentTrackProgress = 0;
  if (progress.currentTrackId && progress.trackProgress[progress.currentTrackId]) {
    currentTrackProgress = (progress.trackProgress[progress.currentTrackId] || 0) / 100 / totalTracks;
  }
  
  return Math.round((completedCount / totalTracks + currentTrackProgress) * 100);
}

export function getCompletedTracks(): TrackId[] {
  return getOwnerTrainingProgress().completedTracks;
}

export function getAvailableTracks(): TrainingTrack[] {
  const progress = getOwnerTrainingProgress();
  
  return TRAINING_TRACKS.filter(track => {
    // Already completed
    if (progress.completedTracks.includes(track.id)) return false;
    
    // Currently in progress
    if (progress.currentTrackId === track.id) return false;
    
    // Check availability based on trigger type
    switch (track.id) {
      case "getting_started":
        return true; // Always available if not completed
      case "daily_operations":
        return progress.completedTracks.includes("getting_started");
      case "insights_reports":
        return progress.completedTracks.includes("daily_operations");
      case "management_expansion":
        return true; // Manual, always available
      default:
        return false;
    }
  });
}

export function getNextRecommendedTrack(): TrainingTrack | null {
  const progress = getOwnerTrainingProgress();
  
  // Track 1 first
  if (!progress.completedTracks.includes("getting_started")) {
    return TRACK_GETTING_STARTED;
  }
  
  // Track 2 if triggered
  if (checkTrack2Trigger()) {
    return TRACK_DAILY_OPERATIONS;
  }
  
  // Track 3 if triggered
  if (checkTrack3Trigger()) {
    return TRACK_INSIGHTS_REPORTS;
  }
  
  // Track 4 is manual
  if (!progress.completedTracks.includes("management_expansion")) {
    return TRACK_MANAGEMENT_EXPANSION;
  }
  
  return null;
}

// ============================================
// TRAINING ACTIONS
// ============================================

/**
 * Record first login timestamp
 */
export function recordFirstLogin(): void {
  const progress = getOwnerTrainingProgress();
  if (!progress.firstLoginAt) {
    progress.firstLoginAt = Date.now();
    saveOwnerTrainingProgress(progress);
  }
}

/**
 * Record first shift opened
 */
export function recordFirstShiftOpened(): void {
  const progress = getOwnerTrainingProgress();
  if (!progress.firstShiftOpenedAt) {
    progress.firstShiftOpenedAt = Date.now();
    saveOwnerTrainingProgress(progress);
  }
}

/**
 * Record first order created
 */
export function recordFirstOrderCreated(): void {
  const progress = getOwnerTrainingProgress();
  if (!progress.firstOrderCreatedAt) {
    progress.firstOrderCreatedAt = Date.now();
    saveOwnerTrainingProgress(progress);
  }
}

/**
 * Start a specific track
 */
export function startTrack(trackId: TrackId): TrainingStep | null {
  const track = getTrack(trackId);
  if (!track || track.steps.length === 0) return null;
  
  const firstStep = track.steps[0];
  const progress = getOwnerTrainingProgress();
  
  progress.currentTrackId = trackId;
  progress.currentStepId = firstStep.id;
  progress.trackProgress[trackId] = firstStep.progressEnd;
  progress.isPaused = false;
  
  // Record first login if starting Track 1
  if (trackId === "getting_started" && !progress.firstLoginAt) {
    progress.firstLoginAt = Date.now();
  }
  
  saveOwnerTrainingProgress(progress);
  return firstStep;
}

/**
 * Start owner training from beginning (Track 1)
 */
export function startOwnerTraining(): TrainingStep | null {
  return startTrack("getting_started");
}

/**
 * Resume paused training
 */
export function resumeOwnerTraining(): TrainingStep | null {
  const progress = getOwnerTrainingProgress();
  
  if (progress.currentTrackId && progress.currentStepId) {
    progress.isPaused = false;
    saveOwnerTrainingProgress(progress);
    return getStep(progress.currentTrackId, progress.currentStepId);
  }
  
  // No current training, start from beginning or next available
  const nextTrack = getNextRecommendedTrack();
  if (nextTrack) {
    return startTrack(nextTrack.id);
  }
  
  return null;
}

/**
 * Go to next step in current track
 */
export function nextStep(): TrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId || !progress.currentStepId) return null;
  
  const track = getTrack(progress.currentTrackId);
  if (!track) return null;
  
  const currentIndex = track.steps.findIndex(s => s.id === progress.currentStepId);
  if (currentIndex === -1) return null;
  
  const nextIndex = currentIndex + 1;
  if (nextIndex >= track.steps.length) {
    // End of track
    return null;
  }
  
  const nextStepData = track.steps[nextIndex];
  progress.currentStepId = nextStepData.id;
  progress.trackProgress[progress.currentTrackId] = nextStepData.progressEnd;
  saveOwnerTrainingProgress(progress);
  
  return nextStepData;
}

/**
 * Navigate to a specific step (used for navigation actions)
 */
export function goToStep(stepId: StepId): TrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId) return null;
  
  const step = getStep(progress.currentTrackId, stepId);
  if (!step) return null;
  
  progress.currentStepId = stepId;
  progress.trackProgress[progress.currentTrackId] = step.progressEnd;
  saveOwnerTrainingProgress(progress);
  
  return step;
}

/**
 * Complete current track
 */
export function completeCurrentTrack(): void {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId) return;
  
  // Mark track as completed
  if (!progress.completedTracks.includes(progress.currentTrackId)) {
    progress.completedTracks.push(progress.currentTrackId);
  }
  progress.trackProgress[progress.currentTrackId] = 100;
  
  // Clear current state
  progress.currentTrackId = null;
  progress.currentStepId = null;
  progress.isPaused = false;
  
  // Check if all tracks are completed
  if (progress.completedTracks.length >= TRAINING_TRACKS.length) {
    progress.isFullyCompleted = true;
  }
  
  saveOwnerTrainingProgress(progress);
}

/**
 * Pause training
 */
export function pauseOwnerTraining(): void {
  const progress = getOwnerTrainingProgress();
  progress.isPaused = true;
  saveOwnerTrainingProgress(progress);
}

/**
 * Skip current track (mark as skipped, not completed)
 */
export function skipCurrentTrack(): void {
  const progress = getOwnerTrainingProgress();
  progress.currentTrackId = null;
  progress.currentStepId = null;
  progress.isPaused = true;
  saveOwnerTrainingProgress(progress);
}

/**
 * Reset all training (for testing)
 */
export function resetOwnerTraining(): void {
  localStorage.removeItem(OWNER_TRAINING_KEY);
}

// ============================================
// LEGACY COMPATIBILITY
// ============================================

// These functions maintain backward compatibility with the old API

export function getCurrentOwnerStep(): TrainingStep | null {
  return getCurrentStep();
}

export function getOwnerProgressPercent(): number {
  return getOverallProgress();
}

export function completeOwnerTraining(): void {
  completeCurrentTrack();
}

export function nextOwnerStep(): TrainingStep | null {
  return nextStep();
}

// For navigate actions that go to settings
export function goToSettingsStep(): TrainingStep | null {
  const progress = getOwnerTrainingProgress();
  if (!progress.currentTrackId) return null;
  
  // Find the settings guide step in current track
  const track = getTrack(progress.currentTrackId);
  if (!track) return null;
  
  // Find next step after current
  const currentIndex = track.steps.findIndex(s => s.id === progress.currentStepId);
  if (currentIndex === -1 || currentIndex >= track.steps.length - 1) return null;
  
  const nextStepData = track.steps[currentIndex + 1];
  return goToStep(nextStepData.id);
}
