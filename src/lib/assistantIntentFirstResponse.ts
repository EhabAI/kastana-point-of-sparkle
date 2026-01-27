// Kastana POS Assistant - Intent-First Response System
// CRITICAL: Answer the EXACT question asked, no over-contextualization
// SMART ROUTING: Guide to Trainer for deeper learning when appropriate

import { disambiguateArabicRecipe, isProceduralQuestion } from "./assistantIntentResolver";

export interface StandardResponse {
  definition: string;      // 1-2 sentences, simple language
  whyItMatters?: string;   // Business/operational value
  wherToFind?: string;     // Menu path in system
  whatYouCanDo?: string;   // Actions/outcomes
  trainerModule?: string;  // For smart routing to Trainer
}

/**
 * Detect if a message is an explanation/question that requires direct answer
 */
export function isExplanationQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const explanationPatterns = [
    // Arabic patterns
    "اشرح", "شرح", "ما هو", "ما هي", "ايش", "وش", "شو", "كيف", 
    "ليش", "لماذا", "سبب", "يعني", "ما معنى", "عن",
    // English patterns
    "explain", "what is", "what are", "how does", "how do", "why", 
    "what does", "meaning", "define", "about",
  ];
  
  return explanationPatterns.some(p => lowerMessage.includes(p));
}

/**
 * Check if this is a procedural question (كيف أضيف، كيف أرفع)
 * These should get DIRECT answers without welcome/overview
 */
export function isProcedural(message: string): boolean {
  return isProceduralQuestion(message);
}

/**
 * ARABIC RECIPE DISAMBIGUATION
 * "وصفة" / "وصفه" / "مكونات" = Recipe (Menu Item Ingredients)
 * "وصف" (without ة) = Item Description
 */
export function resolveArabicRecipeIntent(message: string): "recipes" | "item_description" | null {
  const result = disambiguateArabicRecipe(message);
  if (result === "recipe") return "recipes";
  if (result === "description") return "item_description";
  return null;
}

/**
 * Detect if message is asking about a specific term/concept
 */
export function extractConcept(message: string, language: "ar" | "en"): string | null {
  // Common concept extraction patterns
  const patterns = language === "ar" 
    ? [
        /(?:اشرح(?:لي)?|عن|ما هو|ايش|وش|شو يعني)\s+(.+)/,
        /(.+?)\s+(?:يعني ايش|ما معناه|كيف يعمل)/,
      ]
    : [
        /(?:explain|what is|what are|about)\s+(.+)/i,
        /(?:how does|what does)\s+(.+)\s+(?:work|mean)/i,
      ];
  
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Format response using the STANDARD ANSWER STRUCTURE:
 * 1) Clear definition
 * 2) Why it matters
 * 3) Where to find it
 * 4) What user can do
 */
export function formatStandardResponse(
  response: StandardResponse,
  language: "ar" | "en"
): string {
  const parts: string[] = [];
  
  // 1) Definition (always first and required)
  parts.push(response.definition);
  
  // 2) Why it matters
  if (response.whyItMatters) {
    parts.push(response.whyItMatters);
  }
  
  // 3) Where to find it
  if (response.wherToFind) {
    const locationPrefix = language === "ar" ? "📍" : "📍";
    parts.push(`${locationPrefix} ${response.wherToFind}`);
  }
  
  // 4) What you can do
  if (response.whatYouCanDo) {
    const actionPrefix = language === "ar" ? "✅" : "✅";
    parts.push(`${actionPrefix} ${response.whatYouCanDo}`);
  }
  
  return parts.join("\n\n");
}

/**
 * TOPIC DEFINITIONS - Direct, standard-format definitions for key topics
 */
