// Kastana POS System Trainer - UI Element Registry
// Single source of truth for all trainable UI elements

export interface ElementExplanation {
  whatIs: { ar: string; en: string };
  whenToUse: { ar: string; en: string };
  example: { ar: string; en: string };
  commonMistake: { ar: string; en: string };
}

export interface TrainingStep {
  target: string; // CSS selector or element id
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  action?: "click" | "input" | "observe";
}

export interface TrainingModule {
  id: string;
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  roles: ("cashier" | "owner" | "kitchen" | "system_admin")[];
  screens: string[];
  steps: TrainingStep[];
  estimatedTime: number; // in minutes
  isFirstShift?: boolean; // Part of guided first shift
}

export interface UIElement {
  id: string;
  screenId: string;
  selector: string;
  label: { ar: string; en: string };
  explanation: ElementExplanation;
  relatedModules: string[]; // Training module IDs
}

// ============================================
// UI ELEMENT REGISTRY
// ============================================

export const UI_ELEMENTS: UIElement[] = [
  // POS SCREEN ELEMENTS
  {
    id: "pos_shift_button",
    screenId: "pos",
    selector: "[data-trainer='shift-button']",
    label: { ar: "زر الوردية", en: "Shift Button" },
    explanation: {
      whatIs: {
        ar: "زر فتح وإغلاق الوردية اليومية للكاشير",
        en: "Button to open and close the cashier's daily shift"
      },
      whenToUse: {
        ar: "عند بداية يوم العمل لفتح الوردية، وعند نهايته لإغلاقها",
        en: "At the start of work to open shift, and at end to close it"
      },
      example: {
       ar: "بداية اليوم: افتح الوردية بـ 500 دينار نقد افتتاحي",
       en: "Start of day: Open shift with 500 JOD opening cash"
      },
      commonMistake: {
        ar: "نسيان فتح الوردية قبل تسجيل أول طلب",
        en: "Forgetting to open shift before first order"
      }
    },
    relatedModules: ["first_shift_cashier", "shift_management"]
  },
  {
    id: "pos_new_order_button",
    screenId: "pos",
    selector: "[data-trainer='new-order-button']",
    label: { ar: "طلب جديد", en: "New Order" },
    explanation: {
      whatIs: {
        ar: "زر إنشاء طلب جديد فارغ",
        en: "Button to create a new empty order"
      },
      whenToUse: {
        ar: "عند وصول عميل جديد ورغبته في الطلب",
        en: "When a new customer arrives and wants to order"
      },
      example: {
        ar: "اضغط 'طلب جديد'، اختر نوع الطلب (محلي/سفري)، ابدأ إضافة الأصناف",
        en: "Click 'New Order', select type (dine-in/takeaway), start adding items"
      },
      commonMistake: {
        ar: "إضافة أصناف على طلب سابق بدلاً من إنشاء طلب جديد",
        en: "Adding items to previous order instead of creating new one"
      }
    },
    relatedModules: ["first_shift_cashier", "order_management"]
  },
  {
    id: "pos_payment_button",
    screenId: "pos",
    selector: "[data-trainer='payment-button']",
    label: { ar: "الدفع", en: "Payment" },
    explanation: {
      whatIs: {
        ar: "زر بدء عملية الدفع للطلب الحالي",
        en: "Button to start payment process for current order"
      },
      whenToUse: {
        ar: "عندما ينتهي العميل من اختيار أصنافه ويرغب بالدفع",
        en: "When customer finishes selecting items and wants to pay"
      },
      example: {
        ar: "اضغط 'الدفع' → اختر طريقة الدفع (نقد/بطاقة) → أدخل المبلغ → تأكيد",
        en: "Click 'Payment' → Select method (cash/card) → Enter amount → Confirm"
      },
      commonMistake: {
        ar: "محاولة الدفع بدون فتح وردية أولاً",
        en: "Trying to pay without opening shift first"
      }
    },
    relatedModules: ["first_shift_cashier", "payment_flow"]
  },
  {
    id: "pos_hold_button",
    screenId: "pos",
    selector: "[data-trainer='hold-button']",
    label: { ar: "تعليق", en: "Hold" },
    explanation: {
      whatIs: {
        ar: "زر تعليق الطلب مؤقتاً للعودة له لاحقاً",
        en: "Button to temporarily hold order for later"
      },
      whenToUse: {
        ar: "عندما يحتاج العميل وقتاً إضافياً أو يريد الذهاب مؤقتاً",
        en: "When customer needs more time or wants to step away"
      },
      example: {
        ar: "عميل نسي محفظته → علّق الطلب → أكمل طلبات أخرى → استأنف عند عودته",
        en: "Customer forgot wallet → Hold order → Serve others → Resume when back"
      },
      commonMistake: {
        ar: "استخدام 'إلغاء' بدلاً من 'تعليق' للطلبات المؤجلة",
        en: "Using 'Cancel' instead of 'Hold' for deferred orders"
      }
    },
    relatedModules: ["order_management", "hold_vs_cancel"]
  },
  {
    id: "pos_categories",
    screenId: "pos",
    selector: "[data-trainer='category-list']",
    label: { ar: "التصنيفات", en: "Categories" },
    explanation: {
      whatIs: {
        ar: "قائمة تصنيفات المنتجات لتسهيل البحث",
        en: "Product categories list for easy navigation"
      },
      whenToUse: {
        ar: "للوصول السريع للمنتج المطلوب حسب نوعه",
        en: "For quick access to products by type"
      },
      example: {
        ar: "اضغط 'مشروبات ساخنة' → ستظهر فقط القهوة والشاي",
        en: "Click 'Hot Drinks' → Only coffee and tea will show"
      },
      commonMistake: {
        ar: "التمرير في كل المنتجات بدلاً من استخدام التصنيفات",
        en: "Scrolling all products instead of using categories"
      }
    },
    relatedModules: ["first_shift_cashier"]
  },
  {
    id: "pos_order_panel",
    screenId: "pos",
    selector: "[data-trainer='order-panel']",
    label: { ar: "سلة الطلب", en: "Order Panel" },
    explanation: {
      whatIs: {
        ar: "لوحة عرض الطلب الحالي وتفاصيله",
        en: "Panel showing current order and its details"
      },
      whenToUse: {
        ar: "لمراجعة الطلب، تعديل الكميات، أو إضافة ملاحظات",
        en: "To review order, modify quantities, or add notes"
      },
      example: {
        ar: "اضغط على صنف في السلة → غيّر الكمية أو أضف ملاحظة 'بدون سكر'",
        en: "Click item in cart → Change quantity or add note 'no sugar'"
      },
      commonMistake: {
        ar: "عدم مراجعة الطلب قبل الدفع",
        en: "Not reviewing order before payment"
      }
    },
    relatedModules: ["first_shift_cashier", "order_management"]
  },
  
  // OWNER DASHBOARD ELEMENTS
  {
    id: "owner_today_income",
    screenId: "owner",
    selector: "[data-trainer='today-income']",
    label: { ar: "دخل اليوم", en: "Today's Income" },
    explanation: {
      whatIs: {
        ar: "إجمالي المبيعات المحصلة لهذا اليوم",
        en: "Total sales collected today"
      },
      whenToUse: {
        ar: "لمتابعة أداء اليوم الحالي مقارنة بالأيام السابقة",
        en: "To monitor today's performance vs previous days"
      },
      example: {
       ar: "دخل اليوم 15,000 دينار مقابل 12,000 أمس = نمو 25%",
       en: "Today 15,000 JOD vs 12,000 yesterday = 25% growth"
      },
      commonMistake: {
        ar: "عدم مراعاة أن الرقم يشمل الضريبة",
        en: "Not considering that amount includes tax"
      }
    },
    relatedModules: ["owner_dashboard_tour", "sales_reports"]
  },
  {
    id: "owner_confidence_score",
    screenId: "owner",
    selector: "[data-trainer='confidence-score']",
    label: { ar: "نقاط الثقة", en: "Confidence Score" },
    explanation: {
      whatIs: {
        ar: "مؤشر صحة إعداد النظام والعمليات التشغيلية",
        en: "Indicator of system setup and operational health"
      },
      whenToUse: {
        ar: "للتأكد من أن النظام مُعد بشكل صحيح",
        en: "To verify system is properly configured"
      },
      example: {
        ar: "نقاط 85% = إعداد جيد، 60% = يحتاج تحسين في الوصفات",
        en: "85% = Good setup, 60% = Needs recipe improvements"
      },
      commonMistake: {
        ar: "تجاهل النقاط المنخفضة وعدم معالجة أسبابها",
        en: "Ignoring low scores without addressing causes"
      }
    },
    relatedModules: ["owner_dashboard_tour", "system_health"]
  },
  {
    id: "owner_inventory_risk",
    screenId: "owner",
    selector: "[data-trainer='inventory-risk']",
    label: { ar: "مخاطر المخزون", en: "Inventory Risk" },
    explanation: {
      whatIs: {
        ar: "تنبيهات المخزون المنخفض أو الفروقات الكبيرة",
        en: "Alerts for low stock or significant variances"
      },
      whenToUse: {
        ar: "للتصرف قبل نفاد المواد أو اكتشاف الهدر",
        en: "To act before running out or discovering waste"
      },
      example: {
        ar: "⚠️ حليب منخفض: 2 لتر متبقي → طلب شراء جديد",
        en: "⚠️ Low milk: 2L remaining → Create purchase order"
      },
      commonMistake: {
        ar: "انتظار نفاد المخزون بدلاً من الطلب المبكر",
        en: "Waiting for stockout instead of early ordering"
      }
    },
    relatedModules: ["owner_dashboard_tour", "inventory_management"]
  },
  {
    id: "owner_reports_tab",
    screenId: "owner",
    selector: "[data-trainer='reports-tab']",
    label: { ar: "التقارير", en: "Reports" },
    explanation: {
      whatIs: {
        ar: "قسم التقارير التفصيلية للمبيعات والمخزون والموظفين",
        en: "Section for detailed sales, inventory, and staff reports"
      },
      whenToUse: {
        ar: "لتحليل الأداء واتخاذ قرارات مبنية على بيانات",
        en: "To analyze performance and make data-driven decisions"
      },
      example: {
        ar: "تقرير Z: ملخص يوم كامل بكل طرق الدفع والمرتجعات",
        en: "Z-Report: Complete day summary with all payments and refunds"
      },
      commonMistake: {
        ar: "الاعتماد على الذاكرة بدلاً من مراجعة التقارير",
        en: "Relying on memory instead of reviewing reports"
      }
    },
    relatedModules: ["owner_dashboard_tour", "reports_mastery"]
  },
  
  // KDS ELEMENTS
  {
    id: "kds_order_card",
    screenId: "kds",
    selector: "[data-trainer='order-card']",
    label: { ar: "بطاقة الطلب", en: "Order Card" },
    explanation: {
      whatIs: {
        ar: "بطاقة تعرض تفاصيل طلب واحد للمطبخ",
        en: "Card showing one order's details for kitchen"
      },
      whenToUse: {
        ar: "لرؤية محتوى الطلب ووقت الانتظار",
        en: "To see order contents and wait time"
      },
      example: {
        ar: "بطاقة حمراء = طلب متأخر يحتاج أولوية",
        en: "Red card = Late order needs priority"
      },
      commonMistake: {
        ar: "تجاهل الطلبات القديمة وخدمة الجديدة أولاً",
        en: "Ignoring old orders and serving new ones first"
      }
    },
    relatedModules: ["kitchen_basics"]
  },
  {
    id: "kds_complete_button",
    screenId: "kds",
    selector: "[data-trainer='complete-order']",
    label: { ar: "إتمام الطلب", en: "Complete Order" },
    explanation: {
      whatIs: {
        ar: "زر تأكيد انتهاء تحضير الطلب",
        en: "Button to confirm order is ready"
      },
      whenToUse: {
        ar: "فور الانتهاء من تحضير كل أصناف الطلب",
        en: "As soon as all order items are prepared"
      },
      example: {
        ar: "حضّرت البرجر والبطاطا → اضغط ✓ → الطلب ينتقل للجاهز",
        en: "Prepared burger and fries → Click ✓ → Order moves to ready"
      },
      commonMistake: {
        ar: "الضغط قبل الانتهاء الفعلي من كل الأصناف",
        en: "Clicking before actually finishing all items"
      }
    },
    relatedModules: ["kitchen_basics"]
  }
];

