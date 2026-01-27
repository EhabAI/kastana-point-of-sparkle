// Kastana POS Assistant - Screen Lock & Production Rules
// MANDATORY RULES FOR PRODUCTION-READY ASSISTANT BEHAVIOR

import type { ScreenContext } from "@/lib/smartAssistantContext";

/**
 * Screen-specific boundaries - assistant MUST NOT explain features outside current screen
 */
export const SCREEN_BOUNDARIES: Record<ScreenContext, {
  allowedTopics: string[];
  forbiddenTopics: string[];
  mainFeature: { ar: string; en: string };
}> = {
  pos_main: {
    allowedTopics: ["orders", "payment", "items", "modifiers", "discount", "hold", "shift", "favorites"],
    forbiddenTopics: ["reports", "inventory", "staff", "menu_management", "settings", "branches"],
    mainFeature: { ar: "إنشاء الطلبات وإتمام الدفع", en: "Create orders and complete payments" }
  },
  pos_tables: {
    allowedTopics: ["tables", "merge", "transfer", "dine_in", "table_orders"],
    forbiddenTopics: ["reports", "inventory", "staff", "menu_management", "settings"],
    mainFeature: { ar: "إدارة الطاولات والطلبات المرتبطة", en: "Manage tables and associated orders" }
  },
  pos_open_orders: {
    allowedTopics: ["open_orders", "hold", "resume", "cancel", "void"],
    forbiddenTopics: ["reports", "inventory", "staff", "menu_management", "settings"],
    mainFeature: { ar: "عرض واستئناف الطلبات المفتوحة", en: "View and resume open orders" }
  },
  pos_qr_pending: {
    allowedTopics: ["qr_orders", "accept", "reject", "pending"],
    forbiddenTopics: ["reports", "inventory", "staff", "menu_management", "settings"],
    mainFeature: { ar: "معالجة طلبات QR الواردة", en: "Process incoming QR orders" }
  },
  owner_dashboard: {
    allowedTopics: ["overview", "sales", "orders", "shifts", "performance", "alerts", "income", "summary"],
    forbiddenTopics: ["pos_actions", "create_order", "payment_processing"],
    mainFeature: { ar: "نظرة عامة على أداء المطعم", en: "Overview of restaurant performance" }
  },
  owner_menu: {
    allowedTopics: ["menu_items", "categories", "prices", "modifiers", "combos", "availability"],
    forbiddenTopics: ["pos_actions", "shifts", "payments"],
    mainFeature: { ar: "إدارة قائمة الأصناف والأسعار", en: "Manage menu items and prices" }
  },
  owner_staff: {
    allowedTopics: ["staff", "cashiers", "kitchen_staff", "permissions", "passwords"],
    forbiddenTopics: ["pos_actions", "orders", "payments"],
    mainFeature: { ar: "إدارة الموظفين وصلاحياتهم", en: "Manage staff and permissions" }
  },
  owner_inventory: {
    allowedTopics: ["inventory", "stock", "recipes", "waste", "receiving", "stock_count", "variance"],
    forbiddenTopics: ["pos_actions", "payments", "orders"],
    mainFeature: { ar: "إدارة المخزون والوصفات", en: "Manage inventory and recipes" }
  },
  owner_reports: {
    allowedTopics: ["reports", "sales_report", "z_report", "analytics", "performance", "refunds_report"],
    forbiddenTopics: ["pos_actions", "create_order", "payment_processing"],
    mainFeature: { ar: "عرض التقارير والتحليلات", en: "View reports and analytics" }
  },
  owner_settings: {
    allowedTopics: ["settings", "tax", "currency", "business_hours", "discounts", "payment_methods"],
    forbiddenTopics: ["pos_actions", "orders"],
    mainFeature: { ar: "تعديل إعدادات المطعم", en: "Modify restaurant settings" }
  },
  kds: {
    allowedTopics: ["kitchen_orders", "order_status", "preparation", "done", "bump"],
    forbiddenTopics: ["payments", "refunds", "inventory", "reports", "settings"],
    mainFeature: { ar: "عرض وإدارة الطلبات للتحضير", en: "View and manage orders for preparation" }
  },
  system_admin: {
    allowedTopics: ["restaurants", "owners", "system_users", "activation"],
    forbiddenTopics: ["pos_actions", "individual_restaurant_settings"],
    mainFeature: { ar: "إدارة المطاعم والمستخدمين", en: "Manage restaurants and users" }
  },
  login: {
    allowedTopics: ["login", "authentication"],
    forbiddenTopics: ["all"],
    mainFeature: { ar: "تسجيل الدخول", en: "Login" }
  },
  unknown: {
    allowedTopics: [],
    forbiddenTopics: [],
    mainFeature: { ar: "Kastana POS", en: "Kastana POS" }
  }
};

