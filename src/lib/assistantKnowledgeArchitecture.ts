// Kastana POS Knowledge Architecture
// AUGMENTATION LAYER: System understanding for intelligent reasoning
// CRITICAL: This file enables the assistant to DIAGNOSE, not just describe

// ============================================
// 1. SYSTEM INVARIANTS (NON-NEGOTIABLE RULES)
// ============================================

export interface SystemInvariant {
  id: string;
  rule: { ar: string; en: string };
  category: "order" | "payment" | "shift" | "inventory" | "kds" | "qr" | "restaurant" | "auth";
  severity: "blocking" | "warning";
}

export const SYSTEM_INVARIANTS: SystemInvariant[] = [
  // === ORDER INVARIANTS ===
  {
    id: "inv_order_hold_no_pay",
    rule: {
      ar: "الطلبات المعلقة (ON_HOLD) لا يمكن دفعها. يجب استئنافها أولاً.",
      en: "Orders with status ON_HOLD cannot be paid. Must resume first.",
    },
    category: "order",
    severity: "blocking",
  },
  {
    id: "inv_order_paid_immutable",
    rule: {
      ar: "الطلبات المدفوعة (PAID/CLOSED) لا يمكن تعديلها. استخدم المرتجع.",
      en: "Paid/Closed orders cannot be modified. Use refund instead.",
    },
    category: "order",
    severity: "blocking",
  },
  {
    id: "inv_order_empty_no_pay",
    rule: {
      ar: "الطلبات الفارغة (بدون أصناف) لا يمكن دفعها.",
      en: "Empty orders (no items) cannot be paid.",
    },
    category: "order",
    severity: "blocking",
  },
  {
    id: "inv_order_void_vs_refund",
    rule: {
      ar: "الإلغاء (Void) للطلبات المفتوحة فقط. المرتجع (Refund) للطلبات المغلقة.",
      en: "Void is for open orders only. Refund is for closed orders.",
    },
    category: "order",
    severity: "blocking",
  },

  // === PAYMENT INVARIANTS ===
  {
    id: "inv_payment_shift_required",
    rule: {
      ar: "يجب فتح وردية قبل أي عملية دفع.",
      en: "A shift must be open to accept any payment.",
    },
    category: "payment",
    severity: "blocking",
  },
  {
    id: "inv_refund_subtract_sales",
    rule: {
      ar: "المرتجعات تُخصم من إجمالي وصافي المبيعات.",
      en: "Refunds must subtract from both Gross and Net sales.",
    },
    category: "payment",
    severity: "blocking",
  },
  {
    id: "inv_refund_max_limit",
    rule: {
      ar: "لا يمكن استرداد مبلغ أكبر من قيمة الطلب الأصلي.",
      en: "Cannot refund more than the original order value.",
    },
    category: "payment",
    severity: "blocking",
  },

  // === SHIFT INVARIANTS ===
  {
    id: "inv_shift_one_active",
    rule: {
      ar: "لا يمكن فتح وردية جديدة إذا كانت هناك وردية مفتوحة.",
      en: "Cannot open a new shift if one is already open.",
    },
    category: "shift",
    severity: "blocking",
  },
  {
    id: "inv_shift_close_open_orders",
    rule: {
      ar: "لا يمكن إغلاق الوردية إذا كانت هناك طلبات مفتوحة.",
      en: "Cannot close shift if there are open orders.",
    },
    category: "shift",
    severity: "blocking",
  },

  // === INVENTORY INVARIANTS ===
  {
    id: "inv_inventory_module_check",
    rule: {
      ar: "إذا كان inventory_enabled = false، يتم تجاهل جميع منطق المخزون.",
      en: "If inventory_enabled = false, ignore all inventory logic completely.",
    },
    category: "inventory",
    severity: "blocking",
  },
  {
    id: "inv_recipe_required_deduction",
    rule: {
      ar: "خصم المخزون يتطلب وجود وصفة للصنف.",
      en: "Inventory deduction requires a recipe for the menu item.",
    },
    category: "inventory",
    severity: "warning",
  },

  // === KDS INVARIANTS ===
  {
    id: "inv_kds_module_check",
    rule: {
      ar: "إذا كان kds_enabled = false، لا يتم إرسال أي طلب للمطبخ.",
      en: "If kds_enabled = false, no orders are sent to kitchen.",
    },
    category: "kds",
    severity: "blocking",
  },
  {
    id: "inv_kds_status_filter",
    rule: {
      ar: "شاشة المطبخ تعرض فقط الطلبات بالحالات: new, preparing, ready.",
      en: "KDS only shows orders with allowed kitchen statuses: new, preparing, ready.",
    },
    category: "kds",
    severity: "blocking",
  },

  // === QR INVARIANTS ===
  {
    id: "inv_qr_module_check",
    rule: {
      ar: "إذا كان qr_order_enabled = false، يتم حظر جميع طلبات QR.",
      en: "If qr_order_enabled = false, all QR order creation is blocked.",
    },
    category: "qr",
    severity: "blocking",
  },
  {
    id: "inv_qr_accept_auto_kitchen",
    rule: {
      ar: "قبول طلب QR يرسله تلقائياً للمطبخ.",
      en: "Accepting a QR order automatically sends it to kitchen.",
    },
    category: "qr",
    severity: "blocking",
  },
  {
    id: "inv_qr_table_required",
    rule: {
      ar: "طلبات QR تتطلب ربط بالطاولة والفرع والمطعم.",
      en: "QR orders require valid table, branch, and restaurant linkage.",
    },
    category: "qr",
    severity: "blocking",
  },

  // === RESTAURANT INVARIANTS ===
  {
    id: "inv_restaurant_inactive",
    rule: {
      ar: "إذا كان المطعم غير نشط، جميع عمليات POS و QR و KDS محظورة.",
      en: "If restaurant is inactive, all POS, QR, and KDS actions are blocked.",
    },
    category: "restaurant",
    severity: "blocking",
  },
  {
    id: "inv_subscription_expired",
    rule: {
      ar: "انتهاء الاشتراك يمنع جميع العمليات ويعرض شاشة التجديد.",
      en: "Expired subscription blocks all operations and shows renewal screen.",
    },
    category: "restaurant",
    severity: "blocking",
  },
  {
    id: "inv_subscription_manual_only",
    rule: {
      ar: "إدارة الاشتراكات يدوية بالكامل. لا يوجد تجديد تلقائي أو جدولة خلفية.",
      en: "Subscription management is fully manual. No automatic renewals or background scheduling.",
    },
    category: "restaurant",
    severity: "blocking",
  },
  {
    id: "inv_subscription_bonus_max",
    rule: {
      ar: "الحد الأقصى للشهور الإضافية 3 شهور. تُضاف لتاريخ الانتهاء فقط.",
      en: "Maximum bonus months is 3. Added to end date only, never changes start date.",
    },
    category: "restaurant",
    severity: "warning",
  },
  {
    id: "inv_subscription_duration_max",
    rule: {
      ar: "الحد الأقصى لمدة الاشتراك 12 شهر.",
      en: "Maximum subscription duration is 12 months.",
    },
    category: "restaurant",
    severity: "warning",
  },
  {
    id: "inv_reminders_manual_only",
    rule: {
      ar: "التذكيرات يدوية فقط. لا يوجد إرسال تلقائي لواتساب أو SMS أو إيميل.",
      en: "Reminders are manual only. No automatic WhatsApp, SMS, or email sending.",
    },
    category: "restaurant",
    severity: "blocking",
  },
  {
    id: "inv_owner_assignment_admin_only",
    rule: {
      ar: "تعيين أو تغيير صاحب المطعم يتم من قبل مدير النظام فقط.",
      en: "Owner assignment or change can only be done by System Admin.",
    },
    category: "auth",
    severity: "blocking",
  },
  {
    id: "inv_owner_change_immediate",
    rule: {
      ar: "عند تغيير المالك، يفقد السابق الصلاحية فوراً ويحصل الجديد عليها فوراً.",
      en: "When owner changes, previous loses access immediately and new gains access immediately.",
    },
    category: "auth",
    severity: "blocking",
  },
  {
    id: "inv_multi_restaurant_isolation",
    rule: {
      ar: "كل مطعم له بيانات منفصلة تماماً. لا تختلط البيانات بين المطاعم.",
      en: "Each restaurant has completely separate data. Data never mixes between restaurants.",
    },
    category: "restaurant",
    severity: "blocking",
  },
];

