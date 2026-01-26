/**
 * Unified System Error Handler
 * 
 * Provides user-friendly, bilingual (AR/EN) error messages as toast notifications.
 * Covers: Login, POS (Cashier), Owner Dashboard, and general system errors.
 * NEVER shows raw error.message, SQL, RLS wording, or stack traces to users.
 */

import { toast } from "@/hooks/use-toast";

export interface SystemErrorResult {
  title: string;
  description: string;
  action?: string;
}

/**
 * Error patterns for detection
 */
const ERROR_PATTERNS = {
  // Authentication errors
  INVALID_CREDENTIALS: /invalid.*credentials|invalid.*login|wrong.*password|incorrect.*password/i,
  SESSION_EXPIRED: /session.*expired|jwt.*expired|token.*expired|refresh.*failed/i,
  EMAIL_NOT_CONFIRMED: /email.*not.*confirmed|verify.*email/i,
  USER_NOT_FOUND: /user.*not.*found|no.*user/i,
  WEAK_PASSWORD: /weak.*password|password.*too.*short|password.*requirements/i,
  EMAIL_TAKEN: /email.*registered|email.*taken|already.*exists.*email|duplicate.*email/i,
  INVALID_EMAIL: /invalid.*email|email.*format/i,
  
  // Permission / RLS errors
  PERMISSION_DENIED: /policy|rls|denied|permission|not.*allowed|unauthorized|access.*denied|forbidden|403/i,
  
  // Order / Payment errors
  ORDER_NOT_OPEN: /order.*not.*open|status.*paid|status.*held|status.*cancelled|status.*voided/i,
  ORDER_ALREADY_PAID: /already.*paid|duplicate|possible.*duplicate/i,
  ORDER_HELD: /status.*held|order.*held/i,
  UNDERPAYMENT: /payment.*less.*than|underpay/i,
  CARD_OVERPAY: /card.*exact|no.*overpay/i,
  RESTAURANT_INACTIVE: /restaurant.*not.*active|restaurant.*inactive|deactivated/i,
  SUBSCRIPTION_EXPIRED: /subscription.*expired|subscription.*inactive/i,
  
  // Inventory errors
  INSUFFICIENT_STOCK: /insufficient.*stock|not.*enough|out.*of.*stock/i,
  RECIPE_INVALID: /recipe.*invalid|no.*recipe|empty.*recipe/i,
  UNIT_MISMATCH: /unit.*mismatch|conversion.*error/i,
  
  // Shift errors
  NO_OPEN_SHIFT: /no.*open.*shift|shift.*not.*found|open.*shift.*first/i,
  SHIFT_ALREADY_OPEN: /shift.*already.*open|duplicate.*shift/i,
  OPEN_ORDERS_EXIST: /open.*orders|close.*orders.*first|pending.*orders/i,
  
  // Data errors
  DUPLICATE: /duplicate.*key|already.*exists|unique.*constraint/i,
  NOT_FOUND: /not.*found|no.*rows|does.*not.*exist/i,
  VALIDATION_ERROR: /validation|invalid.*format|required.*field|missing.*field/i,
  
  // Branch errors
  ACTIVE_CASHIERS: /active.*cashiers|cashiers.*active/i,
  OPEN_SHIFTS: /open.*shifts|shifts.*open/i,
  
  // Network / Technical errors
  NETWORK_ERROR: /network|failed.*to.*fetch|connection|timeout|econnrefused|offline|load.*failed/i,
  SERVER_ERROR: /500|internal.*server|server.*error/i,
};

/**
 * Bilingual error messages
 */
