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
 * Un-dismiss a specific card (for re-opening)
 */
export function undismissCard(cardId: string): void {
  const dismissed = getDismissedCards();
  const updated = dismissed.filter((id) => id !== cardId);
  localStorage.setItem(DISMISSED_CARDS_KEY, JSON.stringify(updated));
}

/**
 * Get a training card by ID
 */
export function getCardById(cardId: string): TrainingCard | null {
  return TRAINING_CARDS.find((card) => card.id === cardId) || null;
}

/**
 * Get cards by context (screen)
 */
export function getCardsByContext(context: string): TrainingCard[] {
  return TRAINING_CARDS.filter(
    (card) => card.context && card.context.includes(context)
  );
}

/**
 * Training cards data - sourced from assistant_knowledge.json patterns
 * Arabic primary, English POS terms allowed
 */
const TRAINING_CARDS: TrainingCard[] = [
  {
    id: "training_new_order",
    title: {
      ar: "إنشاء طلب جديد",
      en: "Creating a New Order",
    },
    whyMatters: {
      ar: "كل طلب لازم يبدأ صح عشان يتسجل في النظام",
      en: "Every order must start correctly to be recorded in the system",
    },
    steps: {
      ar: [
        "اضغط 'New Order' واختر نوع الطلب",
        "اختر Takeaway للسفري أو Dine-in للصالة",
        "ابدأ بإضافة الأصناف للطلب",
      ],
      en: [
        "Click 'New Order' and select order type",
        "Choose Takeaway or Dine-in",
        "Start adding items to the order",
      ],
    },
    tip: {
      ar: "Dine-in يتطلب اختيار طاولة",
      en: "Dine-in requires selecting a table",
    },
    keywords: ["طلب جديد", "new order", "takeaway", "سفري", "dine-in", "صالة", "طاولة"],
    context: ["pos"],
  },
  {
    id: "training_hold_order",
    title: {
      ar: "تعليق واستئناف الطلب",
      en: "Hold and Resume Orders",
    },
    whyMatters: {
      ar: "تقدر تخدم أكثر من عميل بدون ما تضيع الطلبات",
      en: "Serve multiple customers without losing orders",
    },
    steps: {
      ar: [
        "اضغط 'Hold' لحفظ الطلب مؤقتاً",
        "افتح قائمة 'Held Orders'",
        "اختر الطلب واضغط 'Resume' لإكماله",
      ],
      en: [
        "Click 'Hold' to save order temporarily",
        "Open 'Held Orders' list",
        "Select order and click 'Resume' to continue",
      ],
    },
    tip: {
      ar: "الطلبات المعلقة تظهر برقم تسلسلي",
      en: "Held orders show with a sequence number",
    },
    keywords: ["تعليق", "hold", "معلق", "استئناف", "resume", "held orders"],
    context: ["pos"],
  },
  {
    id: "training_payment_flow",
    title: {
      ar: "إتمام الدفع",
      en: "Completing Payment",
    },
    whyMatters: {
      ar: "الدفع الصحيح يضمن دقة الكاش والتقارير",
      en: "Correct payment ensures accurate cash and reports",
    },
    steps: {
      ar: [
        "اضغط 'Pay' بعد إضافة كل الأصناف",
        "اختر طريقة الدفع (Cash / Card / Split)",
        "أدخل المبلغ واضغط 'Confirm'",
      ],
      en: [
        "Click 'Pay' after adding all items",
        "Select payment method (Cash / Card / Split)",
        "Enter amount and click 'Confirm'",
      ],
    },
    tip: {
      ar: "Split يتيح تقسيم الفاتورة على أكثر من طريقة",
      en: "Split allows dividing bill across multiple methods",
    },
    keywords: ["دفع", "فاتورة", "payment", "pay", "checkout", "cash", "card", "split"],
    context: ["pos"],
  },
  {
    id: "training_close_shift",
    title: {
      ar: "إغلاق الوردية",
      en: "Closing the Shift",
    },
    whyMatters: {
      ar: "الإغلاق الصحيح يحفظ بيانات اليوم ويكشف الفروقات",
      en: "Proper closing saves daily data and reveals variances",
    },
    steps: {
      ar: [
        "اضغط 'Close Shift' من القائمة",
        "عدّ الكاش في الدرج وأدخل المبلغ",
        "راجع الفرق واضغط 'Confirm'",
      ],
      en: [
        "Click 'Close Shift' from menu",
        "Count drawer cash and enter amount",
        "Review variance and click 'Confirm'",
      ],
    },
    tip: {
      ar: "الفرق السالب = نقص في الكاش",
      en: "Negative variance = cash shortage",
    },
    keywords: ["إغلاق", "وردية", "close shift", "شفت", "نهاية اليوم", "درج"],
    context: ["pos"],
  },
  {
    id: "training_z_report",
    title: {
      ar: "قراءة تقرير Z",
      en: "Reading Z Report",
    },
    whyMatters: {
      ar: "Z Report يعطيك ملخص كامل لأداء الوردية",
      en: "Z Report gives complete summary of shift performance",
    },
    steps: {
      ar: [
        "راجع Gross Sales (الإجمالي) و Net Sales (الصافي)",
        "تحقق من توزيع المدفوعات (Cash / Card)",
        "قارن Expected Cash بالمبلغ الفعلي في الدرج",
      ],
      en: [
        "Review Gross Sales and Net Sales",
        "Check payment breakdown (Cash / Card)",
        "Compare Expected Cash with actual drawer amount",
      ],
    },
    tip: {
      ar: "Net = Gross - Refunds - Discounts",
      en: "Net = Gross - Refunds - Discounts",
    },
    keywords: ["تقرير z", "z report", "تقرير الوردية", "shift report", "ملخص"],
    context: ["pos", "reports"],
  },
  {
    id: "training_inventory_count",
    title: {
      ar: "جرد المخزون",
      en: "Inventory Stock Count",
    },
    whyMatters: {
      ar: "الجرد يكشف الفروقات ويحافظ على دقة الكميات",
      en: "Stock count reveals variances and maintains quantity accuracy",
    },
    steps: {
      ar: [
        "اذهب لصفحة Inventory واختر 'Stock Count'",
        "أدخل الكميات الفعلية لكل صنف",
        "راجع الفروقات وأرسل للاعتماد",
      ],
      en: [
        "Go to Inventory page and select 'Stock Count'",
        "Enter actual quantities for each item",
        "Review variances and submit for approval",
      ],
    },
    tip: {
      ar: "الفرق الكبير يحتاج مراجعة قبل الاعتماد",
      en: "Large variance needs review before approval",
    },
    keywords: ["جرد", "مخزون", "stock count", "inventory", "كميات", "فروقات"],
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
