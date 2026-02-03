/**
 * Kastana Smart Assistant - Explanation Style Variation Engine
 * 
 * CRITICAL RULES:
 * 1. When user asks for clarification (اشرح أكثر, وضّح أكثر, etc.), 
 *    NEVER repeat the same explanation
 * 2. Automatically switch to a DIFFERENT explanation style
 * 3. Never use the same style twice in a row
 * 4. Never ask user which style they prefer - auto-select
 * 
 * Style types:
 * - analogy: Real-world comparison (تشبيه واقعي)
 * - example: Practical example (مثال عملي)
 * - scenario: Daily operation scenario (سيناريو يوم عمل)
 * - numbers: Accounting/numbers logic (منطق محاسبي)
 * - mistakes: Common mistakes (أخطاء شائعة)
 * - role_focused: Role-specific explanation (شرح حسب الدور)
 * - simplified: Extreme simplification (تبسيط شديد)
 * - system_thinking: How the system thinks (كيف يفكر النظام)
 */

export type ExplanationStyle = 
  | "analogy"
  | "example"
  | "scenario"
  | "numbers"
  | "mistakes"
  | "role_focused"
  | "simplified"
  | "system_thinking";

interface StyleHistory {
  topicId: string;
  usedStyles: ExplanationStyle[];
  lastStyle: ExplanationStyle | null;
  timestamp: number;
}

// Session-only style tracking (not persisted)
let styleHistoryMap: Record<string, StyleHistory> = {};

// Clarification trigger patterns
const CLARIFICATION_PATTERNS = {
  ar: [
    "اشرح أكثر",
    "وضّح أكثر",
    "ما فهمت",
    "كيف؟",
    "ليش؟",
    "ممكن تفصيل؟",
    "احكيلي بطريقة أبسط",
    "مش فاهم",
    "مو فاهم",
    "ما استوعبت",
    "بطريقة تانية",
    "اشرحلي مرة ثانية",
    "بالعربي البسيط",
    "شو يعني",
    "ايش يعني",
    "وش يعني",
  ],
  en: [
    "explain more",
    "clarify",
    "i don't understand",
    "don't understand",
    "how?",
    "why?",
    "can you detail",
    "in simpler terms",
    "not getting it",
    "explain differently",
    "say it again",
    "what does that mean",
    "break it down",
    "put it simply",
    "eli5",
    "explain like",
  ],
};

/**
 * Check if user message is asking for clarification
 */
export function isClarificationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  const allPatterns = [...CLARIFICATION_PATTERNS.ar, ...CLARIFICATION_PATTERNS.en];
  return allPatterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()));
}

/**
 * Get the next style to use for a topic
 * Never returns the same style as lastStyle
 */
export function getNextStyle(topicId: string): ExplanationStyle {
  const history = styleHistoryMap[topicId];
  const allStyles: ExplanationStyle[] = [
    "analogy",
    "example",
    "scenario",
    "numbers",
    "mistakes",
    "role_focused",
    "simplified",
    "system_thinking",
  ];

  // If no history, start with analogy (most accessible)
  if (!history || history.usedStyles.length === 0) {
    return "analogy";
  }

  // Get styles not yet used for this topic
  const unusedStyles = allStyles.filter(s => !history.usedStyles.includes(s));

  // If all styles used, reset but exclude last used
  if (unusedStyles.length === 0) {
    const availableStyles = allStyles.filter(s => s !== history.lastStyle);
    return availableStyles[Math.floor(Math.random() * availableStyles.length)];
  }

  // Return first unused style (deterministic for consistency)
  return unusedStyles[0];
}

/**
 * Record that a style was used for a topic
 */