/**
 * Role-based feature visibility - DO NOT mention disabled features
 */
export interface FeatureVisibility {
  inventoryEnabled: boolean;
  kdsEnabled: boolean;
  discountsEnabled: boolean;
  qrEnabled?: boolean;
}

/**
 * Check if a topic is allowed on the current screen
 */
export function isTopicAllowedOnScreen(
  topic: string,
  screenContext: ScreenContext
): boolean {
  const boundaries = SCREEN_BOUNDARIES[screenContext];
  if (!boundaries) return true;
  
  const topicLower = topic.toLowerCase();
  
  // Check if forbidden
  const isForbidden = boundaries.forbiddenTopics.some(f => 
    topicLower.includes(f) || f.includes(topicLower)
  );
  
  if (isForbidden) return false;
  
  // Check if allowed (if allowedTopics is empty, allow all non-forbidden)
  if (boundaries.allowedTopics.length === 0) return true;
  
  return boundaries.allowedTopics.some(a => 
    topicLower.includes(a) || a.includes(topicLower)
  );
}

/**
 * Get screen-locked response when user asks about different screen
 */
export function getScreenLockResponse(
  currentScreen: ScreenContext,
  language: "ar" | "en",
  displayName?: string
): string {
  const boundaries = SCREEN_BOUNDARIES[currentScreen];
  const mainFeature = boundaries?.mainFeature[language] || "";
  
  const greeting = displayName 
    ? (language === "ar" ? `${displayName}،` : `${displayName},`)
    : "";
  
  if (language === "ar") {
    return `${greeting} أنت حالياً في شاشة ${getScreenName(currentScreen, "ar")}.

${mainFeature}

💡 يمكنني مساعدتك فقط في الأمور المتعلقة بهذه الشاشة.
اضغط على أي عنصر في الشاشة لمعرفة المزيد عنه.`;
  }
  
  return `${greeting} You are currently on the ${getScreenName(currentScreen, "en")}.

${mainFeature}

💡 I can only help you with matters related to this screen.
Click any element on the screen to learn more about it.`;
}

/**
 * Get human-readable screen name
 */
export function getScreenName(
  screenContext: ScreenContext,
  language: "ar" | "en"
): string {
  const names: Record<ScreenContext, { ar: string; en: string }> = {
    pos_main: { ar: "إنشاء الطلبات", en: "Order Creation" },
    pos_tables: { ar: "إدارة الطاولات", en: "Table Management" },
    pos_open_orders: { ar: "الطلبات المفتوحة", en: "Open Orders" },
    pos_qr_pending: { ar: "طلبات QR", en: "QR Orders" },
    owner_dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
    owner_menu: { ar: "إدارة القائمة", en: "Menu Management" },
    owner_staff: { ar: "إدارة الموظفين", en: "Staff Management" },
    owner_inventory: { ar: "إدارة المخزون", en: "Inventory Management" },
    owner_reports: { ar: "التقارير", en: "Reports" },
    owner_settings: { ar: "الإعدادات", en: "Settings" },
    kds: { ar: "شاشة المطبخ", en: "Kitchen Display" },
    system_admin: { ar: "إدارة النظام", en: "System Administration" },
    login: { ar: "تسجيل الدخول", en: "Login" },
    unknown: { ar: "Kastana POS", en: "Kastana POS" }
  };
  
  return names[screenContext]?.[language] || screenContext;
}

/**
 * Get the most important UI element for a screen (for fallback responses)
 */
