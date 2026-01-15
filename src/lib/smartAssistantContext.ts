/**
 * Smart Assistant Lite V1 - Context Detection
 * Detects current context based on route and application state
 * Read-only - no tracking or logging
 */

export type ScreenContext = 
  | "pos_main"
  | "pos_tables"
  | "pos_open_orders"
  | "pos_qr_pending"
  | "owner_dashboard"
  | "owner_menu"
  | "owner_staff"
  | "owner_inventory"
  | "owner_reports"
  | "owner_settings"
  | "kds"
  | "login"
  | "unknown";

export interface ContextHint {
  title: { ar: string; en: string };
  description: { ar: string; en: string };
}

// Screen-specific contextual hints
const CONTEXT_HINTS: Record<ScreenContext, ContextHint> = {
  pos_main: {
    title: { ar: "إنشاء طلب", en: "Create Order" },
    description: { 
      ar: "اختر الأصناف من القائمة لإضافتها للطلب. اضغط Enter للدفع أو H للتعليق.",
      en: "Select items from the menu to add to the order. Press Enter to pay or H to hold."
    }
  },
  pos_tables: {
    title: { ar: "إدارة الطاولات", en: "Table Management" },
    description: { 
      ar: "اضغط على طاولة لعرض الطلبات المرتبطة بها أو إنشاء طلب جديد.",
      en: "Click a table to view associated orders or create a new order."
    }
  },
  pos_open_orders: {
    title: { ar: "الطلبات المفتوحة", en: "Open Orders" },
    description: { 
      ar: "عرض جميع الطلبات النشطة. اضغط على طلب لاستئنافه.",
      en: "View all active orders. Click an order to resume it."
    }
  },
  pos_qr_pending: {
    title: { ar: "طلبات QR", en: "QR Orders" },
    description: { 
      ar: "طلبات واردة من العملاء عبر QR. راجعها وأكدها أو ارفضها.",
      en: "Orders from customers via QR. Review and confirm or reject."
    }
  },
  owner_dashboard: {
    title: { ar: "لوحة التحكم", en: "Dashboard" },
    description: { 
      ar: "نظرة عامة على أداء المطعم. استخدم القائمة الجانبية للتنقل.",
      en: "Overview of restaurant performance. Use sidebar to navigate."
    }
  },
  owner_menu: {
    title: { ar: "إدارة القائمة", en: "Menu Management" },
    description: { 
      ar: "أضف أو عدل الأصناف والتصنيفات والأسعار.",
      en: "Add or edit items, categories, and prices."
    }
  },
  owner_staff: {
    title: { ar: "إدارة الموظفين", en: "Staff Management" },
    description: { 
      ar: "أضف موظفين جدد أو عدل صلاحياتهم.",
      en: "Add new staff or modify their permissions."
    }
  },
  owner_inventory: {
    title: { ar: "إدارة المخزون", en: "Inventory Management" },
    description: { 
      ar: "تتبع المخزون، استلم البضائع، وراقب مستويات المواد.",
      en: "Track stock, receive goods, and monitor item levels."
    }
  },
  owner_reports: {
    title: { ar: "التقارير", en: "Reports" },
    description: { 
      ar: "عرض تقارير المبيعات والأداء والتحليلات.",
      en: "View sales, performance, and analytics reports."
    }
  },
  owner_settings: {
    title: { ar: "الإعدادات", en: "Settings" },
    description: { 
      ar: "تعديل إعدادات المطعم والضرائب والعملة وساعات العمل.",
      en: "Modify restaurant settings, tax, currency, and business hours."
    }
  },
  kds: {
    title: { ar: "شاشة المطبخ", en: "Kitchen Display" },
    description: { 
      ar: "الطلبات الواردة للتحضير. اضغط لتغيير الحالة.",
      en: "Incoming orders for preparation. Click to change status."
    }
  },
  login: {
    title: { ar: "تسجيل الدخول", en: "Login" },
    description: { 
      ar: "أدخل بيانات الدخول للمتابعة.",
      en: "Enter your credentials to continue."
    }
  },
  unknown: {
    title: { ar: "Kastana POS", en: "Kastana POS" },
    description: { 
      ar: "نظام نقاط البيع الذكي.",
      en: "Smart Point of Sale System."
    }
  }
};

/**
 * Detect screen context from current pathname
 */
export function detectScreenContext(pathname: string): ScreenContext {
  if (pathname === "/pos") return "pos_main";
  if (pathname === "/kds") return "kds";
  if (pathname === "/login") return "login";
  if (pathname === "/admin") return "owner_dashboard";
  if (pathname.startsWith("/menu/")) return "unknown"; // Customer menu - assistant not shown
  
  return "unknown";
}

/**
 * Detect more specific POS tab context
 */
export function detectPOSTabContext(activeTab: string): ScreenContext {
  switch (activeTab) {
    case "new-order":
      return "pos_main";
    case "tables":
      return "pos_tables";
    case "open-orders":
      return "pos_open_orders";
    case "qr-pending":
      return "pos_qr_pending";
    default:
      return "pos_main";
  }
}

/**
 * Get contextual hint for current screen
 */
export function getContextHint(context: ScreenContext): ContextHint {
  return CONTEXT_HINTS[context] || CONTEXT_HINTS.unknown;
}

/**
 * Check if assistant should be visible on this route
 */
export function shouldShowAssistant(pathname: string): boolean {
  // Show on POS, KDS, and Owner admin screens
  const validPaths = ["/pos", "/kds", "/admin", "/system-admin"];
  return validPaths.some(path => pathname.startsWith(path));
}