export function recordStyleUsage(topicId: string, style: ExplanationStyle): void {
  const existing = styleHistoryMap[topicId];
  
  if (existing) {
    styleHistoryMap[topicId] = {
      ...existing,
      usedStyles: [...existing.usedStyles, style],
      lastStyle: style,
      timestamp: Date.now(),
    };
  } else {
    styleHistoryMap[topicId] = {
      topicId,
      usedStyles: [style],
      lastStyle: style,
      timestamp: Date.now(),
    };
  }
}

/**
 * Get style history for a topic
 */
export function getStyleHistory(topicId: string): StyleHistory | null {
  return styleHistoryMap[topicId] || null;
}

/**
 * Reset style history (on session end or manual reset)
 */
export function resetStyleHistory(): void {
  styleHistoryMap = {};
}

/**
 * Get style-specific explanation wrapper
 * Each style transforms the base content differently
 */
export function getStyledExplanation(
  baseContent: string,
  style: ExplanationStyle,
  topicId: string,
  language: "ar" | "en"
): string {
  const styleTransformers: Record<ExplanationStyle, { ar: string; en: string }> = {
    analogy: {
      ar: "🎯 تشبيه واقعي:\n",
      en: "🎯 Real-world analogy:\n",
    },
    example: {
      ar: "📝 مثال عملي:\n",
      en: "📝 Practical example:\n",
    },
    scenario: {
      ar: "🎬 سيناريو يوم عمل:\n",
      en: "🎬 Daily scenario:\n",
    },
    numbers: {
      ar: "🔢 بالأرقام:\n",
      en: "🔢 In numbers:\n",
    },
    mistakes: {
      ar: "⚠️ أخطاء شائعة:\n",
      en: "⚠️ Common mistakes:\n",
    },
    role_focused: {
      ar: "👤 من منظورك:\n",
      en: "👤 From your perspective:\n",
    },
    simplified: {
      ar: "✨ ببساطة شديدة:\n",
      en: "✨ Super simply:\n",
    },
    system_thinking: {
      ar: "🧠 كيف يفكر النظام:\n",
      en: "🧠 How the system thinks:\n",
    },
  };

  const prefix = styleTransformers[style][language];
  
  // Get the style-specific content for this topic
  const styledContent = getStyleSpecificContent(topicId, style, language);
  
  // If we have specific styled content, use it; otherwise transform base content
  if (styledContent) {
    return prefix + styledContent;
  }
  
  // Fallback: Add prefix to base content with style indicator
  return prefix + baseContent;
}

/**
 * Get pre-defined style-specific content for common topics
 */