// ============================================
// TRAINING MODULES
// ============================================

export const TRAINING_MODULES: TrainingModule[] = [
  // CASHIER FIRST SHIFT (Guided)
  {
    id: "first_shift_cashier",
    title: { ar: "أول وردية لك", en: "Your First Shift" },
    description: { 
      ar: "تعلم الأساسيات في 5 خطوات بسيطة", 
      en: "Learn the basics in 5 simple steps" 
    },
    roles: ["cashier"],
    screens: ["pos"],
    isFirstShift: true,
    estimatedTime: 3,
    steps: [
      {
        target: "[data-trainer='shift-button']",
        title: { ar: "1. افتح الوردية", en: "1. Open Shift" },
        description: { 
          ar: "اضغط هنا لفتح ورديتك. أدخل المبلغ الافتتاحي في الدرج.", 
          en: "Click here to open your shift. Enter the opening cash amount." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='new-order-button']",
        title: { ar: "2. طلب جديد", en: "2. New Order" },
        description: { 
          ar: "اضغط لإنشاء طلب جديد عند وصول عميل.", 
          en: "Click to create a new order when a customer arrives." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='category-list']",
        title: { ar: "3. اختر التصنيف", en: "3. Choose Category" },
        description: { 
          ar: "اختر التصنيف للوصول السريع للمنتجات.", 
          en: "Select a category for quick access to products." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='order-panel']",
        title: { ar: "4. راجع الطلب", en: "4. Review Order" },
        description: { 
          ar: "تأكد من صحة الأصناف والكميات قبل الدفع.", 
          en: "Verify items and quantities before payment." 
        },
        action: "observe"
      },
      {
        target: "[data-trainer='payment-button']",
        title: { ar: "5. أتم الدفع", en: "5. Complete Payment" },
        description: { 
          ar: "اضغط للدفع واختر طريقة الدفع المناسبة.", 
          en: "Click to pay and select the appropriate payment method." 
        },
        action: "click"
      }
    ]
  },
  
  // OWNER DASHBOARD TOUR
  {
    id: "owner_dashboard_tour",
    title: { ar: "جولة لوحة التحكم", en: "Dashboard Tour" },
    description: { 
      ar: "تعرف على أهم المؤشرات في دقيقتين", 
      en: "Learn key metrics in 2 minutes" 
    },
    roles: ["owner"],
    screens: ["owner"],
    isFirstShift: true,
    estimatedTime: 2,
    steps: [
      {
        target: "[data-trainer='today-income']",
        title: { ar: "1. دخل اليوم", en: "1. Today's Income" },
        description: { 
          ar: "إجمالي مبيعات اليوم حتى الآن.", 
          en: "Total sales for today so far." 
        },
        action: "observe"
      },
      {
        target: "[data-trainer='confidence-score']",
        title: { ar: "2. نقاط الثقة", en: "2. Confidence Score" },
        description: { 
          ar: "مؤشر صحة النظام. كلما ارتفع كان أفضل.", 
          en: "System health indicator. Higher is better." 
        },
        action: "observe"
      },
      {
        target: "[data-trainer='inventory-risk']",
        title: { ar: "3. تنبيهات المخزون", en: "3. Inventory Alerts" },
        description: { 
          ar: "مواد تحتاج انتباهك (منخفضة أو فيها فروقات).", 
          en: "Items needing attention (low or variance)." 
        },
        action: "observe"
      },
      {
        target: "[data-trainer='reports-tab']",
        title: { ar: "4. التقارير", en: "4. Reports" },
        description: { 
          ar: "للتحليل العميق: مبيعات، مخزون، موظفين.", 
          en: "For deep analysis: sales, inventory, staff." 
        },
        action: "click"
      }
    ]
  },
  
  // KITCHEN BASICS
  {
    id: "kitchen_basics",
    title: { ar: "أساسيات شاشة المطبخ", en: "Kitchen Screen Basics" },
    description: { 
      ar: "كيف تستخدم شاشة الطلبات", 
      en: "How to use the orders screen" 
    },
    roles: ["kitchen"],
    screens: ["kds"],
    isFirstShift: true,
    estimatedTime: 2,
    steps: [
      {
        target: "[data-trainer='order-card']",
        title: { ar: "1. بطاقات الطلبات", en: "1. Order Cards" },
        description: { 
          ar: "كل بطاقة = طلب. اللون يدل على الأولوية.", 
          en: "Each card = order. Color indicates priority." 
        },
        action: "observe"
      },
      {
        target: "[data-trainer='complete-order']",
        title: { ar: "2. إتمام الطلب", en: "2. Complete Order" },
        description: { 
          ar: "اضغط ✓ عند الانتهاء من تحضير الطلب.", 
          en: "Click ✓ when order preparation is done." 
        },
        action: "click"
      }
    ]
  },
  
  // SHIFT MANAGEMENT
  {
    id: "shift_management",
    title: { ar: "إدارة الوردية", en: "Shift Management" },
    description: { 
      ar: "افتح، أدر، وأغلق ورديتك بشكل صحيح", 
      en: "Open, manage, and close your shift properly" 
    },
    roles: ["cashier"],
    screens: ["pos"],
    estimatedTime: 3,
    steps: [
      {
        target: "[data-trainer='shift-button']",
        title: { ar: "افتح الوردية", en: "Open Shift" },
        description: { 
          ar: "أدخل المبلغ الافتتاحي بدقة. يُستخدم لحساب الفرق نهاية اليوم.", 
          en: "Enter opening cash accurately. Used for end-of-day difference." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='cash-movement']",
        title: { ar: "حركات النقد", en: "Cash Movements" },
        description: { 
          ar: "سجّل أي إيداع أو سحب نقدي خلال الوردية.", 
          en: "Record any cash deposits or withdrawals during shift." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='shift-button']",
        title: { ar: "أغلق الوردية", en: "Close Shift" },
        description: { 
          ar: "أدخل النقد الفعلي في الدرج. النظام يحسب الفرق تلقائياً.", 
          en: "Enter actual cash in drawer. System calculates difference." 
        },
        action: "click"
      }
    ]
  },
  
  // ORDER MANAGEMENT
  {
    id: "order_management",
    title: { ar: "إدارة الطلبات", en: "Order Management" },
    description: { 
      ar: "تعليق، تعديل، وإلغاء الطلبات", 
      en: "Hold, modify, and cancel orders" 
    },
    roles: ["cashier"],
    screens: ["pos"],
    estimatedTime: 4,
    steps: [
      {
        target: "[data-trainer='hold-button']",
        title: { ar: "تعليق الطلب", en: "Hold Order" },
        description: { 
          ar: "استخدم التعليق للطلبات المؤجلة. أفضل من الإلغاء!", 
          en: "Use hold for deferred orders. Better than cancel!" 
        },
        action: "click"
      },
      {
        target: "[data-trainer='held-orders']",
        title: { ar: "الطلبات المعلقة", en: "Held Orders" },
        description: { 
          ar: "هنا تجد كل الطلبات المعلقة لاستئنافها.", 
          en: "Find all held orders here to resume them." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='void-button']",
        title: { ar: "إلغاء صنف", en: "Void Item" },
        description: { 
          ar: "لإزالة صنف خاطئ. يُسجل في سجل التدقيق.", 
          en: "To remove wrong item. Recorded in audit log." 
        },
        action: "click"
      }
    ]
  },
  
  // PAYMENT FLOW
  {
    id: "payment_flow",
    title: { ar: "عملية الدفع", en: "Payment Flow" },
    description: { 
      ar: "كل طرق الدفع وكيف تستخدمها", 
      en: "All payment methods and how to use them" 
    },
    roles: ["cashier"],
    screens: ["pos"],
    estimatedTime: 3,
    steps: [
      {
        target: "[data-trainer='payment-button']",
        title: { ar: "بدء الدفع", en: "Start Payment" },
        description: { 
          ar: "اضغط لفتح نافذة الدفع.", 
          en: "Click to open payment dialog." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='payment-cash']",
        title: { ar: "الدفع نقداً", en: "Cash Payment" },
        description: { 
          ar: "أدخل المبلغ المستلم. النظام يحسب الباقي.", 
          en: "Enter received amount. System calculates change." 
        },
        action: "click"
      },
      {
        target: "[data-trainer='payment-split']",
        title: { ar: "تقسيم الدفع", en: "Split Payment" },
        description: { 
          ar: "لتقسيم المبلغ على أكثر من طريقة دفع.", 
          en: "To split amount across multiple methods." 
        },
        action: "click"
      }
    ]
  }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get element by ID
 */
export function getElementById(elementId: string): UIElement | undefined {
  return UI_ELEMENTS.find(el => el.id === elementId);
}

/**
 * Get elements for a specific screen
 */
export function getElementsByScreen(screenId: string): UIElement[] {
  return UI_ELEMENTS.filter(el => el.screenId === screenId);
}

/**
 * Get training module by ID
 */
export function getModuleById(moduleId: string): TrainingModule | undefined {
  return TRAINING_MODULES.find(m => m.id === moduleId);
}

/**
 * Get modules for a specific role
 */
export function getModulesForRole(role: string): TrainingModule[] {
  return TRAINING_MODULES.filter(m => 
    m.roles.includes(role as "cashier" | "owner" | "kitchen" | "system_admin")
  );
}

/**
 * Get first-shift modules for a role
 */
export function getFirstShiftModules(role: string): TrainingModule[] {
  return TRAINING_MODULES.filter(m => 
    m.isFirstShift && 
    m.roles.includes(role as "cashier" | "owner" | "kitchen" | "system_admin")
  );
}

/**
 * Get modules for current screen and role
 */
export function getModulesForContext(role: string, screen: string): TrainingModule[] {
  return TRAINING_MODULES.filter(m => 
    m.roles.includes(role as "cashier" | "owner" | "kitchen" | "system_admin") &&
    m.screens.some(s => screen.includes(s))
  );
}

/**
 * Find element by selector match
 */
export function findElementBySelector(selector: string): UIElement | undefined {
  return UI_ELEMENTS.find(el => el.selector === selector);
}

/**
 * Get all elements that have training modules
 */
export function getTrainableElements(): UIElement[] {
  return UI_ELEMENTS.filter(el => el.relatedModules.length > 0);
}