const ERROR_MESSAGES: Record<string, { ar: { title: string; description: string; action?: string }; en: { title: string; description: string; action?: string } }> = {
  // Authentication
  INVALID_CREDENTIALS: {
    ar: { title: "فشل تسجيل الدخول", description: "البريد الإلكتروني أو كلمة المرور غير صحيحة." },
    en: { title: "Login Failed", description: "Invalid email or password. Please try again." }
  },
  SESSION_EXPIRED: {
    ar: { title: "انتهت الجلسة", description: "يرجى تسجيل الدخول مرة أخرى.", action: "تسجيل الدخول" },
    en: { title: "Session Expired", description: "Please sign in again.", action: "Sign In" }
  },
  EMAIL_NOT_CONFIRMED: {
    ar: { title: "تحقق من البريد الإلكتروني", description: "يرجى تأكيد بريدك الإلكتروني قبل تسجيل الدخول." },
    en: { title: "Verify Email", description: "Please confirm your email before signing in." }
  },
  USER_NOT_FOUND: {
    ar: { title: "المستخدم غير موجود", description: "لم يتم العثور على حساب بهذا البريد الإلكتروني." },
    en: { title: "User Not Found", description: "No account found with this email." }
  },
  WEAK_PASSWORD: {
    ar: { title: "كلمة المرور ضعيفة", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." },
    en: { title: "Weak Password", description: "Password must be at least 6 characters." }
  },
  EMAIL_TAKEN: {
    ar: { title: "البريد مستخدم", description: "هذا البريد الإلكتروني مسجل مسبقاً." },
    en: { title: "Email Taken", description: "This email is already registered." }
  },
  INVALID_EMAIL: {
    ar: { title: "بريد غير صالح", description: "يرجى إدخال بريد إلكتروني صحيح." },
    en: { title: "Invalid Email", description: "Please enter a valid email address." }
  },
  
  // Permission
  PERMISSION_DENIED: {
    ar: { title: "الإجراء غير مسموح", description: "ليس لديك صلاحية لتنفيذ هذا الإجراء." },
    en: { title: "Action Not Allowed", description: "You don't have permission to perform this action." }
  },
  
  // Restaurant / Subscription
  RESTAURANT_INACTIVE: {
    ar: { title: "المطعم غير نشط", description: "تم تعطيل هذا المطعم. تواصل مع الدعم." },
    en: { title: "Restaurant Inactive", description: "This restaurant has been deactivated. Contact support." }
  },
  SUBSCRIPTION_EXPIRED: {
    ar: { title: "انتهى الاشتراك", description: "اشتراكك منتهي. يرجى التجديد للمتابعة.", action: "تجديد الاشتراك" },
    en: { title: "Subscription Expired", description: "Your subscription has expired. Please renew to continue.", action: "Renew" }
  },
  
  // Order / Payment
  ORDER_NOT_OPEN: {
    ar: { title: "الطلب مغلق", description: "لا يمكن تعديل طلب مغلق أو ملغى." },
    en: { title: "Order Closed", description: "Cannot modify a closed or cancelled order." }
  },
  ORDER_ALREADY_PAID: {
    ar: { title: "الطلب مدفوع", description: "هذا الطلب تم دفعه مسبقاً." },
    en: { title: "Already Paid", description: "This order has already been paid." }
  },
  ORDER_HELD: {
    ar: { title: "الطلب معلق", description: "يجب استئناف الطلب المعلق أولاً.", action: "استئناف الطلب" },
    en: { title: "Order On Hold", description: "Resume the held order first.", action: "Resume Order" }
  },
  UNDERPAYMENT: {
    ar: { title: "المبلغ غير كافٍ", description: "المبلغ المدفوع أقل من إجمالي الطلب." },
    en: { title: "Insufficient Payment", description: "Payment amount is less than order total." }
  },
  CARD_OVERPAY: {
    ar: { title: "لا يمكن الدفع الزائد بالبطاقة", description: "الدفع بالبطاقة يجب أن يكون بالمبلغ المحدد." },
    en: { title: "Card Overpayment", description: "Card payment must be the exact amount." }
  },
  
  // Inventory
  INSUFFICIENT_STOCK: {
    ar: { title: "المخزون غير كافٍ", description: "الكمية المطلوبة غير متوفرة في المخزون." },
    en: { title: "Insufficient Stock", description: "The requested quantity is not available in stock." }
  },
  RECIPE_INVALID: {
    ar: { title: "وصفة غير صالحة", description: "الصنف لا يحتوي على وصفة صالحة." },
    en: { title: "Invalid Recipe", description: "The menu item doesn't have a valid recipe." }
  },
  UNIT_MISMATCH: {
    ar: { title: "عدم تطابق الوحدة", description: "خطأ في تحويل وحدات القياس." },
    en: { title: "Unit Mismatch", description: "Error converting measurement units." }
  },
  
  // Shift
  NO_OPEN_SHIFT: {
    ar: { title: "لا توجد وردية مفتوحة", description: "افتح وردية أولاً لبدء العمل.", action: "فتح وردية" },
    en: { title: "No Open Shift", description: "Open a shift first to start working.", action: "Open Shift" }
  },
  SHIFT_ALREADY_OPEN: {
    ar: { title: "وردية مفتوحة بالفعل", description: "لا يمكن فتح ورديتين في نفس الوقت." },
    en: { title: "Shift Already Open", description: "Cannot open two shifts at the same time." }
  },
  OPEN_ORDERS_EXIST: {
    ar: { title: "توجد طلبات مفتوحة", description: "أغلق جميع الطلبات قبل إغلاق الوردية." },
    en: { title: "Open Orders Exist", description: "Close all orders before ending the shift." }
  },
  
  // Data
  DUPLICATE: {
    ar: { title: "موجود مسبقاً", description: "هذا العنصر موجود بالفعل." },
    en: { title: "Already Exists", description: "This item already exists." }
  },
  NOT_FOUND: {
    ar: { title: "غير موجود", description: "لم يتم العثور على العنصر المطلوب." },
    en: { title: "Not Found", description: "The requested item could not be found." }
  },
  VALIDATION_ERROR: {
    ar: { title: "خطأ في البيانات", description: "يرجى التحقق من البيانات المدخلة." },
    en: { title: "Validation Error", description: "Please check the entered data." }
  },
  
  // Branch
  ACTIVE_CASHIERS: {
    ar: { title: "لا يمكن حذف الفرع", description: "يرجى إلغاء تفعيل جميع الكاشيرات في هذا الفرع أولاً." },
    en: { title: "Cannot Delete Branch", description: "Please deactivate all cashiers in this branch first." }
  },
  OPEN_SHIFTS: {
    ar: { title: "لا يمكن حذف الفرع", description: "يرجى إغلاق جميع الورديات المفتوحة في هذا الفرع أولاً." },
    en: { title: "Cannot Delete Branch", description: "Please close all open shifts in this branch first." }
  },
  
  // Network / Technical
  NETWORK_ERROR: {
    ar: { title: "خطأ في الاتصال", description: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى.", action: "إعادة المحاولة" },
    en: { title: "Connection Error", description: "Check your internet connection and try again.", action: "Retry" }
  },
  SERVER_ERROR: {
    ar: { title: "خطأ في الخادم", description: "حدث خطأ تقني. يرجى المحاولة لاحقاً." },
    en: { title: "Server Error", description: "A technical error occurred. Please try again later." }
  },
  
  // Default fallback
  UNKNOWN: {
    ar: { title: "حدث خطأ", description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." },
    en: { title: "Error Occurred", description: "An unexpected error occurred. Please try again." }
  }
};

/**
 * Extracts error message from various error formats
 */
function extractErrorMessage(error: unknown): string {
  if (!error) return "";
  
  if (error instanceof Error) {
    return error.message || "";
  }
  
  if (typeof error === "string") {
    return error;
  }
  
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    
    // Check common error properties
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.error_description === "string") return obj.error_description;
    
    // Check nested error object
    if (obj.error && typeof obj.error === "object") {
      const nestedError = obj.error as Record<string, unknown>;
      if (typeof nestedError.message === "string") return nestedError.message;
      if (typeof nestedError.code === "string") return nestedError.code;
    }
    
    // Check context
    if (obj.context && typeof obj.context === "object") {
      const ctx = obj.context as Record<string, unknown>;
      if (typeof ctx.message === "string") return ctx.message;
    }
    
    // Check Supabase error code
    if (typeof obj.code === "string") {
      return obj.code;
    }
  }
  
  return "";
}

/**
 * Detects error type from message
 */
function detectErrorType(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  for (const [errorType, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(lowerMessage)) {
      return errorType;
    }
  }
  
  return "UNKNOWN";
}

/**
 * Gets localized error message
 */
export function getSystemErrorMessage(
  error: unknown,
  language: "ar" | "en" = "en"
): SystemErrorResult {
  const message = extractErrorMessage(error);
  const errorType = detectErrorType(message);
  
  const errorMessages = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN;
  const localized = errorMessages[language];
  
  return {
    title: localized.title,
    description: localized.description,
    action: localized.action
  };
}

/**
 * Shows a system error as a toast notification (bilingual)
 */
export function showSystemError(
  error: unknown,
  language: "ar" | "en" = "en",
  customTitle?: string
): void {
  const errorResult = getSystemErrorMessage(error, language);
  
  toast({
    title: customTitle || errorResult.title,
    description: errorResult.description,
    variant: "destructive"
  });
}

/**
 * Shows a success toast notification (bilingual)
 */
export function showSystemSuccess(
  messageKey: "saved" | "created" | "updated" | "deleted" | "completed" | "sent",
  language: "ar" | "en" = "en",
  customMessage?: string
): void {
  const messages: Record<string, { ar: string; en: string }> = {
    saved: { ar: "تم الحفظ بنجاح", en: "Saved successfully" },
    created: { ar: "تم الإنشاء بنجاح", en: "Created successfully" },
    updated: { ar: "تم التحديث بنجاح", en: "Updated successfully" },
    deleted: { ar: "تم الحذف بنجاح", en: "Deleted successfully" },
    completed: { ar: "تم بنجاح", en: "Completed successfully" },
    sent: { ar: "تم الإرسال بنجاح", en: "Sent successfully" }
  };
  
  toast({
    title: customMessage || messages[messageKey][language]
  });
}

/**
 * Shows a warning toast notification (bilingual)
 */
export function showSystemWarning(
  title: string,
  description?: string
): void {
  toast({
    title,
    description,
    variant: "destructive"
  });
}