export function getScreenPrimaryElement(
  screenContext: ScreenContext,
  language: "ar" | "en"
): { name: string; description: string } {
  const elements: Record<ScreenContext, { name: { ar: string; en: string }; description: { ar: string; en: string } }> = {
    pos_main: {
      name: { ar: "لوحة الطلب", en: "Order Panel" },
      description: {
        ar: "تعرض الأصناف المضافة للطلب الحالي. اضغط على صنف من القائمة لإضافته.",
        en: "Shows items added to current order. Click a menu item to add it."
      }
    },
    pos_tables: {
      name: { ar: "خريطة الطاولات", en: "Table Map" },
      description: {
        ar: "تعرض جميع الطاولات. الألوان تدل على الحالة: أخضر = متاحة، أحمر = مشغولة.",
        en: "Shows all tables. Colors indicate status: green = available, red = occupied."
      }
    },
    pos_open_orders: {
      name: { ar: "قائمة الطلبات", en: "Orders List" },
      description: {
        ar: "جميع الطلبات النشطة غير المدفوعة. اضغط على طلب للعودة إليه.",
        en: "All active unpaid orders. Click an order to resume it."
      }
    },
    pos_qr_pending: {
      name: { ar: "الطلبات المعلقة", en: "Pending Orders" },
      description: {
        ar: "طلبات من العملاء تنتظر الموافقة. راجع التفاصيل ثم اقبل أو ارفض.",
        en: "Customer orders awaiting approval. Review details then accept or reject."
      }
    },
    owner_dashboard: {
      name: { ar: "ملخص اليوم", en: "Today's Summary" },
      description: {
        ar: "يعرض الحالة التشغيلية: المبيعات، الطلبات، الورديات المفتوحة، ودرجة التشغيل.",
        en: "Shows operational status: sales, orders, open shifts, and operational score."
      }
    },
    owner_menu: {
      name: { ar: "قائمة الأصناف", en: "Menu Items" },
      description: {
        ar: "جميع الأصناف في القائمة. يمكنك إضافة أو تعديل أو حذف الأصناف.",
        en: "All menu items. You can add, edit, or delete items."
      }
    },
    owner_staff: {
      name: { ar: "قائمة الموظفين", en: "Staff List" },
      description: {
        ar: "جميع الموظفين (كاشير، مطبخ). يمكنك إضافة موظف أو إعادة تعيين كلمة المرور.",
        en: "All staff (cashiers, kitchen). You can add staff or reset passwords."
      }
    },
    owner_inventory: {
      name: { ar: "قائمة المواد", en: "Inventory Items" },
      description: {
        ar: "المواد الخام والمكونات. يمكنك استلام بضاعة أو عمل جرد أو تسجيل هدر.",
        en: "Raw materials and ingredients. You can receive goods, count stock, or record waste."
      }
    },
    owner_reports: {
      name: { ar: "أنواع التقارير", en: "Report Types" },
      description: {
        ar: "تقارير متعددة: المبيعات، المدفوعات، المرتجعات، أداء الموظفين.",
        en: "Multiple reports: sales, payments, refunds, staff performance."
      }
    },
    owner_settings: {
      name: { ar: "إعدادات المطعم", en: "Restaurant Settings" },
      description: {
        ar: "الضريبة، العملة، ساعات العمل، طرق الدفع، إعدادات الخصم.",
        en: "Tax, currency, business hours, payment methods, discount settings."
      }
    },
    kds: {
      name: { ar: "بطاقات الطلبات", en: "Order Cards" },
      description: {
        ar: "كل بطاقة = طلب للتحضير. الألوان تدل على الوقت: أخضر (جديد)، أصفر (منتظر)، أحمر (متأخر).",
        en: "Each card = order to prepare. Colors show time: green (new), yellow (waiting), red (delayed)."
      }
    },
    system_admin: {
      name: { ar: "قائمة المطاعم", en: "Restaurants List" },
      description: {
        ar: "جميع المطاعم المسجلة. يمكنك تفعيل/تعطيل أو إضافة مالك جديد.",
        en: "All registered restaurants. You can activate/deactivate or add new owner."
      }
    },
    login: {
      name: { ar: "نموذج الدخول", en: "Login Form" },
      description: {
        ar: "أدخل البريد الإلكتروني وكلمة المرور للدخول.",
        en: "Enter email and password to login."
      }
    },
    unknown: {
      name: { ar: "Kastana POS", en: "Kastana POS" },
      description: {
        ar: "نظام نقاط البيع الذكي.",
        en: "Smart Point of Sale System."
      }
    }
  };
  
  const element = elements[screenContext];
  return {
    name: element?.name[language] || screenContext,
    description: element?.description[language] || ""
  };
}

/**
 * Build screen-locked fallback response with primary element explanation
 * Rule 3: Safe fallback - no "didn't understand", explain most important element
 */
export function buildSafeFallbackResponse(
  screenContext: ScreenContext,
  language: "ar" | "en",
  displayName?: string
): string {
  const screenName = getScreenName(screenContext, language);
  const primaryElement = getScreenPrimaryElement(screenContext, language);
  const mainFeature = SCREEN_BOUNDARIES[screenContext]?.mainFeature[language] || "";
  
  const greeting = displayName 
    ? (language === "ar" ? `مرحباً ${displayName}،` : `Hello ${displayName},`)
    : (language === "ar" ? "مرحباً،" : "Hello,");
  
  if (language === "ar") {
    return `${greeting}

أنت حالياً في شاشة **${screenName}**.
${mainFeature}

📍 **${primaryElement.name}**
${primaryElement.description}

يمكنك سؤالي عن:
• شرح أي عنصر تراه في الشاشة
• كيفية استخدام الأزرار والخيارات المتاحة`;
  }
  
  return `${greeting}

You are currently on the **${screenName}**.
${mainFeature}

📍 **${primaryElement.name}**
${primaryElement.description}

You can ask me about:
• Explaining any element you see on screen
• How to use available buttons and options`;
}