export const TOPIC_DEFINITIONS: Record<string, { 
  ar: StandardResponse; 
  en: StandardResponse;
}> = {
  // === INVENTORY ===
  inventory_log: {
    ar: {
      definition: "سجل الجرد هو سجل يعرض جميع حركات المخزون التي تمت على الأصناف مثل الإدخال، الخصم، والتسوية.",
      whyItMatters: "يساعدك على تتبع أي تغيير في الكميات ومعرفة سببه.",
      wherToFind: "المخزون → سجل الجرد",
      whatYouCanDo: "مراجعة الحركات وربطها بتقارير نهاية اليوم."
    },
    en: {
      definition: "Inventory Log is a record showing all inventory movements on items such as additions, deductions, and adjustments.",
      whyItMatters: "Helps you track any quantity changes and understand their causes.",
      wherToFind: "Inventory → Inventory Log",
      whatYouCanDo: "Review transactions and link them to end-of-day reports."
    }
  },
  
  stock_adjustment: {
    ar: {
      definition: "تسوية المخزون هي عملية تصحيح الفرق بين الكمية الفعلية والكمية المسجلة في النظام.",
      whyItMatters: "تضمن دقة البيانات وتسجيل الفروقات بشكل رسمي.",
      wherToFind: "المخزون → تسوية",
      whatYouCanDo: "إضافة أو خصم كميات مع تحديد السبب."
    },
    en: {
      definition: "Stock Adjustment is the process of correcting the difference between actual quantity and system-recorded quantity.",
      whyItMatters: "Ensures data accuracy and formally records discrepancies.",
      wherToFind: "Inventory → Adjustment",
      whatYouCanDo: "Add or deduct quantities with a specified reason."
    }
  },
  
  recipes: {
    ar: {
      definition: "الوصفات تربط أصناف القائمة بمواد المخزون وتحدد الكمية المستخدمة من كل مادة.",
      whyItMatters: "أساسية للخصم التلقائي من المخزون عند البيع وحساب التكلفة.",
      wherToFind: "القائمة → الصنف → الوصفة",
      whatYouCanDo: "إضافة المكونات وكمياتها لكل صنف.",
      trainerModule: "recipes"
    },
    en: {
      definition: "Recipes link menu items to inventory materials and specify the quantity used from each.",
      whyItMatters: "Essential for auto-deduction from inventory on sale and cost calculation.",
      wherToFind: "Menu → Item → Recipe",
      whatYouCanDo: "Add ingredients and their quantities for each item.",
      trainerModule: "recipes"
    }
  },
  
  // === ITEM DESCRIPTION (NOT Recipe) ===
  item_description: {
    ar: {
      definition: "وصف الصنف هو نص توضيحي يظهر للعميل ويصف مكونات أو طريقة تحضير الطبق.",
      whyItMatters: "يساعد العملاء على اختيار الأصناف المناسبة.",
      wherToFind: "القائمة → الصنف → تعديل → حقل الوصف",
      whatYouCanDo: "إضافة أو تعديل وصف الصنف من إعدادات القائمة."
    },
    en: {
      definition: "Item Description is explanatory text shown to customers describing the dish's contents or preparation.",
      whyItMatters: "Helps customers choose suitable items.",
      wherToFind: "Menu → Item → Edit → Description field",
      whatYouCanDo: "Add or edit item description from menu settings."
    }
  },
  
  // === REPORTS ===
  z_report: {
    ar: {
      definition: "تقرير Z هو ملخص مالي شامل للوردية يتضمن المبيعات والمدفوعات والمرتجعات.",
      whyItMatters: "يُستخدم لمطابقة الصندوق وتوثيق أداء الوردية.",
      wherToFind: "يُنشأ تلقائياً عند إغلاق الوردية",
      whatYouCanDo: "مراجعة الأرقام وطباعة التقرير للتوثيق."
    },
    en: {
      definition: "Z Report is a comprehensive financial summary of the shift including sales, payments, and refunds.",
      whyItMatters: "Used for drawer reconciliation and documenting shift performance.",
      wherToFind: "Generated automatically when closing shift",
      whatYouCanDo: "Review numbers and print report for documentation."
    }
  },
  
  // === SHIFTS ===
  shift: {
    ar: {
      definition: "الوردية هي فترة عمل الكاشير تبدأ بفتح الصندوق وتنتهي بإغلاقه.",
      whyItMatters: "جميع العمليات المالية تُسجل ضمن الوردية للمحاسبة والتتبع.",
      wherToFind: "POS → زر الوردية (أعلى الشاشة)",
      whatYouCanDo: "فتح وردية، تسجيل إيداع/سحب، إغلاق الوردية."
    },
    en: {
      definition: "A Shift is the cashier's work period that starts with opening the drawer and ends with closing it.",
      whyItMatters: "All financial operations are recorded within the shift for accounting and tracking.",
      wherToFind: "POS → Shift button (top of screen)",
      whatYouCanDo: "Open shift, record cash in/out, close shift."
    }
  },
  
  // === ORDER OPERATIONS ===
  refund: {
    ar: {
      definition: "المرتجع هو استرداد المبلغ للعميل بعد إتمام الدفع.",
      whyItMatters: "يُخصم من المبيعات ويظهر منفصلاً في التقارير للشفافية.",
      wherToFind: "POS → الطلبات الأخيرة → مرتجع",
      whatYouCanDo: "تحديد سبب الإرجاع وتأكيد المبلغ."
    },
    en: {
      definition: "A Refund is returning money to the customer after payment completion.",
      whyItMatters: "Deducted from sales and shown separately in reports for transparency.",
      wherToFind: "POS → Recent Orders → Refund",
      whatYouCanDo: "Specify return reason and confirm amount."
    }
  },
  
  void_order: {
    ar: {
      definition: "إلغاء الطلب هو حذف طلب لم يُدفع بعد بشكل كامل.",
      whyItMatters: "لا يؤثر على التقارير المالية لأن الطلب لم يُغلق.",
      wherToFind: "POS → الطلب الحالي → إلغاء",
      whatYouCanDo: "تحديد سبب الإلغاء والتأكيد."
    },
    en: {
      definition: "Void Order is completely deleting an order that hasn't been paid yet.",
      whyItMatters: "Does not affect financial reports because order wasn't closed.",
      wherToFind: "POS → Current Order → Cancel/Void",
      whatYouCanDo: "Specify cancellation reason and confirm."
    }
  },
  
  hold_order: {
    ar: {
      definition: "تعليق الطلب هو إيقافه مؤقتاً للعودة إليه لاحقاً.",
      whyItMatters: "يتيح خدمة عميل آخر دون فقدان الطلب الحالي.",
      wherToFind: "POS → زر Hold",
      whatYouCanDo: "تعليق الطلب واستئنافه من قائمة الطلبات المعلقة."
    },
    en: {
      definition: "Hold Order is temporarily pausing an order to return to it later.",
      whyItMatters: "Allows serving another customer without losing the current order.",
      wherToFind: "POS → Hold button",
      whatYouCanDo: "Hold order and resume it from held orders list."
    }
  },
  
  merge_orders: {
    ar: {
      definition: "دمج الطلبات هو جمع طلبين مفتوحين على طاولات مختلفة في طلب واحد.",
      whyItMatters: "يُسهّل الدفع عندما تجلس مجموعة على أكثر من طاولة.",
      wherToFind: "الطاولات → اختر طلب → دمج",
      whatYouCanDo: "اختيار الطلب الهدف وتأكيد الدمج."
    },
    en: {
      definition: "Merge Orders is combining two open orders on different tables into one order.",
      whyItMatters: "Simplifies payment when a group sits at multiple tables.",
      wherToFind: "Tables → Select order → Merge",
      whatYouCanDo: "Choose target order and confirm merge."
    }
  },
  
  // === QR & KDS ===
  qr_pending: {
    ar: {
      definition: "طلبات QR المعلقة هي الطلبات التي أرسلها العملاء عبر رمز QR وتنتظر موافقة الكاشير.",
      whyItMatters: "تتطلب مراجعة سريعة لتأكيد توفر الأصناف وقبول الطلب.",
      wherToFind: "POS → تبويب طلبات QR",
      whatYouCanDo: "قبول أو رفض الطلب مع إمكانية التعديل."
    },
    en: {
      definition: "QR Pending Orders are orders sent by customers via QR code awaiting cashier approval.",
      whyItMatters: "Requires quick review to confirm item availability and accept the order.",
      wherToFind: "POS → QR Orders tab",
      whatYouCanDo: "Accept or reject order with ability to modify."
    }
  },
  
  kds_status: {
    ar: {
      definition: "حالات KDS تُظهر مرحلة تحضير الطلب: NEW (جديد)، IN PROGRESS (قيد التحضير)، READY (جاهز).",
      whyItMatters: "تنظم سير العمل في المطبخ وتتبع وقت التحضير.",
      wherToFind: "شاشة المطبخ KDS",
      whatYouCanDo: "تغيير الحالة بالنقر على البطاقة أو الزر."
    },
    en: {
      definition: "KDS Status shows order preparation stage: NEW, IN PROGRESS, READY.",
      whyItMatters: "Organizes kitchen workflow and tracks preparation time.",
      wherToFind: "Kitchen Display Screen (KDS)",
      whatYouCanDo: "Change status by clicking the card or button."
    }
  },
  
  // === COMMON TERMS ===
  gross_net: {
    ar: {
      definition: "Gross هو المبلغ قبل الخصومات. Net هو المبلغ بعد الخصومات والمرتجعات.",
      whyItMatters: "Net هو الرقم الفعلي الذي يدخل الصندوق.",
      wherToFind: "التقارير → تقرير Z",
      whatYouCanDo: "مقارنة Gross و Net لفهم تأثير الخصومات."
    },
    en: {
      definition: "Gross is amount before discounts. Net is amount after discounts and refunds.",
      whyItMatters: "Net is the actual amount that goes into the drawer.",
      wherToFind: "Reports → Z Report",
      whatYouCanDo: "Compare Gross and Net to understand discount impact."
    }
  },
  
  variance: {
    ar: {
      definition: "الفرق (Variance) هو الاختلاف بين الكمية المتوقعة والكمية الفعلية في المخزون.",
      whyItMatters: "يكشف الهدر أو السرقة أو أخطاء الإدخال.",
      wherToFind: "المخزون → تحليل الفروقات",
      whatYouCanDo: "تصنيف سبب الفرق (هدر، خطأ، سرقة)."
    },
    en: {
      definition: "Variance is the difference between expected quantity and actual quantity in inventory.",
      whyItMatters: "Reveals waste, theft, or data entry errors.",
      wherToFind: "Inventory → Variance Analysis",
      whatYouCanDo: "Categorize variance reason (waste, error, theft)."
    }
  },
  
  cogs: {
    ar: {
      definition: "تكلفة البضاعة المباعة (COGS) هي تكلفة المواد المستخدمة في تحضير الأصناف المباعة.",
      whyItMatters: "تُستخدم لحساب هامش الربح الفعلي.",
      wherToFind: "التقارير → تقرير التكاليف",
      whatYouCanDo: "مقارنة COGS بالإيرادات لتقييم الربحية."
    },
    en: {
      definition: "COGS (Cost of Goods Sold) is the cost of materials used in preparing sold items.",
      whyItMatters: "Used to calculate actual profit margin.",
      wherToFind: "Reports → Costing Report",
      whatYouCanDo: "Compare COGS to revenue to evaluate profitability."
    }
  },
  
  // === SMART DASHBOARD INSIGHTS ===
  what_changed_yesterday: {
    ar: {
      definition: "بطاقة تعرض ملخصاً سريعاً للتغييرات التشغيلية المهمة بين اليوم والأمس.",
      whyItMatters: "تساعدك على التأكد من استقرار العمليات دون الحاجة لمراجعة التقارير.",
      wherToFind: "لوحة التحكم الرئيسية",
      whatYouCanDo: "عدم وجود تغييرات يعني استقرار العمليات - هذا أمر إيجابي."
    },
    en: {
      definition: "A card showing a quick summary of important operational changes between today and yesterday.",
      whyItMatters: "Helps you confirm operational stability without reviewing reports.",
      wherToFind: "Main Dashboard",
      whatYouCanDo: "No changes means stable operations - this is positive."
    }
  },
  
  system_confidence_score: {
    ar: {
      definition: "مؤشر يعكس مستوى الاستقرار التشغيلي الإجمالي بناءً على أنماط النشاط الأخيرة.",
      whyItMatters: "يمنحك نظرة سريعة على صحة النظام دون قراءة تقارير مفصلة.",
      wherToFind: "لوحة التحكم الرئيسية",
      whatYouCanDo: "الدرجة الأعلى تعني استقرار أكبر، وتتغير تدريجياً مع الوقت."
    },
    en: {
      definition: "A metric reflecting overall operational stability based on recent activity patterns.",
      whyItMatters: "Gives you a quick view of system health without reading detailed reports.",
      wherToFind: "Main Dashboard",
      whatYouCanDo: "Higher score means more stability, changes gradually over time."
    }
  },
  
  operational_notes: {
    ar: {
      definition: "ملاحظات هادئة حول أنماط تشغيلية متكررة أو غير معتادة.",
      whyItMatters: "تساعدك على ملاحظة الاتجاهات بهدوء دون مقاطعة سير العمل.",
      wherToFind: "لوحة التحكم الرئيسية وملخص نهاية اليوم",
      whatYouCanDo: "لا تتطلب إجراء فوري - مجرد معلومات للاطلاع."
    },
    en: {
      definition: "Calm observations about repeated or unusual operational patterns.",
      whyItMatters: "Helps you notice trends quietly without interrupting workflow.",
      wherToFind: "Main Dashboard and End-of-Day Summary",
      whatYouCanDo: "No immediate action required - just informational awareness."
    }
  },
  
  rush_hour_awareness: {
    ar: {
      definition: "ملاحظة تشغيلية تظهر عندما يكون حجم النشاط أعلى من النمط المعتاد للمطعم.",
      whyItMatters: "تبقيك على دراية بالضغط التشغيلي قبل أن يتحول إلى تأخيرات.",
      wherToFind: "لوحة التحكم الرئيسية",
      whatYouCanDo: "هذه ملاحظة إعلامية - تختفي تلقائياً عند انخفاض الضغط."
    },
    en: {
      definition: "An operational note that appears when activity level is higher than the restaurant's usual pattern.",
      whyItMatters: "Keeps you aware of operational pressure before it turns into delays.",
      wherToFind: "Main Dashboard",
      whatYouCanDo: "This is informational - auto-dismisses when pressure decreases."
    }
  },
  
  inventory_risk: {
    ar: {
      definition: "بطاقة تُبرز الأصناف التي قد تحتاج مراجعة في الإعداد، مثل المنتجات بدون وصفات.",
      whyItMatters: "تدعم دقة المخزون على المدى الطويل.",
      wherToFind: "لوحة التحكم الرئيسية",
      whatYouCanDo: "معلومات لتحسين الإعداد - لا تمنع العمليات ولا تتطلب إجراء فوري."
    },
    en: {
      definition: "A card highlighting items that may need setup review, such as products without recipes.",
      whyItMatters: "Supports long-term inventory accuracy improvement.",
      wherToFind: "Main Dashboard",
      whatYouCanDo: "Informational for setup improvement - does not block operations or require immediate action."
    }
  }
};

