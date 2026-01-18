// Kastana POS Assistant - UI-First Intent Resolver
// Maps user messages to visible UI elements before AI classification

import type { ScreenContext } from "@/lib/smartAssistantContext";

export interface UIElementMatch {
  elementId: string;
  elementName: {
    ar: string;
    en: string;
  };
  description: {
    ar: string;
    en: string;
  };
  confidence: number;
}

// UI element mappings per screen
// Key: screenContext, Value: array of UI elements with their phrases
const SCREEN_UI_ELEMENTS: Record<string, Array<{
  id: string;
  phrases: { ar: string[]; en: string[] };
  name: { ar: string; en: string };
  description: { ar: string; en: string };
}>> = {
  owner_dashboard: [
    {
      id: "today_summary",
      phrases: {
        ar: ["ملخص اليوم", "اليوم", "ملخص", "الحالة التشغيلية", "الحالة"],
        en: ["today's summary", "today summary", "today", "operational status", "status"]
      },
      name: { ar: "ملخص اليوم", en: "Today's Summary" },
      description: {
        ar: "هذا القسم يعرض الحالة التشغيلية الحالية للمطعم:\n• حالة المطعم (مفتوح/مغلق) حسب ساعات العمل\n• إجمالي المبيعات اليوم\n• عدد الطلبات المكتملة\n• الورديات المفتوحة ومدتها\n• عدد الطاولات والموظفين\n• درجة التشغيل",
        en: "This section shows the current operational status:\n• Restaurant status (open/closed) based on business hours\n• Total sales today\n• Number of completed orders\n• Open shifts and their duration\n• Table and staff counts\n• Operational score"
      }
    },
    {
      id: "sales",
      phrases: {
        ar: ["المبيعات", "مبيعات", "إجمالي المبيعات", "مبيعات اليوم"],
        en: ["sales", "total sales", "today sales", "revenue"]
      },
      name: { ar: "المبيعات", en: "Sales" },
      description: {
        ar: "يعرض إجمالي المبيعات المحصلة اليوم من الطلبات المدفوعة فقط.\nإذا ظهر باللون البرتقالي، يعني وجود ورديات مفتوحة بدون مبيعات.",
        en: "Shows total sales collected today from paid orders only.\nIf shown in orange, it means there are open shifts with zero sales."
      }
    },
    {
      id: "orders",
      phrases: {
        ar: ["الطلبات", "طلبات", "عدد الطلبات", "طلبات اليوم"],
        en: ["orders", "order count", "today orders", "total orders"]
      },
      name: { ar: "الطلبات", en: "Orders" },
      description: {
        ar: "عدد الطلبات المدفوعة اليوم.\nلا يشمل الطلبات الملغاة أو المعلقة.",
        en: "Number of paid orders today.\nDoes not include cancelled or pending orders."
      }
    },
    {
      id: "shifts",
      phrases: {
        ar: ["الورديات", "ورديات", "الوردية", "ورديات مفتوحة"],
        en: ["shifts", "open shifts", "shift", "active shifts"]
      },
      name: { ar: "الورديات", en: "Shifts" },
      description: {
        ar: "عدد الورديات المفتوحة حالياً ومدة أقدم وردية.\nإذا ظهر باللون البرتقالي، يعني وجود وردية مفتوحة لأكثر من 10 ساعات.",
        en: "Number of currently open shifts and duration of the oldest one.\nIf shown in orange, a shift has been open for more than 10 hours."
      }
    },
    {
      id: "tables",
      phrases: {
        ar: ["الطاولات", "طاولات", "عدد الطاولات"],
        en: ["tables", "table count", "total tables"]
      },
      name: { ar: "الطاولات", en: "Tables" },
      description: {
        ar: "إجمالي عدد الطاولات المعرّفة في النظام.",
        en: "Total number of tables configured in the system."
      }
    },
    {
      id: "staff",
      phrases: {
        ar: ["الموظفين", "موظفين", "عدد الموظفين", "فريق العمل"],
        en: ["staff", "staff count", "employees", "team"]
      },
      name: { ar: "الموظفين", en: "Staff" },
      description: {
        ar: "إجمالي عدد الموظفين النشطين (كاشير، مطبخ).",
        en: "Total number of active staff members (cashiers, kitchen)."
      }
    },
    {
      id: "operational_score",
      phrases: {
        ar: ["درجة التشغيل", "التشغيل", "النقاط", "الدرجة", "مؤشر الأداء"],
        en: ["operational score", "score", "performance", "rating", "health score"]
      },
      name: { ar: "درجة التشغيل", en: "Operational Score" },
      description: {
        ar: "مؤشر يقيس كفاءة التشغيل من 0-100:\n• ممتاز (80+): تشغيل سلس\n• جيد (60-79): أداء مقبول مع بعض الملاحظات\n• يحتاج انتباه (<60): يوجد مشاكل تحتاج مراجعة\n\nيتأثر بـ: الإلغاءات، الـ void، الاستردادات، الورديات الطويلة.",
        en: "Metric measuring operational efficiency from 0-100:\n• Excellent (80+): Smooth operations\n• Good (60-79): Acceptable with some notes\n• Needs Attention (<60): Issues that need review\n\nAffected by: cancellations, voids, refunds, long shifts."
      }
    },
    {
      id: "inventory_risk",
      phrases: {
        ar: ["مخاطر المخزون", "المخزون", "تنبيهات المخزون", "مخاطر"],
        en: ["inventory risks", "inventory", "inventory alerts", "stock alerts", "low stock"]
      },
      name: { ar: "مخاطر المخزون", en: "Inventory Risks" },
      description: {
        ar: "يعرض المواد التي وصلت للحد الأدنى أو تحتاج إعادة طلب.\nيظهر فقط إذا كان نظام المخزون مفعّل.",
        en: "Shows items that reached minimum level or need reordering.\nOnly appears if inventory module is enabled."
      }
    },
    {
      id: "today_income",
      phrases: {
        ar: ["دخل اليوم", "الدخل", "الإيرادات", "أرباح اليوم"],
        en: ["today income", "income", "earnings", "today earnings"]
      },
      name: { ar: "دخل اليوم", en: "Today's Income" },
      description: {
        ar: "يعرض تفاصيل الدخل اليومي مقسم حسب طرق الدفع.",
        en: "Shows daily income details broken down by payment methods."
      }
    },
    {
      id: "cash_differences",
      phrases: {
        ar: ["فروقات الكاش", "فروقات", "الفرق", "فرق الكاش"],
        en: ["cash differences", "cash variance", "difference", "cash gap"]
      },
      name: { ar: "فروقات الكاش", en: "Cash Differences" },
      description: {
        ar: "يعرض الفرق بين المبلغ المتوقع والفعلي في الصندوق.\nالفرق الموجب = زيادة، السالب = نقص.",
        en: "Shows difference between expected and actual cash in drawer.\nPositive = excess, Negative = shortage."
      }
    },
    {
      id: "kitchen_done_orders",
      phrases: {
        ar: ["طلبات المطبخ", "المطبخ", "الطلبات الجاهزة"],
        en: ["kitchen orders", "kitchen", "ready orders", "prepared orders"]
      },
      name: { ar: "طلبات المطبخ الجاهزة", en: "Kitchen Done Orders" },
      description: {
        ar: "يعرض الطلبات التي أكمل المطبخ تحضيرها اليوم.\nيظهر فقط إذا كان نظام شاشة المطبخ (KDS) مفعّل.",
        en: "Shows orders the kitchen has completed preparing today.\nOnly appears if Kitchen Display System (KDS) is enabled."
      }
    },
    {
      id: "daily_summary",
      phrases: {
        ar: ["تقرير نهاية اليوم", "نهاية اليوم", "ملخص نهاية اليوم", "التقرير اليومي"],
        en: ["end of day summary", "daily summary", "eod summary", "daily report"]
      },
      name: { ar: "ملخص نهاية اليوم", en: "End of Day Summary" },
      description: {
        ar: "يعرض ملخص ذكي لنهاية اليوم يشمل:\n• إجمالي المبيعات والطلبات\n• أداء الورديات\n• ملاحظات تشغيلية\n• توصيات للتحسين",
        en: "Shows smart end-of-day summary including:\n• Total sales and orders\n• Shift performance\n• Operational notes\n• Improvement recommendations"
      }
    },
    {
      id: "quick_insights",
      phrases: {
        ar: ["رؤى سريعة", "رؤى", "تحليلات", "إحصائيات"],
        en: ["quick insights", "insights", "analytics", "statistics"]
      },
      name: { ar: "رؤى سريعة", en: "Quick Insights" },
      description: {
        ar: "بطاقات تعرض إحصائيات وتحليلات سريعة عن أداء المطعم.",
        en: "Cards showing quick statistics and analytics about restaurant performance."
      }
    }
  ],
  pos_main: [
    {
      id: "order_panel",
      phrases: {
        ar: ["الطلب", "سلة الطلب", "قائمة الطلب"],
        en: ["order", "order panel", "cart", "order list"]
      },
      name: { ar: "لوحة الطلب", en: "Order Panel" },
      description: {
        ar: "يعرض الأصناف المضافة للطلب الحالي.\nيمكنك تعديل الكمية أو حذف صنف أو إضافة ملاحظات.",
        en: "Shows items added to the current order.\nYou can modify quantity, remove items, or add notes."
      }
    },
    {
      id: "menu_items",
      phrases: {
        ar: ["القائمة", "الأصناف", "المنتجات", "المنيو"],
        en: ["menu", "items", "products", "menu items"]
      },
      name: { ar: "قائمة الأصناف", en: "Menu Items" },
      description: {
        ar: "يعرض جميع الأصناف المتاحة للبيع.\nاضغط على أي صنف لإضافته للطلب.",
        en: "Shows all available items for sale.\nClick any item to add it to the order."
      }
    },
    {
      id: "categories",
      phrases: {
        ar: ["التصنيفات", "الفئات", "أقسام القائمة"],
        en: ["categories", "sections", "menu sections"]
      },
      name: { ar: "التصنيفات", en: "Categories" },
      description: {
        ar: "يعرض تصنيفات القائمة للتنقل السريع بين الأصناف.",
        en: "Shows menu categories for quick navigation between items."
      }
    },
    {
      id: "pay_button",
      phrases: {
        ar: ["الدفع", "زر الدفع", "ادفع"],
        en: ["pay", "pay button", "payment", "checkout"]
      },
      name: { ar: "زر الدفع", en: "Pay Button" },
      description: {
        ar: "لإتمام الدفع وإغلاق الطلب.\nمعطل إذا: لا توجد وردية مفتوحة أو الطلب فارغ.",
        en: "To complete payment and close the order.\nDisabled if: no open shift or order is empty."
      }
    },
    {
      id: "hold_button",
      phrases: {
        ar: ["تعليق", "احتفاظ", "زر التعليق"],
        en: ["hold", "hold button", "pause order"]
      },
      name: { ar: "تعليق الطلب", en: "Hold Order" },
      description: {
        ar: "لحفظ الطلب مؤقتاً والعودة إليه لاحقاً.\nالطلب المعلق يظهر في قائمة الطلبات المفتوحة.",
        en: "To temporarily save the order and return to it later.\nHeld orders appear in the open orders list."
      }
    },
    {
      id: "discount_button",
      phrases: {
        ar: ["خصم", "تخفيض", "الخصم"],
        en: ["discount", "apply discount"]
      },
      name: { ar: "زر الخصم", en: "Discount Button" },
      description: {
        ar: "لتطبيق خصم على الطلب (نسبة أو مبلغ ثابت).\nيتطلب صلاحية الخصم من المالك.",
        en: "To apply a discount to the order (percentage or fixed amount).\nRequires discount permission from owner."
      }
    },
    {
      id: "shift_button",
      phrases: {
        ar: ["الوردية", "فتح وردية", "إغلاق وردية"],
        en: ["shift", "open shift", "close shift"]
      },
      name: { ar: "إدارة الوردية", en: "Shift Management" },
      description: {
        ar: "فتح أو إغلاق الوردية.\n• لا يمكن إنشاء طلبات بدون وردية مفتوحة\n• عند الإغلاق يظهر تقرير Z",
        en: "Open or close the shift.\n• Cannot create orders without an open shift\n• Z Report is shown when closing"
      }
    }
  ],
  pos_tables: [
    {
      id: "table_map",
      phrases: {
        ar: ["الطاولات", "خريطة الطاولات", "طاولة"],
        en: ["tables", "table map", "table"]
      },
      name: { ar: "خريطة الطاولات", en: "Table Map" },
      description: {
        ar: "تعرض جميع الطاولات المعرفة.\n• أخضر = متاحة\n• أحمر = مشغولة بطلب\n• اضغط على طاولة لفتح طلب عليها أو استئناف الطلب الحالي",
        en: "Shows all defined tables.\n• Green = available\n• Red = occupied with order\n• Click a table to open an order or resume current order"
      }
    }
  ],
  pos_open_orders: [
    {
      id: "open_orders_list",
      phrases: {
        ar: ["الطلبات المفتوحة", "طلبات مفتوحة", "الطلبات"],
        en: ["open orders", "orders list", "orders"]
      },
      name: { ar: "قائمة الطلبات المفتوحة", en: "Open Orders List" },
      description: {
        ar: "جميع الطلبات النشطة غير المدفوعة.\n• اضغط على طلب للعودة إليه\n• يعرض رقم الطلب، الإجمالي، ووقت الإنشاء",
        en: "All active unpaid orders.\n• Click an order to resume it\n• Shows order number, total, and creation time"
      }
    }
  ],
  pos_qr_pending: [
    {
      id: "qr_pending_list",
      phrases: {
        ar: ["طلبات QR", "طلبات معلقة", "QR"],
        en: ["qr orders", "pending orders", "qr"]
      },
      name: { ar: "طلبات QR المعلقة", en: "Pending QR Orders" },
      description: {
        ar: "طلبات من العملاء عبر رمز QR.\n• راجع التفاصيل ثم اقبل أو ارفض\n• القبول ينقل الطلب للمطبخ",
        en: "Orders from customers via QR code.\n• Review details then accept or reject\n• Accepting sends order to kitchen"
      }
    }
  ],
  kds: [
    {
      id: "order_cards",
      phrases: {
        ar: ["بطاقات الطلب", "الطلبات", "البطاقات"],
        en: ["order cards", "orders", "tickets"]
      },
      name: { ar: "بطاقات الطلبات", en: "Order Cards" },
      description: {
        ar: "كل بطاقة تمثل طلب واحد يحتاج تحضير.\nالألوان تدل على الوقت المنقضي:\n• أخضر: أقل من 5 دقائق\n• أصفر: 5-10 دقائق\n• أحمر: أكثر من 10 دقائق",
        en: "Each card represents an order that needs preparation.\nColors indicate elapsed time:\n• Green: less than 5 minutes\n• Yellow: 5-10 minutes\n• Red: more than 10 minutes"
      }
    },
    {
      id: "bump_button",
      phrases: {
        ar: ["جاهز", "انتهى", "done"],
        en: ["done", "bump", "complete"]
      },
      name: { ar: "زر جاهز", en: "Done Button" },
      description: {
        ar: "اضغط عند اكتمال تحضير الطلب.\nالطلب ينتقل لقائمة المكتملة.",
        en: "Press when order is ready.\nOrder moves to completed list."
      }
    }
  ],
  system_admin: [
    {
      id: "restaurants_list",
      phrases: {
        ar: ["المطاعم", "قائمة المطاعم", "إدارة المطاعم"],
        en: ["restaurants", "restaurant list", "manage restaurants"]
      },
      name: { ar: "قائمة المطاعم", en: "Restaurants List" },
      description: {
        ar: "يعرض جميع المطاعم المسجلة في النظام.\nيمكنك تفعيل/تعطيل المطعم أو تعديل بياناته.",
        en: "Shows all restaurants registered in the system.\nYou can activate/deactivate restaurants or edit their data."
      }
    },
    {
      id: "owners_list",
      phrases: {
        ar: ["الملاك", "أصحاب المطاعم", "المستخدمين"],
        en: ["owners", "restaurant owners", "users"]
      },
      name: { ar: "أصحاب المطاعم", en: "Restaurant Owners" },
      description: {
        ar: "يعرض قائمة أصحاب المطاعم.\nيمكنك إضافة مالك جديد أو إعادة تعيين كلمة المرور.",
        en: "Shows list of restaurant owners.\nYou can add new owners or reset passwords."
      }
    },
    {
      id: "add_restaurant",
      phrases: {
        ar: ["إضافة مطعم", "مطعم جديد"],
        en: ["add restaurant", "new restaurant"]
      },
      name: { ar: "إضافة مطعم جديد", en: "Add New Restaurant" },
      description: {
        ar: "لإضافة مطعم جديد للنظام.\nيتطلب اسم المطعم وبيانات المالك.",
        en: "To add a new restaurant to the system.\nRequires restaurant name and owner details."
      }
    }
  ],
  // owner_dashboard is already defined above with full UI elements
  owner_menu: [
    {
      id: "menu_items_list",
      phrases: {
        ar: ["الأصناف", "القائمة", "المنتجات"],
        en: ["items", "menu", "products"]
      },
      name: { ar: "قائمة الأصناف", en: "Menu Items" },
      description: {
        ar: "جميع الأصناف في القائمة.\n• يمكنك إضافة صنف جديد\n• تعديل السعر أو الوصف\n• تفعيل/تعطيل الصنف",
        en: "All items in the menu.\n• You can add a new item\n• Edit price or description\n• Enable/disable item"
      }
    }
  ],
  owner_reports: [
    {
      id: "reports_section",
      phrases: {
        ar: ["التقارير", "تقرير", "Z"],
        en: ["reports", "report", "Z"]
      },
      name: { ar: "التقارير", en: "Reports" },
      description: {
        ar: "تقارير متعددة:\n• تقرير المبيعات\n• تقرير المدفوعات\n• تقرير المرتجعات\n• تقرير Z (نهاية الوردية)",
        en: "Multiple reports:\n• Sales report\n• Payments report\n• Refunds report\n• Z Report (end of shift)"
      }
    }
  ],
  owner_inventory: [
    {
      id: "inventory_items",
      phrases: {
        ar: ["المخزون", "المواد", "البضاعة"],
        en: ["inventory", "items", "stock"]
      },
      name: { ar: "قائمة المخزون", en: "Inventory Items" },
      description: {
        ar: "المواد الخام والمكونات.\n• استلام بضاعة\n• تسجيل هدر\n• عمل جرد\n• نقل بين الفروع",
        en: "Raw materials and ingredients.\n• Receive goods\n• Record waste\n• Stock count\n• Transfer between branches"
      }
    }
  ],
  owner_staff: [
    {
      id: "staff_list",
      phrases: {
        ar: ["الموظفين", "الكاشير", "المطبخ"],
        en: ["staff", "cashiers", "kitchen"]
      },
      name: { ar: "قائمة الموظفين", en: "Staff List" },
      description: {
        ar: "جميع الموظفين (كاشير، مطبخ).\n• إضافة موظف جديد\n• إعادة تعيين كلمة المرور\n• تفعيل/تعطيل الموظف",
        en: "All staff (cashiers, kitchen).\n• Add new staff\n• Reset password\n• Enable/disable staff"
      }
    }
  ],
  owner_settings: [
    {
      id: "restaurant_settings",
      phrases: {
        ar: ["الإعدادات", "الضريبة", "ساعات العمل"],
        en: ["settings", "tax", "business hours"]
      },
      name: { ar: "إعدادات المطعم", en: "Restaurant Settings" },
      description: {
        ar: "إعدادات المطعم:\n• نسبة الضريبة\n• العملة\n• ساعات العمل\n• طرق الدفع\n• إعدادات الخصم",
        en: "Restaurant settings:\n• Tax rate\n• Currency\n• Business hours\n• Payment methods\n• Discount settings"
      }
    }
  ]
};

