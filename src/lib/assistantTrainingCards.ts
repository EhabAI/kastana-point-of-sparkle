// Kastana POS Assistant - Training Cards System
// Short, contextual training cards from assistant_knowledge.json

export interface TrainingCard {
  id: string;
  title: {
    ar: string;
    en: string;
  };
  whyMatters: {
    ar: string;
    en: string;
  };
  steps: {
    ar: string[];
    en: string[];
  };
  tip?: {
    ar: string;
    en: string;
  };
  keywords: string[];
  context?: string[]; // Screen contexts where this card is relevant
}

// Storage key for dismissed cards
const DISMISSED_CARDS_KEY = "kastana_dismissed_training_cards";

/**
 * Get list of dismissed card IDs from localStorage
 */
export function getDismissedCards(): string[] {
  try {
    const stored = localStorage.getItem(DISMISSED_CARDS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Dismiss a training card (remember per user)
 */
export function dismissCard(cardId: string): void {
  const dismissed = getDismissedCards();
  if (!dismissed.includes(cardId)) {
    dismissed.push(cardId);
    localStorage.setItem(DISMISSED_CARDS_KEY, JSON.stringify(dismissed));
  }
}

/**
 * Check if a card has been dismissed
 */
export function isCardDismissed(cardId: string): boolean {
  return getDismissedCards().includes(cardId);
}

/**
 * Reset all dismissed cards (for testing/support)
 */
export function resetDismissedCards(): void {
  localStorage.removeItem(DISMISSED_CARDS_KEY);
}

/**
 * Training cards data - sourced from assistant_knowledge.json patterns
 */
const TRAINING_CARDS: TrainingCard[] = [
  {
    id: "training_payment_flow",
    title: {
      ar: "إتمام عملية الدفع",
      en: "Completing a Payment",
    },
    whyMatters: {
      ar: "الدفع الصحيح يضمن دقة التقارير والمحاسبة",
      en: "Correct payment ensures accurate reports and accounting",
    },
    steps: {
      ar: [
        "اضغط \"دفع\" بعد إضافة الأصناف",
        "اختر طريقة الدفع وأدخل المبلغ",
        "اضغط \"تأكيد\" لإتمام العملية",
      ],
      en: [
        "Click \"Pay\" after adding items",
        "Select payment method and enter amount",
        "Click \"Confirm\" to complete",
      ],
    },
    tip: {
      ar: "يمكنك تقسيم الدفع على أكثر من طريقة",
      en: "You can split payment across multiple methods",
    },
    keywords: ["دفع", "فاتورة", "payment", "pay", "checkout"],
    context: ["pos"],
  },
  {
    id: "training_hold_order",
    title: {
      ar: "تعليق واستئناف الطلب",
      en: "Hold and Resume Orders",
    },
    whyMatters: {
      ar: "يتيح لك خدمة عدة عملاء دون فقدان الطلبات",
      en: "Allows serving multiple customers without losing orders",
    },
    steps: {
      ar: [
        "اضغط \"Hold\" لحفظ الطلب مؤقتاً",
        "افتح \"Held Orders\" لعرض المعلقة",
        "اختر الطلب واضغط \"Resume\"",
      ],
      en: [
        "Click \"Hold\" to save order temporarily",
        "Open \"Held Orders\" to view pending",
        "Select order and click \"Resume\"",
      ],
    },
    keywords: ["تعليق", "hold", "معلق", "استئناف", "resume"],
    context: ["pos"],
  },
  {
    id: "training_shift_open",
    title: {
      ar: "فتح الوردية",
      en: "Opening a Shift",
    },
    whyMatters: {
      ar: "الوردية المفتوحة مطلوبة لتسجيل أي مبيعات",
      en: "Open shift is required to record any sales",
    },
    steps: {
      ar: [
        "اضغط \"فتح وردية\"",
        "أدخل المبلغ الافتتاحي في الدرج",
        "اضغط \"تأكيد\"",
      ],
      en: [
        "Click \"Open Shift\"",
        "Enter opening cash in drawer",
        "Click \"Confirm\"",
      ],
    },
    tip: {
      ar: "احرص على عد النقود بدقة قبل الإدخال",
      en: "Count cash carefully before entering",
    },
    keywords: ["وردية", "شفت", "shift", "فتح", "open", "بداية"],
    context: ["pos"],
  },
  {
    id: "training_z_report",
    title: {
      ar: "فهم تقرير Z",
      en: "Understanding Z Report",
    },
    whyMatters: {
      ar: "يلخص أداء الوردية ويكشف الفروقات",
      en: "Summarizes shift performance and reveals variances",
    },
    steps: {
      ar: [
        "راجع Gross vs Net للمبيعات",
        "تحقق من توزيع طرق الدفع",
        "قارن النقد المتوقع بالفعلي",
      ],
      en: [
        "Review Gross vs Net sales",
        "Check payment method breakdown",
        "Compare expected vs actual cash",
      ],
    },
    tip: {
      ar: "الفرق السالب = نقص في النقد",
      en: "Negative variance = cash shortage",
    },
    keywords: ["تقرير z", "z report", "إغلاق", "وردية", "shift report"],
    context: ["reports", "pos"],
  },
  {
    id: "training_refund",
    title: {
      ar: "معالجة الاسترداد",
      en: "Processing Refunds",
    },
    whyMatters: {
      ar: "المرتجعات تؤثر على صافي المبيعات والتقارير",
      en: "Refunds affect net sales and reports",
    },
    steps: {
      ar: [
        "افتح الطلب المدفوع",
        "اضغط \"Refund\" واختر السبب",
        "أكد المبلغ المسترد",
      ],
      en: [
        "Open the paid order",
        "Click \"Refund\" and select reason",
        "Confirm refund amount",
      ],
    },
    tip: {
      ar: "Void قبل الدفع لا يُسجل كمرتجع",
      en: "Void before payment is not recorded as refund",
    },
    keywords: ["استرداد", "مرتجع", "refund", "return", "إرجاع"],
    context: ["pos", "reports"],
  },
  {
    id: "training_inventory_count",
    title: {
      ar: "الجرد اليومي",
      en: "Daily Stock Count",
    },
    whyMatters: {
      ar: "يكشف الفروقات ويحافظ على دقة المخزون",
      en: "Reveals variances and maintains inventory accuracy",
    },
    steps: {
      ar: [
        "اذهب لإدارة المخزون",
        "اختر \"جرد جديد\" وأدخل الكميات",
        "راجع الفروقات وأرسل للاعتماد",
      ],
      en: [
        "Go to Inventory Management",
        "Select \"New Count\" and enter quantities",
        "Review variances and submit for approval",
      ],
    },
    keywords: ["جرد", "مخزون", "stock count", "inventory", "count"],
    context: ["inventory"],
  },
];

/**
 * Find relevant training card based on user message
 */
export function findRelevantCard(
  message: string,
  currentContext?: string
): TrainingCard | null {
  const lowerMessage = message.toLowerCase();
  const dismissed = getDismissedCards();

  // Find cards matching keywords and not dismissed
  const matchingCards = TRAINING_CARDS.filter((card) => {
    // Skip if dismissed
    if (dismissed.includes(card.id)) return false;

    // Check keyword match
    const hasKeywordMatch = card.keywords.some((kw) =>
      lowerMessage.includes(kw.toLowerCase())
    );

    // Check context match if provided
    const hasContextMatch =
      !currentContext ||
      !card.context ||
      card.context.includes(currentContext);

    return hasKeywordMatch && hasContextMatch;
  });

  // Return first matching card (most relevant)
  return matchingCards.length > 0 ? matchingCards[0] : null;
}

/**
 * Get all training cards (for admin/listing purposes)
 */
export function getAllTrainingCards(): TrainingCard[] {
  return TRAINING_CARDS;
}

/**
 * Get undismissed training cards
 */
export function getActiveTrainingCards(): TrainingCard[] {
  const dismissed = getDismissedCards();
  return TRAINING_CARDS.filter((card) => !dismissed.includes(card.id));
}