// ============================================
// 2. ACTIONS REGISTRY
// ============================================

export type UserRole = "cashier" | "owner" | "kitchen" | "system_admin";

export interface ActionEntry {
  id: string;
  action_name: { ar: string; en: string };
  allowed_roles: UserRole[];
  preconditions: { ar: string[]; en: string[] };
  postconditions: { ar: string[]; en: string[] };
  side_effects: {
    kds?: boolean;
    inventory?: boolean;
    audit_log: boolean;
    reports?: boolean;
    notifications?: boolean;
  };
  related_invariants: string[];
}

export const ACTIONS_REGISTRY: ActionEntry[] = [
  // === ORDER ACTIONS ===
  {
    id: "action_create_order",
    action_name: { ar: "إنشاء طلب", en: "Create Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الوردية مفتوحة", "اختيار نوع الطلب (سفري/صالة)"],
      en: ["Shift is open", "Order type selected (takeaway/dine-in)"],
    },
    postconditions: {
      ar: ["طلب جديد بحالة OPEN", "رقم طلب فريد"],
      en: ["New order with status OPEN", "Unique order number assigned"],
    },
    side_effects: { audit_log: true, kds: false, inventory: false },
    related_invariants: ["inv_payment_shift_required"],
  },
  {
    id: "action_accept_qr_order",
    action_name: { ar: "قبول طلب QR", en: "Accept QR Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الوردية مفتوحة", "طلب QR بحالة PENDING", "إضافة QR مفعلة"],
      en: ["Shift is open", "QR order with status PENDING", "QR add-on enabled"],
    },
    postconditions: {
      ar: ["حالة الطلب تتغير إلى OPEN", "يُرسل للمطبخ تلقائياً"],
      en: ["Order status changes to OPEN", "Auto-sent to kitchen"],
    },
    side_effects: { audit_log: true, kds: true, inventory: false },
    related_invariants: ["inv_qr_module_check", "inv_qr_accept_auto_kitchen", "inv_payment_shift_required"],
  },
  {
    id: "action_send_to_kitchen",
    action_name: { ar: "إرسال للمطبخ", en: "Send to Kitchen" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["KDS مفعل", "الطلب يحتوي على أصناف", "الأصناف غير مرسلة مسبقاً"],
      en: ["KDS enabled", "Order has items", "Items not already sent"],
    },
    postconditions: {
      ar: ["الأصناف تظهر في شاشة المطبخ", "kitchen_sent_at يتحدث"],
      en: ["Items appear on kitchen display", "kitchen_sent_at updated"],
    },
    side_effects: { audit_log: true, kds: true },
    related_invariants: ["inv_kds_module_check", "inv_kds_status_filter"],
  },
  {
    id: "action_hold_order",
    action_name: { ar: "تعليق الطلب", en: "Hold Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الطلب بحالة OPEN", "الطلب غير فارغ"],
      en: ["Order status is OPEN", "Order is not empty"],
    },
    postconditions: {
      ar: ["حالة الطلب تتغير إلى HELD", "يظهر في قائمة الطلبات المعلقة"],
      en: ["Order status changes to HELD", "Appears in held orders list"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_order_hold_no_pay"],
  },
  {
    id: "action_resume_order",
    action_name: { ar: "استئناف الطلب", en: "Resume Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الطلب بحالة HELD"],
      en: ["Order status is HELD"],
    },
    postconditions: {
      ar: ["حالة الطلب تتغير إلى OPEN", "يصبح الطلب الحالي"],
      en: ["Order status changes to OPEN", "Becomes current order"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_order_hold_no_pay"],
  },
  {
    id: "action_complete_payment",
    action_name: { ar: "إتمام الدفع", en: "Complete Payment" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: [
        "الوردية مفتوحة",
        "الطلب بحالة OPEN",
        "الطلب غير فارغ",
        "المبلغ المدفوع يغطي الإجمالي",
      ],
      en: [
        "Shift is open",
        "Order status is OPEN",
        "Order is not empty",
        "Paid amount covers total",
      ],
    },
    postconditions: {
      ar: ["حالة الطلب تتغير إلى PAID/CLOSED", "سجل الدفع يُنشأ", "المخزون يُخصم إذا مفعل"],
      en: ["Order status changes to PAID/CLOSED", "Payment record created", "Inventory deducted if enabled"],
    },
    side_effects: { audit_log: true, inventory: true, reports: true },
    related_invariants: ["inv_payment_shift_required", "inv_order_hold_no_pay", "inv_order_empty_no_pay"],
  },
  {
    id: "action_refund_order",
    action_name: { ar: "مرتجع", en: "Refund Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الوردية مفتوحة", "الطلب بحالة CLOSED/PAID", "المبلغ لا يتجاوز قيمة الطلب"],
      en: ["Shift is open", "Order status is CLOSED/PAID", "Amount does not exceed order value"],
    },
    postconditions: {
      ar: ["سجل مرتجع يُنشأ", "يُخصم من إجمالي وصافي المبيعات"],
      en: ["Refund record created", "Subtracted from gross and net sales"],
    },
    side_effects: { audit_log: true, reports: true },
    related_invariants: ["inv_refund_subtract_sales", "inv_refund_max_limit", "inv_order_void_vs_refund"],
  },
  {
    id: "action_void_order",
    action_name: { ar: "إلغاء الطلب", en: "Void Order" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["الطلب بحالة OPEN أو HELD", "سبب الإلغاء"],
      en: ["Order status is OPEN or HELD", "Void reason provided"],
    },
    postconditions: {
      ar: ["حالة الطلب تتغير إلى VOIDED", "لا يظهر في المبيعات"],
      en: ["Order status changes to VOIDED", "Does not appear in sales"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_order_void_vs_refund"],
  },

  // === SHIFT ACTIONS ===
  {
    id: "action_open_shift",
    action_name: { ar: "فتح وردية", en: "Open Shift" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["لا توجد وردية مفتوحة", "المبلغ الافتتاحي محدد"],
      en: ["No open shift exists", "Opening amount specified"],
    },
    postconditions: {
      ar: ["وردية جديدة بحالة OPEN", "الرصيد الافتتاحي يُسجل"],
      en: ["New shift with status OPEN", "Opening balance recorded"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_shift_one_active"],
  },
  {
    id: "action_close_shift",
    action_name: { ar: "إغلاق الوردية", en: "Close Shift" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["وردية مفتوحة", "لا توجد طلبات مفتوحة", "الرصيد الفعلي محدد"],
      en: ["Shift is open", "No open orders", "Actual balance specified"],
    },
    postconditions: {
      ar: ["الوردية تُغلق", "تقرير Z يُنشأ", "الفرق يُحسب"],
      en: ["Shift is closed", "Z Report generated", "Difference calculated"],
    },
    side_effects: { audit_log: true, reports: true },
    related_invariants: ["inv_shift_close_open_orders"],
  },

  // === INVENTORY ACTIONS ===
  {
    id: "action_add_recipe",
    action_name: { ar: "إضافة وصفة", en: "Add Recipe" },
    allowed_roles: ["owner"],
    preconditions: {
      ar: ["المخزون مفعل", "صنف قائمة موجود", "مواد خام موجودة"],
      en: ["Inventory enabled", "Menu item exists", "Raw materials exist"],
    },
    postconditions: {
      ar: ["وصفة مرتبطة بالصنف", "خصم تلقائي عند البيع"],
      en: ["Recipe linked to menu item", "Auto-deduction on sale"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_inventory_module_check", "inv_recipe_required_deduction"],
  },
  {
    id: "action_inventory_deduction",
    action_name: { ar: "خصم المخزون", en: "Inventory Deduction" },
    allowed_roles: ["cashier", "owner"],
    preconditions: {
      ar: ["المخزون مفعل", "الصنف له وصفة", "المواد متوفرة"],
      en: ["Inventory enabled", "Item has recipe", "Materials available"],
    },
    postconditions: {
      ar: ["الكميات تُخصم من المخزون", "transaction يُسجل"],
      en: ["Quantities deducted from stock", "Transaction recorded"],
    },
    side_effects: { audit_log: true, inventory: true },
    related_invariants: ["inv_inventory_module_check", "inv_recipe_required_deduction"],
  },

  // === SYSTEM ADMIN ACTIONS ===
  {
    id: "action_create_restaurant",
    action_name: { ar: "إنشاء مطعم", en: "Create Restaurant" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["اسم المطعم محدد", "مدة الاشتراك محددة"],
      en: ["Restaurant name specified", "Subscription period specified"],
    },
    postconditions: {
      ar: ["مطعم جديد يُنشأ", "اشتراك يُنشأ", "الحالة: غير مكتمل (بدون مالك)"],
      en: ["New restaurant created", "Subscription created", "Status: Incomplete (no owner)"],
    },
    side_effects: { audit_log: true },
    related_invariants: [],
  },
  {
    id: "action_create_owner",
    action_name: { ar: "إنشاء صاحب مطعم", en: "Create Owner" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["البريد الإلكتروني محدد", "كلمة المرور محددة"],
      en: ["Email specified", "Password specified"],
    },
    postconditions: {
      ar: ["حساب مالك جديد يُنشأ", "غير مرتبط بمطعم بعد"],
      en: ["New owner account created", "Not linked to restaurant yet"],
    },
    side_effects: { audit_log: true },
    related_invariants: [],
  },
  {
    id: "action_assign_owner",
    action_name: { ar: "تعيين مالك للمطعم", en: "Assign Owner to Restaurant" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["المطعم موجود", "المالك موجود"],
      en: ["Restaurant exists", "Owner exists"],
    },
    postconditions: {
      ar: ["المالك مرتبط بالمطعم", "حالة المطعم: جاهز"],
      en: ["Owner linked to restaurant", "Restaurant status: Ready"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_owner_assignment_admin_only", "inv_owner_change_immediate"],
  },
  {
    id: "action_renew_subscription",
    action_name: { ar: "تجديد الاشتراك", en: "Renew Subscription" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["المطعم موجود", "مدة التجديد محددة"],
      en: ["Restaurant exists", "Renewal period specified"],
    },
    postconditions: {
      ar: ["تاريخ الانتهاء يتحدث", "الحالة: نشط"],
      en: ["End date updated", "Status: Active"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_subscription_manual_only", "inv_subscription_bonus_max", "inv_subscription_duration_max"],
  },
  {
    id: "action_send_reminder",
    action_name: { ar: "إرسال تذكير", en: "Send Reminder" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["المطعم قريب الانتهاء أو منتهي", "التذكير لم يُرسل لهذه المرحلة"],
      en: ["Restaurant near expiry or expired", "Reminder not sent for this stage"],
    },
    postconditions: {
      ar: ["الرسالة جاهزة للنسخ أو الإرسال اليدوي"],
      en: ["Message ready to copy or manual send"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_reminders_manual_only"],
  },
  {
    id: "action_toggle_restaurant_active",
    action_name: { ar: "تفعيل/تعطيل المطعم", en: "Toggle Restaurant Active" },
    allowed_roles: ["system_admin"],
    preconditions: {
      ar: ["المطعم موجود"],
      en: ["Restaurant exists"],
    },
    postconditions: {
      ar: ["حالة التفعيل تتغير", "يؤثر على وصول المطعم"],
      en: ["Active status changes", "Affects restaurant access"],
    },
    side_effects: { audit_log: true },
    related_invariants: ["inv_restaurant_inactive"],
  },
];

// ============================================
// 3. SCREENS REGISTRY
// ============================================

export interface ScreenEntry {
  id: string;
  screen_name: { ar: string; en: string };
  route: string;
  user_roles: UserRole[];
  main_actions: string[];
  common_states: { ar: string[]; en: string[] };
  common_confusions: { ar: string[]; en: string[] };
  related_actions: string[];
}

export const SCREENS_REGISTRY: ScreenEntry[] = [
  {
    id: "screen_pos_main",
    screen_name: { ar: "شاشة الكاشير", en: "Cashier POS" },
    route: "/pos",
    user_roles: ["cashier", "owner"],
    main_actions: ["action_create_order", "action_complete_payment", "action_hold_order", "action_send_to_kitchen"],
    common_states: {
      ar: ["لا يوجد طلب حالي", "طلب مفتوح", "طلب معلق", "في انتظار الدفع"],
      en: ["No current order", "Order open", "Order held", "Awaiting payment"],
    },
    common_confusions: {
      ar: [
        "ليش زر الدفع مش شغال؟",
        "وين راح الطلب؟",
        "كيف أرجع صنف؟",
        "ليش ما قدرت أعدل الطلب؟",
      ],
      en: [
        "Why is pay button disabled?",
        "Where did my order go?",
        "How to return an item?",
        "Why can't I edit the order?",
      ],
    },
    related_actions: ["action_create_order", "action_complete_payment", "action_hold_order", "action_resume_order", "action_void_order"],
  },
  {
    id: "screen_pos_tables",
    screen_name: { ar: "شاشة الطاولات", en: "Tables Screen" },
    route: "/pos",
    user_roles: ["cashier", "owner"],
    main_actions: ["action_create_order"],
    common_states: {
      ar: ["الطاولة فارغة", "الطاولة مشغولة", "طلبات متعددة على الطاولة"],
      en: ["Table empty", "Table occupied", "Multiple orders on table"],
    },
    common_confusions: {
      ar: [
        "ليش الطاولة تظهر مشغولة؟",
        "كيف أدمج طلبين على نفس الطاولة؟",
        "وين طلب الطاولة؟",
      ],
      en: [
        "Why does table show as occupied?",
        "How to merge orders on same table?",
        "Where is the table's order?",
      ],
    },
    related_actions: ["action_create_order"],
  },
  {
    id: "screen_pos_qr_orders",
    screen_name: { ar: "طلبات QR", en: "QR Orders" },
    route: "/pos",
    user_roles: ["cashier", "owner"],
    main_actions: ["action_accept_qr_order"],
    common_states: {
      ar: ["لا توجد طلبات QR", "طلبات معلقة"],
      en: ["No QR orders", "Pending orders"],
    },
    common_confusions: {
      ar: [
        "ليش ما شفت طلب QR؟",
        "الطلب راح على المطبخ لوحده؟",
        "ليش التاب مختفي؟",
      ],
      en: [
        "Why don't I see QR orders?",
        "Order went to kitchen automatically?",
        "Why is the tab hidden?",
      ],
    },
    related_actions: ["action_accept_qr_order", "action_send_to_kitchen"],
  },
  {
    id: "screen_kds",
    screen_name: { ar: "شاشة المطبخ (KDS)", en: "Kitchen Display (KDS)" },
    route: "/kds",
    user_roles: ["kitchen"],
    main_actions: [],
    common_states: {
      ar: ["لا توجد طلبات", "طلبات جديدة", "طلبات قيد التحضير", "طلبات جاهزة"],
      en: ["No orders", "New orders", "Preparing", "Ready"],
    },
    common_confusions: {
      ar: [
        "ليش ما وصل الطلب؟",
        "كيف أعلم الطلب جاهز؟",
        "الألوان شو معناها؟",
      ],
      en: [
        "Why didn't order arrive?",
        "How to mark order ready?",
        "What do colors mean?",
      ],
    },
    related_actions: ["action_send_to_kitchen"],
  },
  {
    id: "screen_owner_dashboard",
    screen_name: { ar: "لوحة التحكم", en: "Owner Dashboard" },
    route: "/admin",
    user_roles: ["owner"],
    main_actions: [],
    common_states: {
      ar: ["يوم عمل نشط", "لا توجد بيانات"],
      en: ["Active business day", "No data"],
    },
    common_confusions: {
      ar: [
        "شو يعني Gross و Net؟",
        "ليش الأرقام غريبة؟",
        "وين تقرير Z؟",
      ],
      en: [
        "What does Gross vs Net mean?",
        "Why are numbers off?",
        "Where is Z Report?",
      ],
    },
    related_actions: [],
  },
  {
    id: "screen_owner_overview",
    screen_name: { ar: "نظرة عامة", en: "Overview" },
    route: "/admin",
    user_roles: ["owner"],
    main_actions: [],
    common_states: {
      ar: ["ملخص اليوم متوفر", "لا توجد عروض نشطة", "عرض نشط", "عرض مجدول", "عرض منتهي"],
      en: ["Today summary available", "No active offers", "Active offer", "Scheduled offer", "Expired offer"],
    },
    common_confusions: {
      ar: [
        "شو هذا الكرت؟",
        "ليش العرض مش شغال؟",
        "متى ينتهي العرض؟",
        "هل لازم أعمل شيء؟",
        "شو يعني مجدول؟",
      ],
      en: [
        "What is this card?",
        "Why isn't the offer active?",
        "When does the offer end?",
        "Do I need to do anything?",
        "What does scheduled mean?",
      ],
    },
    related_actions: [],
  },
  {
    id: "screen_owner_inventory",
    screen_name: { ar: "إدارة المخزون", en: "Inventory Management" },
    route: "/admin",
    user_roles: ["owner"],
    main_actions: ["action_add_recipe", "action_inventory_deduction"],
    common_states: {
      ar: ["مخزون كافي", "نقص في بعض المواد", "فروقات موجودة"],
      en: ["Sufficient stock", "Low on some items", "Variance detected"],
    },
    common_confusions: {
      ar: [
        "ليش المخزون ما نقص؟",
        "كيف أضيف وصفة؟",
        "شو يعني الفروقات؟",
      ],
      en: [
        "Why didn't stock decrease?",
        "How to add a recipe?",
        "What does variance mean?",
      ],
    },
    related_actions: ["action_add_recipe", "action_inventory_deduction"],
  },
  {
    id: "screen_owner_recipes",
    screen_name: { ar: "الوصفات", en: "Recipes" },
    route: "/admin",
    user_roles: ["owner"],
    main_actions: ["action_add_recipe"],
    common_states: {
      ar: ["صنف بدون وصفة", "وصفة مكتملة"],
      en: ["Item without recipe", "Complete recipe"],
    },
    common_confusions: {
      ar: [
        "كيف أربط المادة الخام؟",
        "الوحدات مش واضحة",
        "الكمية بالضبط؟",
      ],
      en: [
        "How to link raw material?",
        "Units are confusing",
        "Exact quantity?",
      ],
    },
    related_actions: ["action_add_recipe"],
  },
  {
    id: "screen_shifts",
    screen_name: { ar: "الورديات", en: "Shifts" },
    route: "/pos",
    user_roles: ["cashier", "owner"],
    main_actions: ["action_open_shift", "action_close_shift"],
    common_states: {
      ar: ["لا توجد وردية", "وردية مفتوحة", "وردية مغلقة"],
      en: ["No shift", "Shift open", "Shift closed"],
    },
    common_confusions: {
      ar: [
        "ليش ما قدرت أفتح وردية؟",
        "ليش في فرق بالصندوق؟",
        "كيف أطلع تقرير Z؟",
      ],
      en: [
        "Why can't I open shift?",
        "Why is there a drawer difference?",
        "How to get Z Report?",
      ],
    },
    related_actions: ["action_open_shift", "action_close_shift"],
  },
  {
    id: "screen_system_admin",
    screen_name: { ar: "إدارة النظام", en: "System Administration" },
    route: "/admin",
    user_roles: ["system_admin"],
    main_actions: ["action_create_restaurant", "action_create_owner", "action_assign_owner", "action_renew_subscription", "action_send_reminder", "action_toggle_restaurant_active"],
    common_states: {
      ar: ["مطاعم نشطة", "مطاعم منتهية الاشتراك", "مطاعم غير مكتملة", "اشتراكات قريبة الانتهاء"],
      en: ["Active restaurants", "Expired subscription restaurants", "Incomplete restaurants", "Near-expiry subscriptions"],
    },
    common_confusions: {
      ar: [
        "شو الفرق بين منتهي وغير مكتمل؟",
        "كيف أجدد الاشتراك؟",
        "ليش المطعم مش شغال؟",
        "كيف أرسل تذكير؟",
        "شو تعني الألوان؟",
        "كيف أغير صاحب المطعم؟",
        "شو الشهور الإضافية؟",
      ],
      en: [
        "What's the difference between expired and incomplete?",
        "How to renew subscription?",
        "Why is restaurant not working?",
        "How to send reminder?",
        "What do colors mean?",
        "How to change restaurant owner?",
        "What are bonus months?",
      ],
    },
    related_actions: ["action_create_restaurant", "action_create_owner", "action_assign_owner", "action_renew_subscription", "action_send_reminder", "action_toggle_restaurant_active"],
  },
];

// ============================================
// 4. FLOW DIAGNOSTIC PACKS
// ============================================

export interface FlowDiagnostic {
  id: string;
  flow_name: { ar: string; en: string };
  expected_sequence: string[];
  common_failure_points: { ar: string[]; en: string[] };
  diagnostic_questions: { ar: string[]; en: string[] };
  most_likely_causes: { ar: string[]; en: string[] };
  related_invariants: string[];
}

export const FLOW_DIAGNOSTICS: FlowDiagnostic[] = [
  {
    id: "flow_qr_to_kds",
    flow_name: { ar: "QR → قبول → المطبخ", en: "QR Order → Accept → KDS" },
    expected_sequence: [
      "Customer submits QR order (status: PENDING)",
      "Cashier sees order in QR Orders tab",
      "Cashier clicks Accept",
      "Status changes to OPEN",
      "Items auto-sent to KDS",
      "KDS displays order",
    ],
    common_failure_points: {
      ar: [
        "طلب QR لا يظهر في التاب",
        "الطلب لا يصل للمطبخ بعد القبول",
        "تاب QR غير موجود",
      ],
      en: [
        "QR order not appearing in tab",
        "Order not reaching KDS after accept",
        "QR tab not visible",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل إضافة QR مفعلة في إعدادات المطعم؟",
        "هل الوردية مفتوحة؟",
        "هل KDS مفعل؟",
        "هل الطلب يظهر بحالة PENDING؟",
      ],
      en: [
        "Is QR add-on enabled in restaurant settings?",
        "Is shift open?",
        "Is KDS enabled?",
        "Does order show as PENDING?",
      ],
    },
    most_likely_causes: {
      ar: [
        "إضافة QR غير مفعلة",
        "الوردية مغلقة",
        "KDS غير مفعل",
        "الفرع غير صحيح",
      ],
      en: [
        "QR add-on disabled",
        "Shift is closed",
        "KDS is disabled",
        "Wrong branch selected",
      ],
    },
    related_invariants: ["inv_qr_module_check", "inv_qr_accept_auto_kitchen", "inv_kds_module_check"],
  },
  {
    id: "flow_hold_resume_payment",
    flow_name: { ar: "تعليق → استئناف → دفع", en: "Hold → Resume → Payment" },
    expected_sequence: [
      "Cashier holds order (status: HELD)",
      "Order appears in Held Orders list",
      "Cashier clicks Resume",
      "Status changes to OPEN",
      "Cashier completes payment",
      "Status changes to PAID/CLOSED",
    ],
    common_failure_points: {
      ar: [
        "لا يمكن الدفع للطلب المعلق",
        "الطلب اختفى",
        "لا يمكن استئناف الطلب",
      ],
      en: [
        "Cannot pay for held order",
        "Order disappeared",
        "Cannot resume order",
      ],
    },
    diagnostic_questions: {
      ar: [
        "ما هي حالة الطلب الحالية؟",
        "هل ضغطت على 'استئناف' أولاً؟",
        "هل الوردية مفتوحة؟",
      ],
      en: [
        "What is the current order status?",
        "Did you click 'Resume' first?",
        "Is shift open?",
      ],
    },
    most_likely_causes: {
      ar: [
        "محاولة الدفع بدون استئناف",
        "الوردية مغلقة",
        "الطلب أُلغي من قبل آخر",
      ],
      en: [
        "Attempting to pay without resuming",
        "Shift is closed",
        "Order was voided by another user",
      ],
    },
    related_invariants: ["inv_order_hold_no_pay", "inv_payment_shift_required"],
  },
  {
    id: "flow_payment_receipt_zreport",
    flow_name: { ar: "دفع → إيصال → تقرير Z", en: "Payment → Receipt → Z Report" },
    expected_sequence: [
      "Cashier selects payment method",
      "Enters received amount",
      "Clicks Confirm",
      "Payment record created",
      "Order status: PAID/CLOSED",
      "Inventory deducted (if enabled)",
      "Receipt available",
      "Appears in Z Report on shift close",
    ],
    common_failure_points: {
      ar: [
        "زر الدفع معطل",
        "المخزون لم يُخصم",
        "الطلب لا يظهر في تقرير Z",
      ],
      en: [
        "Pay button disabled",
        "Inventory not deducted",
        "Order not appearing in Z Report",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل الطلب يحتوي على أصناف؟",
        "هل الطلب بحالة OPEN (ليس HELD)؟",
        "هل الوردية مفتوحة؟",
        "هل للصنف وصفة (للمخزون)؟",
      ],
      en: [
        "Does order have items?",
        "Is order status OPEN (not HELD)?",
        "Is shift open?",
        "Does item have recipe (for inventory)?",
      ],
    },
    most_likely_causes: {
      ar: [
        "الطلب فارغ",
        "الطلب معلق",
        "الوردية مغلقة",
        "الصنف بدون وصفة",
      ],
      en: [
        "Order is empty",
        "Order is held",
        "Shift is closed",
        "Item has no recipe",
      ],
    },
    related_invariants: ["inv_order_empty_no_pay", "inv_order_hold_no_pay", "inv_payment_shift_required", "inv_recipe_required_deduction"],
  },
  {
    id: "flow_refund",
    flow_name: { ar: "عملية المرتجع", en: "Refund Flow" },
    expected_sequence: [
      "Locate closed/paid order",
      "Click Refund",
      "Enter amount and reason",
      "Confirm refund",
      "Refund record created",
      "Subtracted from sales",
    ],
    common_failure_points: {
      ar: [
        "خيار المرتجع غير ظاهر",
        "لا يمكن استرداد المبلغ",
        "الطلب غير موجود",
      ],
      en: [
        "Refund option not visible",
        "Cannot process refund amount",
        "Order not found",
      ],
    },
    diagnostic_questions: {
      ar: [
        "ما هي حالة الطلب؟",
        "هل الطلب مغلق/مدفوع؟",
        "هل المبلغ المطلوب أقل من قيمة الطلب؟",
      ],
      en: [
        "What is the order status?",
        "Is order closed/paid?",
        "Is requested amount less than order value?",
      ],
    },
    most_likely_causes: {
      ar: [
        "الطلب لا يزال مفتوحاً (استخدم الإلغاء)",
        "المبلغ يتجاوز قيمة الطلب",
        "الوردية مغلقة",
      ],
      en: [
        "Order is still open (use Void instead)",
        "Amount exceeds order value",
        "Shift is closed",
      ],
    },
    related_invariants: ["inv_order_void_vs_refund", "inv_refund_max_limit", "inv_refund_subtract_sales"],
  },
  {
    id: "flow_inventory_deduction",
    flow_name: { ar: "خصم المخزون عبر الوصفة", en: "Inventory Deduction via Recipe" },
    expected_sequence: [
      "Menu item has recipe",
      "Recipe links to inventory items",
      "Order with menu item is paid",
      "System calculates quantities",
      "Inventory items deducted",
      "Transaction logged",
    ],
    common_failure_points: {
      ar: [
        "المخزون لم ينقص بعد البيع",
        "الكمية المخصومة غير صحيحة",
        "لا يوجد سجل للمعاملة",
      ],
      en: [
        "Inventory not decreasing after sale",
        "Deducted quantity incorrect",
        "No transaction record",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل المخزون مفعل في الإعدادات؟",
        "هل للصنف وصفة؟",
        "هل الوصفة تحتوي على المواد الصحيحة؟",
        "هل الوحدات صحيحة؟",
      ],
      en: [
        "Is inventory enabled in settings?",
        "Does the item have a recipe?",
        "Does recipe contain correct materials?",
        "Are units correct?",
      ],
    },
    most_likely_causes: {
      ar: [
        "المخزون غير مفعل",
        "الصنف بدون وصفة",
        "الوصفة فارغة أو غير مكتملة",
        "خطأ في الوحدات",
      ],
      en: [
        "Inventory is disabled",
        "Item has no recipe",
        "Recipe is empty or incomplete",
        "Unit conversion error",
      ],
    },
    related_invariants: ["inv_inventory_module_check", "inv_recipe_required_deduction"],
  },
  {
    id: "flow_shift_open_close",
    flow_name: { ar: "فتح / إغلاق الوردية", en: "Shift Open / Close" },
    expected_sequence: [
      "Enter opening amount",
      "Click Open Shift",
      "Shift status: OPEN",
      "Process orders during shift",
      "Click Close Shift",
      "Enter actual drawer amount",
      "Confirm close",
      "Z Report generated",
    ],
    common_failure_points: {
      ar: [
        "لا يمكن فتح وردية",
        "لا يمكن إغلاق الوردية",
        "فرق في الصندوق",
      ],
      en: [
        "Cannot open shift",
        "Cannot close shift",
        "Drawer difference",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل توجد وردية مفتوحة مسبقاً؟",
        "هل توجد طلبات مفتوحة؟",
        "هل أدخلت المبلغ الافتتاحي/الفعلي؟",
      ],
      en: [
        "Is there an existing open shift?",
        "Are there any open orders?",
        "Did you enter opening/actual amount?",
      ],
    },
    most_likely_causes: {
      ar: [
        "وردية سابقة لم تُغلق",
        "طلبات مفتوحة تمنع الإغلاق",
        "الفرق بسبب عمليات نقدية غير مسجلة",
      ],
      en: [
        "Previous shift not closed",
        "Open orders blocking close",
        "Difference due to unrecorded cash movements",
      ],
    },
    related_invariants: ["inv_shift_one_active", "inv_shift_close_open_orders"],
  },
  // === SYSTEM ADMIN FLOWS ===
  {
    id: "flow_create_restaurant_full",
    flow_name: { ar: "إنشاء مطعم كامل", en: "Full Restaurant Creation" },
    expected_sequence: [
      "Create restaurant (name, logo, subscription)",
      "Restaurant created with status: Incomplete",
      "Create owner account (email, password)",
      "Assign owner to restaurant",
      "Restaurant status: Ready",
    ],
    common_failure_points: {
      ar: [
        "المطعم يظهر 'غير مكتمل'",
        "صاحب المطعم لا يستطيع الدخول",
        "الاشتراك لم يُنشأ",
      ],
      en: [
        "Restaurant shows 'Incomplete'",
        "Owner cannot login",
        "Subscription not created",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل تم إنشاء صاحب المطعم؟",
        "هل تم ربط المالك بالمطعم؟",
        "هل تم تحديد مدة الاشتراك؟",
      ],
      en: [
        "Was owner account created?",
        "Was owner assigned to restaurant?",
        "Was subscription period specified?",
      ],
    },
    most_likely_causes: {
      ar: [
        "لم يتم إنشاء صاحب المطعم",
        "لم يتم ربط المالك",
        "نسيت تحديد الاشتراك",
      ],
      en: [
        "Owner account not created",
        "Owner not assigned",
        "Forgot to specify subscription",
      ],
    },
    related_invariants: ["inv_owner_assignment_admin_only"],
  },
  {
    id: "flow_subscription_renewal",
    flow_name: { ar: "تجديد الاشتراك", en: "Subscription Renewal" },
    expected_sequence: [
      "Find restaurant in list",
      "Click renew subscription",
      "Select duration (1-12 months)",
      "Optional: Add bonus months (max 3)",
      "Optional: Set custom start date",
      "Confirm renewal",
      "Subscription updated",
    ],
    common_failure_points: {
      ar: [
        "التجديد لم يعمل",
        "تاريخ الانتهاء خاطئ",
        "الشهور الإضافية لم تُضاف",
      ],
      en: [
        "Renewal didn't work",
        "End date is wrong",
        "Bonus months not added",
      ],
    },
    diagnostic_questions: {
      ar: [
        "ما هي المدة المختارة؟",
        "ما هو تاريخ البدء؟",
        "هل أضفت شهور إضافية؟",
      ],
      en: [
        "What duration was selected?",
        "What is the start date?",
        "Did you add bonus months?",
      ],
    },
    most_likely_causes: {
      ar: [
        "تاريخ البدء غير صحيح",
        "الشهور الإضافية تجاوزت الحد (3)",
        "خطأ في الحساب",
      ],
      en: [
        "Wrong start date",
        "Bonus months exceeded limit (3)",
        "Calculation error",
      ],
    },
    related_invariants: ["inv_subscription_manual_only", "inv_subscription_bonus_max", "inv_subscription_duration_max"],
  },
  {
    id: "flow_send_reminder",
    flow_name: { ar: "إرسال تذكير تجديد", en: "Send Renewal Reminder" },
    expected_sequence: [
      "Find restaurant with expiring/expired subscription",
      "Open reminder dialog",
      "Select reminder stage (7 days, 1 day, expired)",
      "Copy WhatsApp message OR send email",
      "Send manually",
      "Reminder marked as sent",
    ],
    common_failure_points: {
      ar: [
        "لا يمكن إرسال التذكير",
        "الرسالة لم تُرسل",
        "التذكير مرسل مسبقاً",
      ],
      en: [
        "Cannot send reminder",
        "Message not sent",
        "Reminder already sent",
      ],
    },
    diagnostic_questions: {
      ar: [
        "هل التذكير أُرسل لهذه المرحلة من قبل؟",
        "هل رقم الهاتف موجود؟",
        "هل البريد الإلكتروني موجود؟",
      ],
      en: [
        "Was reminder sent for this stage before?",
        "Is phone number available?",
        "Is email available?",
      ],
    },
    most_likely_causes: {
      ar: [
        "التذكير أُرسل مسبقاً",
        "لا يوجد رقم هاتف للمالك",
        "خطأ في إعدادات البريد",
      ],
      en: [
        "Reminder already sent",
        "No owner phone number",
        "Email configuration error",
      ],
    },
    related_invariants: ["inv_reminders_manual_only"],
  },
];

// ============================================
// 5. ASSISTANT REASONING RULES
// ============================================

export interface ReasoningRule {
  id: string;
  rule: { ar: string; en: string };
  priority: number;
  applies_to: ("troubleshoot" | "explain" | "how_to" | "all")[];
}

export const ASSISTANT_REASONING_RULES: ReasoningRule[] = [
  {
    id: "rule_check_invariants_first",
    rule: {
      ar: "لا تجب على 'ليش X مش شغال' بدون التحقق من SYSTEM_INVARIANTS أولاً.",
      en: "Never answer 'why is X not working' without checking SYSTEM_INVARIANTS first.",
    },
    priority: 1,
    applies_to: ["troubleshoot"],
  },
  {
    id: "rule_diagnose_before_explain",
    rule: {
      ar: "تشخيص الحالة أولوية على شرح الميزة.",
      en: "Prefer diagnosing state before explaining features.",
    },
    priority: 2,
    applies_to: ["troubleshoot", "explain"],
  },
  {
    id: "rule_use_flow_diagnostics",
    rule: {
      ar: "استخدم FLOW_DIAGNOSTICS عندما ينكسر سير العمل.",
      en: "Use FLOW_DIAGNOSTICS when a workflow breaks.",
    },
    priority: 3,
    applies_to: ["troubleshoot"],
  },
  {
    id: "rule_ground_in_actions",
    rule: {
      ar: "اربط التوضيحات بـ ACTIONS_REGISTRY والمتطلبات المسبقة.",
      en: "Ground explanations in ACTIONS_REGISTRY and preconditions.",
    },
    priority: 4,
    applies_to: ["explain", "how_to"],
  },
  {
    id: "rule_minimal_clarification",
    rule: {
      ar: "إذا كانت البيانات ناقصة، اسأل السؤال التوضيحي الأدنى.",
      en: "If data is missing, ask the minimum clarifying question.",
    },
    priority: 5,
    applies_to: ["troubleshoot"],
  },
  {
    id: "rule_session_memory",
    rule: {
      ar: "استخدم ذاكرة الجلسة للأسئلة المتابعة بدون سياق.",
      en: "Use session memory for context-less follow-up questions.",
    },
    priority: 6,
    applies_to: ["all"],
  },
  {
    id: "rule_no_guess",
    rule: {
      ar: "لا تخمن. إذا لم تعرف الحالة، اسأل.",
      en: "Do not guess. If state is unknown, ask.",
    },
    priority: 7,
    applies_to: ["troubleshoot"],
  },
  {
    id: "rule_route_to_trainer",
    rule: {
      ar: "للأسئلة التفصيلية، أعط ملخصاً ثم وجّه للمدرب.",
      en: "For detailed questions, give summary then route to Trainer.",
    },
    priority: 8,
    applies_to: ["explain", "how_to"],
  },
];

// ============================================
// 6. ARABIC MARKET INTELLIGENCE
// ============================================

export interface ArabicPhraseMeaning {
  phrase: string;
  variants: string[];
  intent: string;
  category: "troubleshoot" | "how_to" | "what_is" | "state_query";
  diagnostic_action?: string;
}

export const ARABIC_MARKET_CONTEXT: ArabicPhraseMeaning[] = [
  // === Recipe vs Description ===
  {
    phrase: "وصفة",
    variants: ["وصفه", "مكونات", "خلطة", "خلطات"],
    intent: "recipes",
    category: "how_to",
  },
  {
    phrase: "وصف",
    variants: ["وصف الصنف", "وصف المنتج"],
    intent: "item_description",
    category: "how_to",
  },

  // === Troubleshooting Phrases ===
  {
    phrase: "ليش الزر مش شغال",
    variants: ["الزر معطل", "الزر رمادي", "ما يشتغل", "مو شغال", "مش راضي يشتغل"],
    intent: "troubleshoot_button_disabled",
    category: "troubleshoot",
    diagnostic_action: "Check SYSTEM_INVARIANTS for blocking rules",
  },
  {
    phrase: "ما راح على المطبخ",
    variants: ["ما وصل للمطبخ", "ما طلع في المطبخ", "المطبخ ما شاف الطلب"],
    intent: "troubleshoot_kds_not_received",
    category: "troubleshoot",
    diagnostic_action: "Use flow_qr_to_kds diagnostic",
  },
  {
    phrase: "ليش ما قدرت أدفع",
    variants: ["الدفع ما اشتغل", "ما يخليني أدفع", "زر الدفع مش شغال"],
    intent: "troubleshoot_payment_blocked",
    category: "troubleshoot",
    diagnostic_action: "Check inv_payment_shift_required, inv_order_hold_no_pay, inv_order_empty_no_pay",
  },
  {
    phrase: "الطلب اختفى",
    variants: ["وين راح الطلب", "ما لاقي الطلب", "الطلب ضاع"],
    intent: "troubleshoot_order_missing",
    category: "troubleshoot",
    diagnostic_action: "Check order status (HELD, VOIDED, CANCELLED)",
  },
  {
    phrase: "فرق بالصندوق",
    variants: ["الصندوق ناقص", "الصندوق زايد", "الحساب مش مضبوط"],
    intent: "troubleshoot_drawer_difference",
    category: "troubleshoot",
    diagnostic_action: "Review cash movements and shift transactions",
  },

  // === State Queries ===
  {
    phrase: "هل الوردية مفتوحة",
    variants: ["الوردية شغالة", "في وردية", "الشفت مفتوح"],
    intent: "state_query_shift",
    category: "state_query",
  },
  {
    phrase: "هل المخزون مفعل",
    variants: ["المخزون شغال", "الجرد فعال"],
    intent: "state_query_inventory",
    category: "state_query",
  },

  // === How-To Phrases ===
  {
    phrase: "كيف أعمل مرتجع",
    variants: ["طريقة المرتجع", "كيف أرجع فلوس", "ردية"],
    intent: "how_to_refund",
    category: "how_to",
  },
  {
    phrase: "كيف أفتح وردية",
    variants: ["طريقة فتح الشفت", "فتح وردية جديدة"],
    intent: "how_to_open_shift",
    category: "how_to",
  },
  {
    phrase: "كيف أغلق الوردية",
    variants: ["إغلاق الشفت", "أقفل الوردية"],
    intent: "how_to_close_shift",
    category: "how_to",
  },
  {
    phrase: "كيف أعلق الطلب",
    variants: ["تعليق الطلب", "هولد"],
    intent: "how_to_hold_order",
    category: "how_to",
  },
  {
    phrase: "كيف أدمج طلبين",
    variants: ["دمج الطلبات", "جمع الطلبات"],
    intent: "how_to_merge_orders",
    category: "how_to",
  },

  // === System Admin Phrases ===
  {
    phrase: "شو الفرق بين منتهي وغير مكتمل",
    variants: ["منتهي وغير مكتمل", "الفرق بين الحالات", "شو يعني غير مكتمل"],
    intent: "explain_subscription_statuses",
    category: "what_is",
    diagnostic_action: "Explain: expired = subscription ended, incomplete = missing owner or settings",
  },
  {
    phrase: "ليش المطعم مش شغال",
    variants: ["المطعم معطل", "لا يعمل", "المطعم متوقف"],
    intent: "troubleshoot_restaurant_blocked",
    category: "troubleshoot",
    diagnostic_action: "Check inv_restaurant_inactive, inv_subscription_expired",
  },
  {
    phrase: "كيف أجدد الاشتراك",
    variants: ["تجديد الاشتراك", "تمديد الاشتراك", "طريقة التجديد"],
    intent: "how_to_renew_subscription",
    category: "how_to",
  },
  {
    phrase: "شو الشهور الإضافية",
    variants: ["bonus months", "شهور مجانية", "شهور هدية"],
    intent: "explain_bonus_months",
    category: "what_is",
    diagnostic_action: "Explain: max 3 months, added to end date only",
  },
  {
    phrase: "كيف أرسل تذكير",
    variants: ["إرسال تذكير", "تنبيه التجديد", "رسالة تذكير"],
    intent: "how_to_send_reminder",
    category: "how_to",
  },
  {
    phrase: "كيف أغير صاحب المطعم",
    variants: ["تغيير المالك", "نقل الملكية", "تعيين مالك جديد"],
    intent: "how_to_change_owner",
    category: "how_to",
  },
  {
    phrase: "شو تعني الألوان",
    variants: ["ألوان الشارات", "اللون الأخضر", "اللون الأحمر", "اللون البرتقالي"],
    intent: "explain_status_colors",
    category: "what_is",
    diagnostic_action: "Explain: green=healthy, orange=attention, red=blocked",
  },
  {
    phrase: "ليش التذكير ما اتبعت",
    variants: ["التذكير لم يُرسل", "الرسالة ما راحت"],
    intent: "troubleshoot_reminder_failed",
    category: "troubleshoot",
    diagnostic_action: "Check inv_reminders_manual_only - reminders are not automatic",
  },
  {
    phrase: "كيف أبدل بين المطاعم",
    variants: ["تبديل المطعم", "اختيار مطعم آخر", "التنقل بين المطاعم"],
    intent: "how_to_switch_restaurant",
    category: "how_to",
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get applicable invariants for a given category
 */
export function getInvariantsByCategory(category: SystemInvariant["category"]): SystemInvariant[] {
  return SYSTEM_INVARIANTS.filter(inv => inv.category === category);
}

/**
 * Get action entry by ID
 */
export function getActionById(actionId: string): ActionEntry | undefined {
  return ACTIONS_REGISTRY.find(action => action.id === actionId);
}

/**
 * Get screen entry by ID
 */
export function getScreenById(screenId: string): ScreenEntry | undefined {
  return SCREENS_REGISTRY.find(screen => screen.id === screenId);
}

/**
 * Get flow diagnostic by ID
 */
export function getFlowDiagnosticById(flowId: string): FlowDiagnostic | undefined {
  return FLOW_DIAGNOSTICS.find(flow => flow.id === flowId);
}

/**
 * Find Arabic phrase meaning
 */
export function findArabicPhraseMeaning(message: string): ArabicPhraseMeaning | undefined {
  const lowerMessage = message.toLowerCase();
  
  return ARABIC_MARKET_CONTEXT.find(phrase => {
    if (lowerMessage.includes(phrase.phrase)) return true;
    return phrase.variants.some(v => lowerMessage.includes(v));
  });
}

/**
 * Get blocking invariants that might explain why an action failed
 */
export function getBlockingInvariants(actionId: string): SystemInvariant[] {
  const action = getActionById(actionId);
  if (!action) return [];
  
  return SYSTEM_INVARIANTS.filter(inv => 
    action.related_invariants.includes(inv.id) && inv.severity === "blocking"
  );
}

/**
 * Get diagnostic questions for a flow
 */
export function getDiagnosticQuestions(flowId: string, language: "ar" | "en"): string[] {
  const flow = getFlowDiagnosticById(flowId);
  return flow?.diagnostic_questions[language] || [];
}

/**
 * Get most likely causes for a flow failure
 */
export function getMostLikelyCauses(flowId: string, language: "ar" | "en"): string[] {
  const flow = getFlowDiagnosticById(flowId);
  return flow?.most_likely_causes[language] || [];
}