/**
 * Normalize Arabic text for matching
 */
function normalizeArabic(text: string): string {
  return text
    .replace(/[\u064B-\u065F]/g, '') // Remove diacritics
    .replace(/[أإآ]/g, 'ا') // Normalize alef variations
    .replace(/ى/g, 'ي') // Normalize ya
    .replace(/ة/g, 'ه') // Normalize ta marbuta
    .toLowerCase()
    .trim();
}

/**
 * Check if user message matches any UI element on the current screen
 * This has HIGHER PRIORITY than AI intent classification
 */
export function matchUIElement(
  message: string,
  screenContext: ScreenContext,
  language: "ar" | "en"
): UIElementMatch | null {
  const screenElements = SCREEN_UI_ELEMENTS[screenContext];
  
  if (!screenElements || screenElements.length === 0) {
    return null;
  }

  const normalizedMessage = language === "ar" 
    ? normalizeArabic(message) 
    : message.toLowerCase().trim();

  let bestMatch: UIElementMatch | null = null;
  let bestScore = 0;

  for (const element of screenElements) {
    const phrases = element.phrases[language];
    
    for (const phrase of phrases) {
      const normalizedPhrase = language === "ar" 
        ? normalizeArabic(phrase) 
        : phrase.toLowerCase();

      // Exact match - highest confidence
      if (normalizedMessage === normalizedPhrase) {
        return {
          elementId: element.id,
          elementName: element.name,
          description: element.description,
          confidence: 1.0
        };
      }

      // Message contains the phrase exactly
      if (normalizedMessage.includes(normalizedPhrase)) {
        const score = normalizedPhrase.length / normalizedMessage.length;
        if (score > bestScore && score > 0.3) {
          bestScore = score;
          bestMatch = {
            elementId: element.id,
            elementName: element.name,
            description: element.description,
            confidence: Math.min(0.95, 0.7 + score * 0.25)
          };
        }
      }

      // Phrase contains the message (user typed partial)
      if (normalizedPhrase.includes(normalizedMessage) && normalizedMessage.length >= 3) {
        const score = normalizedMessage.length / normalizedPhrase.length;
        if (score > bestScore && score > 0.5) {
          bestScore = score;
          bestMatch = {
            elementId: element.id,
            elementName: element.name,
            description: element.description,
            confidence: Math.min(0.9, 0.6 + score * 0.3)
          };
        }
      }
    }
  }

  // Only return if confidence is high enough
  return bestMatch && bestMatch.confidence >= 0.6 ? bestMatch : null;
}

/**
 * Format UI element explanation response
 */
export function formatUIElementResponse(
  match: UIElementMatch,
  language: "ar" | "en"
): string {
  const name = match.elementName[language];
  const description = match.description[language];
  
  if (language === "ar") {
    return `📍 **${name}**\n\n${description}`;
  }
  
  return `📍 **${name}**\n\n${description}`;
}

/**
 * Get all UI elements for a screen (for suggestions)
 */
export function getScreenUIElements(screenContext: ScreenContext): Array<{
  id: string;
  name: { ar: string; en: string };
}> {
  const elements = SCREEN_UI_ELEMENTS[screenContext];
  if (!elements) return [];
  
  return elements.map(e => ({
    id: e.id,
    name: e.name
  }));
}