function getStyleSpecificContent(
  topicId: string,
  style: ExplanationStyle,
  language: "ar" | "en"
): string | null {
  // Style-specific content database
  const styledContent: Record<string, Partial<Record<ExplanationStyle, { ar: string; en: string }>>> = {
    z_report: {
      analogy: {
        ar: "تخيل تقرير Z مثل فاتورة المياه الشهرية:\n- يوضح كم استهلكت (المبيعات)\n- كم دفعت (النقد والبطاقات)\n- الفرق بين المتوقع والفعلي",
        en: "Think of Z Report like your monthly utility bill:\n- Shows how much you consumed (sales)\n- How much was paid (cash/cards)\n- Difference between expected and actual",
      },
      scenario: {
        ar: "أحمد كاشير أنهى ورديته:\n1. فتح تقرير Z\n2. رأى مبيعات 500 دينار\n3. عدّ الصندوق: 480 دينار\n4. الفرق 20 دينار = يحتاج تحقيق",
        en: "Ahmed the cashier ended his shift:\n1. Opened Z Report\n2. Saw 500 JOD in sales\n3. Counted drawer: 480 JOD\n4. 20 JOD difference = needs investigation",
      },
      numbers: {
        ar: "إجمالي المبيعات: 500\n- المرتجعات: 30\n- الخصومات: 20\n= صافي المبيعات: 450\n\nالنقد المتوقع: 450\nالنقد الفعلي: 445\nالفرق: -5 (نقص)",
        en: "Total Sales: 500\n- Refunds: 30\n- Discounts: 20\n= Net Sales: 450\n\nExpected Cash: 450\nActual Cash: 445\nDifference: -5 (shortage)",
      },
      mistakes: {
        ar: "❌ عدم فتح وردية = لا يوجد تقرير Z\n❌ نسيان تسجيل مرتجع = فرق في الصندوق\n❌ الخلط بين نقد وبطاقة = تقرير غير دقيق",
        en: "❌ Not opening shift = No Z Report\n❌ Forgetting to record refund = drawer difference\n❌ Mixing cash and card = inaccurate report",
      },
    },
    recipes: {
      analogy: {
        ar: "الوصفة مثل قائمة مشتريات لطبخة:\n- الصنف = الطبخة\n- المكونات = المشتريات\n- الكمية = ما تحتاجه من كل مادة",
        en: "Recipe is like a shopping list for a dish:\n- Menu item = the dish\n- Ingredients = shopping items\n- Quantity = how much of each",
      },
      scenario: {
        ar: "الزبون طلب برجر:\n1. النظام يقرأ الوصفة: لحم 200غ، خبز 1، جبن 2 شريحة\n2. يخصم تلقائياً من المخزون\n3. المخزون يتحدث فوراً",
        en: "Customer ordered a burger:\n1. System reads recipe: meat 200g, bun 1, cheese 2 slices\n2. Auto-deducts from inventory\n3. Inventory updates instantly",
      },
      numbers: {
        ar: "سعر البرجر: 3 دينار\nتكلفة الوصفة:\n- لحم: 1 دينار\n- خبز: 0.2 دينار\n- جبن: 0.3 دينار\n= إجمالي التكلفة: 1.5 دينار\n= الربح: 1.5 دينار (50%)",
        en: "Burger price: 3 JOD\nRecipe cost:\n- Meat: 1 JOD\n- Bun: 0.2 JOD\n- Cheese: 0.3 JOD\n= Total cost: 1.5 JOD\n= Profit: 1.5 JOD (50%)",
      },
      mistakes: {
        ar: "❌ عدم ربط وصفة = لا خصم تلقائي\n❌ كمية خاطئة = فرق مخزون\n❌ نسيان مكون = تكلفة غير دقيقة",
        en: "❌ Not linking recipe = no auto-deduction\n❌ Wrong quantity = inventory variance\n❌ Missing ingredient = inaccurate cost",
      },
    },
    inventory_log: {
      analogy: {
        ar: "المخزون مثل حسابك البنكي:\n- إيداع = استلام بضاعة\n- سحب = بيع أو هدر\n- الرصيد = الكمية المتوفرة",
        en: "Inventory is like your bank account:\n- Deposit = receiving goods\n- Withdrawal = sale or waste\n- Balance = available quantity",
      },
      scenario: {
        ar: "صباحاً: وصلت شحنة طماطم 10 كيلو\nظهراً: بعت 30 سلطة (خصم 3 كيلو)\nمساءً: المخزون = 7 كيلو\nلو العد الفعلي = 6 كيلو → فرق 1 كيلو (هدر/خطأ)",
        en: "Morning: Tomato shipment 10kg arrived\nNoon: Sold 30 salads (deducted 3kg)\nEvening: Inventory = 7kg\nIf actual count = 6kg → 1kg variance (waste/error)",
      },
      numbers: {
        ar: "مخزون البداية: 100 وحدة\n+ مشتريات: 50 وحدة\n- مبيعات: 80 وحدة\n- هدر: 5 وحدات\n= المتوقع: 65 وحدة\n\nالفعلي: 62 وحدة\nالفرق: -3 (نقص)",
        en: "Opening stock: 100 units\n+ Purchases: 50 units\n- Sales: 80 units\n- Waste: 5 units\n= Expected: 65 units\n\nActual: 62 units\nVariance: -3 (shortage)",
      },
    },
    shift: {
      analogy: {
        ar: "الوردية مثل دوام الموظف:\n- ساعة الدخول = فتح الوردية\n- ساعة الخروج = إغلاق الوردية\n- التقرير = كشف الحضور والإنجازات",
        en: "Shift is like an employee's workday:\n- Clock in = open shift\n- Clock out = close shift\n- Report = attendance and achievements record",
      },
      scenario: {
        ar: "سارة بدأت الساعة 8:\n1. فتحت وردية بـ 100 دينار افتتاحي\n2. باعت 50 طلب\n3. استلمت 400 دينار نقداً\n4. أغلقت الوردية وسلمت 500 دينار",
        en: "Sara started at 8am:\n1. Opened shift with 100 JOD opening\n2. Sold 50 orders\n3. Received 400 JOD cash\n4. Closed shift and handed over 500 JOD",
      },
    },
    refund: {
      analogy: {
        ar: "المرتجع مثل إرجاع بضاعة للمحل:\n- تُعيد المنتج = تُعيد الطلب\n- يُعيدون لك الفلوس = يخرج المبلغ من الصندوق\n- تأخذ إيصال = سجل المرتجع",
        en: "Refund is like returning goods to a store:\n- You return product = you return order\n- They give back money = amount leaves drawer\n- You get receipt = refund record",
      },
      mistakes: {
        ar: "❌ مرتجع بدون سبب = مشكلة رقابية\n❌ مرتجع على وردية مغلقة = يحتاج تصحيح\n❌ مرتجع أكبر من قيمة الطلب = مستحيل",
        en: "❌ Refund without reason = audit issue\n❌ Refund on closed shift = needs correction\n❌ Refund larger than order = impossible",
      },
    },
    payment: {
      analogy: {
        ar: "طرق الدفع مثل مداخل المبنى:\n- النقد = الباب الرئيسي (الأكثر استخداماً)\n- البطاقة = المصعد (أسرع)\n- التقسيم = استخدام أكثر من مدخل",
        en: "Payment methods are like building entrances:\n- Cash = main door (most used)\n- Card = elevator (faster)\n- Split = using multiple entrances",
      },
    },
    discount: {
      analogy: {
        ar: "الخصم مثل الكوبون:\n- نسبة = خصم 10% على الفاتورة\n- مبلغ ثابت = كوبون 5 دينار\n- كلاهما يُنقص من المجموع",
        en: "Discount is like a coupon:\n- Percentage = 10% off the bill\n- Fixed amount = 5 JOD coupon\n- Both reduce the total",
      },
      numbers: {
        ar: "الفاتورة: 100 دينار\n\nخصم 10%:\n100 × 0.10 = 10 دينار خصم\nالمجموع: 90 دينار\n\nخصم 15 دينار:\n100 - 15 = 85 دينار",
        en: "Bill: 100 JOD\n\n10% discount:\n100 × 0.10 = 10 JOD off\nTotal: 90 JOD\n\n15 JOD off:\n100 - 15 = 85 JOD",
      },
    },
  };

  return styledContent[topicId]?.[style]?.[language] || null;
}

/**
 * Get appropriate clarification response
 * Uses style variation to avoid repetition
 */
export function getClarificationResponse(
  topicId: string,
  baseContent: string,
  language: "ar" | "en"
): string {
  // Get next style for this topic
  const nextStyle = getNextStyle(topicId);
  
  // Record that we're using this style
  recordStyleUsage(topicId, nextStyle);
  
  // Get styled explanation
  const styledResponse = getStyledExplanation(baseContent, nextStyle, topicId, language);
  
  return styledResponse;
}

/**
 * Check if we should use style variation for a topic
 * Returns true if user has already seen the base explanation
 */
export function shouldUseStyleVariation(topicId: string): boolean {
  const history = styleHistoryMap[topicId];
  return history !== undefined && history.usedStyles.length > 0;
}