/**
 * KEYWORD TO TOPIC MAPPING - Maps various keywords to their topic definition
 */
export const KEYWORD_TO_TOPIC: Record<string, string> = {
  // Inventory Log
  "سجل الجرد": "inventory_log",
  "سجل المخزون": "inventory_log",
  "حركات المخزون": "inventory_log",
  "inventory log": "inventory_log",
  "inventory transactions": "inventory_log",
  "stock log": "inventory_log",
  
  // Stock Adjustment
  "تسوية": "stock_adjustment",
  "تسوية مخزون": "stock_adjustment",
  "تعديل مخزون": "stock_adjustment",
  "adjustment": "stock_adjustment",
  "stock adjustment": "stock_adjustment",
  
  // Recipes (Menu Item Ingredients) - use disambiguateArabicRecipe for وصفة vs وصف
  "وصفة": "recipes",
  "وصفه": "recipes", // colloquial spelling
  "وصفات": "recipes",
  "مكونات": "recipes",
  "خلطة": "recipes", // colloquial: mix/blend
  "خلطات": "recipes",
  "recipe": "recipes",
  "recipes": "recipes",
  "ingredients": "recipes",
  
  // Item Description (NOT Recipe) - وصف without ة
  "وصف الصنف": "item_description",
  "وصف المنتج": "item_description",
  "اضافة وصف": "item_description",
  "تعديل وصف": "item_description",
  "item description": "item_description",
  "product description": "item_description",
  
  // Z Report
  "تقرير z": "z_report",
  "z report": "z_report",
  "zreport": "z_report",
  "z-report": "z_report",
  "تقرير زد": "z_report",
  
  // Shift
  "وردية": "shift",
  "shift": "shift",
  "الورديات": "shift",
  "shifts": "shift",
  
  // Refund
  "مرتجع": "refund",
  "استرداد": "refund",
  "refund": "refund",
  "return": "refund",
  
  // Void
  "إلغاء طلب": "void_order",
  "void": "void_order",
  "void order": "void_order",
  "الغاء": "void_order",
  
  // Hold
  "تعليق": "hold_order",
  "hold": "hold_order",
  "hold order": "hold_order",
  "طلب معلق": "hold_order",
  
  // Merge
  "دمج": "merge_orders",
  "merge": "merge_orders",
  "merge orders": "merge_orders",
  "دمج الطلبات": "merge_orders",
  
  // QR
  "qr": "qr_pending",
  "qr order": "qr_pending",
  "qr pending": "qr_pending",
  "طلبات qr": "qr_pending",
  
  // KDS
  "kds": "kds_status",
  "kitchen": "kds_status",
  "مطبخ": "kds_status",
  "شاشة المطبخ": "kds_status",
  
  // Gross/Net
  "gross": "gross_net",
  "net": "gross_net",
  "صافي": "gross_net",
  "إجمالي": "gross_net",
  
  // Variance
  "فرق": "variance",
  "فروقات": "variance",
  "variance": "variance",
  
  // COGS
  "cogs": "cogs",
  "تكلفة": "cogs",
  "cost": "cogs",
  
  // Smart Dashboard Insights
  "ما الذي تغير": "what_changed_yesterday",
  "تغيرات": "what_changed_yesterday",
  "أمس": "what_changed_yesterday",
  "what changed": "what_changed_yesterday",
  "yesterday": "what_changed_yesterday",
  "changes": "what_changed_yesterday",
  
  "درجة الثقة": "system_confidence_score",
  "مؤشر الاستقرار": "system_confidence_score",
  "ثقة النظام": "system_confidence_score",
  "confidence score": "system_confidence_score",
  "stability score": "system_confidence_score",
  "system health": "system_confidence_score",
  
  "ملاحظات تشغيلية": "operational_notes",
  "ملاحظة تشغيلية": "operational_notes",
  "operational notes": "operational_notes",
  "operational note": "operational_notes",
  
  "ضغط تشغيلي": "rush_hour_awareness",
  "rush hour": "rush_hour_awareness",
  "high load": "rush_hour_awareness",
  "وتيرة عالية": "rush_hour_awareness",
  
  "مخاطر المخزون": "inventory_risk",
  "inventory risk": "inventory_risk",
  "بدون وصفة": "inventory_risk",
  "without recipe": "inventory_risk",
};

/**
 * Try to find a direct topic match from user message
 */
export function findDirectTopicMatch(
  message: string,
  language: "ar" | "en"
): { topicId: string; response: StandardResponse } | null {
  const lowerMessage = message.toLowerCase();
  
  // Check all keywords
  for (const [keyword, topicId] of Object.entries(KEYWORD_TO_TOPIC)) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      const topicDef = TOPIC_DEFINITIONS[topicId];
      if (topicDef) {
        return {
          topicId,
          response: topicDef[language]
        };
      }
    }
  }
  
  return null;
}

/**
 * Get formatted direct answer for a topic
 */
export function getDirectAnswer(
  message: string,
  language: "ar" | "en"
): string | null {
  const match = findDirectTopicMatch(message, language);
  
  if (match) {
    return formatStandardResponse(match.response, language);
  }
  
  return null;
}

/**
 * Check if response should skip screen context (intent-first rule)
 */
export function shouldSkipScreenContext(message: string): boolean {
  // If it's an explanation question about a specific topic, skip screen context
  return isExplanationQuestion(message);
}
