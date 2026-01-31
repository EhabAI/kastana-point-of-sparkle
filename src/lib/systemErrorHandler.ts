/**
 * Unified System Error Handler
 * 
 * Provides user-friendly, bilingual (AR/EN) error messages as toast notifications.
 * Covers: Login, POS (Cashier), Owner Dashboard, and general system errors.
 * NEVER shows raw error.message, SQL, RLS wording, or stack traces to users.
 * 
 * ERROR CODE-BASED: Edge Functions return { error: { code: 'ERROR_CODE' } }
 * and this handler maps codes to localized messages.
 */

import { toast } from "@/hooks/use-toast";

export interface SystemErrorResult {
  title: string;
  description: string;
  action?: string;
}

/**
 * Error code to bilingual message mappings
 * Edge Functions should return these codes ONLY, never human-readable text
 */
const ERROR_CODE_MESSAGES: Record<string, { ar: { title: string; description: string; action?: string }; en: { title: string; description: string; action?: string } }> = {
  // ===================== AUTH ERRORS =====================
  not_authorized: {
    ar: { title: "غير مصرح", description: "ليس لديك صلاحية لتنفيذ هذا الإجراء." },
    en: { title: "Not Authorized", description: "You don't have permission to perform this action." }
  },
  unauthorized: {
    ar: { title: "غير مصرح", description: "يرجى تسجيل الدخول مرة أخرى." },
    en: { title: "Unauthorized", description: "Please sign in again." }
  },
  invalid_token: {
    ar: { title: "انتهت الجلسة", description: "يرجى تسجيل الدخول مرة أخرى." },
    en: { title: "Session Expired", description: "Please sign in again." }
  },
  missing_auth: {
    ar: { title: "غير مسجل الدخول", description: "يرجى تسجيل الدخول أولاً." },
    en: { title: "Not Logged In", description: "Please sign in first." }
  },
  
  // ===================== USER MANAGEMENT =====================
  user_exists: {
    ar: { title: "المستخدم موجود", description: "هذا البريد الإلكتروني مسجل مسبقاً." },
    en: { title: "User Exists", description: "This email is already registered." }
  },
  weak_password: {
    ar: { title: "كلمة مرور ضعيفة", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل." },
    en: { title: "Weak Password", description: "Password must be at least 6 characters." }
  },
  user_not_found: {
    ar: { title: "المستخدم غير موجود", description: "لم يتم العثور على حساب بهذه البيانات." },
    en: { title: "User Not Found", description: "No account found with these details." }
  },
  not_your_staff: {
    ar: { title: "غير مصرح", description: "هذا الموظف لا ينتمي لمطعمك." },
    en: { title: "Not Authorized", description: "This staff member doesn't belong to your restaurant." }
  },
  same_email: {
    ar: { title: "لا تغيير", description: "البريد الإلكتروني الجديد مطابق للقديم." },
    en: { title: "No Change", description: "New email is the same as current email." }
  },
  update_failed: {
    ar: { title: "فشل التحديث", description: "تعذر تحديث البيانات. حاول مرة أخرى." },
    en: { title: "Update Failed", description: "Failed to update data. Please try again." }
  },
  
  // ===================== PAYMENT ERRORS =====================
  order_not_open: {
    ar: { title: "الطلب مغلق", description: "لا يمكن تعديل طلب مغلق أو ملغى." },
    en: { title: "Order Closed", description: "Cannot modify a closed or cancelled order." }
  },
  underpayment: {
    ar: { title: "المبلغ غير كافٍ", description: "المبلغ المدفوع أقل من إجمالي الطلب." },
    en: { title: "Insufficient Payment", description: "Payment amount is less than order total." }
  },
  card_overpayment: {
    ar: { title: "لا يمكن الدفع الزائد بالبطاقة", description: "الدفع بالبطاقة يجب أن يكون بالمبلغ المحدد." },
    en: { title: "Card Overpayment", description: "Card payment must be the exact amount." }
  },
  race_condition: {
    ar: { title: "تعارض في العملية", description: "تم تحديث الطلب من مصدر آخر. حاول مرة أخرى." },
    en: { title: "Operation Conflict", description: "Order was updated elsewhere. Please try again." }
  },
  
  // ===================== REFUND ERRORS =====================
  invalid_refund_type: {
    ar: { title: "نوع استرجاع غير صالح", description: "نوع الاسترجاع يجب أن يكون 'كامل' أو 'جزئي'." },
    en: { title: "Invalid Refund Type", description: "Refund type must be 'full' or 'partial'." }
  },
  partial_amount_required: {
    ar: { title: "المبلغ مطلوب", description: "يجب تحديد مبلغ للاسترجاع الجزئي." },
    en: { title: "Amount Required", description: "Amount is required for partial refunds." }
  },
  refund_exceeds_total: {
    ar: { title: "مبلغ زائد", description: "مبلغ الاسترجاع أكبر من إجمالي الطلب." },
    en: { title: "Exceeds Total", description: "Refund amount exceeds order total." }
  },
  order_not_paid: {
    ar: { title: "الطلب غير مدفوع", description: "لا يمكن استرجاع طلب لم يتم دفعه." },
    en: { title: "Order Not Paid", description: "Cannot refund an unpaid order." }
  },
  
  // ===================== RESTAURANT / SUBSCRIPTION =====================
  subscription_expired: {
    ar: { title: "انتهى الاشتراك", description: "اشتراكك منتهي. يرجى التجديد للمتابعة.", action: "تجديد الاشتراك" },
    en: { title: "Subscription Expired", description: "Your subscription has expired. Please renew to continue.", action: "Renew" }
  },
  restaurant_inactive: {
    ar: { title: "المطعم غير نشط", description: "تم تعطيل هذا المطعم. تواصل مع الدعم." },
    en: { title: "Restaurant Inactive", description: "This restaurant has been deactivated. Contact support." }
  },
  restaurant_not_found: {
    ar: { title: "المطعم غير موجود", description: "لم يتم العثور على المطعم المطلوب." },
    en: { title: "Restaurant Not Found", description: "The requested restaurant could not be found." }
  },
  restaurant_mismatch: {
    ar: { title: "عدم تطابق المطعم", description: "هذا الإجراء غير مسموح لهذا المطعم." },
    en: { title: "Restaurant Mismatch", description: "This action is not allowed for this restaurant." }
  },
  
  // ===================== INVENTORY ERRORS =====================
  inventory_disabled: {
    ar: { title: "المخزون معطل", description: "وحدة المخزون غير مفعّلة لهذا المطعم." },
    en: { title: "Inventory Disabled", description: "Inventory module is not enabled for this restaurant." }
  },
  insufficient_stock: {
    ar: { title: "المخزون غير كافٍ", description: "الكمية المطلوبة غير متوفرة في المخزون." },
    en: { title: "Insufficient Stock", description: "The requested quantity is not available in stock." }
  },
  invalid_item: {
    ar: { title: "صنف غير صالح", description: "الصنف المحدد غير موجود أو غير متاح." },
    en: { title: "Invalid Item", description: "The selected item doesn't exist or is unavailable." }
  },
  invalid_branch: {
    ar: { title: "فرع غير صالح", description: "الفرع المحدد غير موجود أو لا ينتمي لمطعمك." },
    en: { title: "Invalid Branch", description: "The selected branch doesn't exist or doesn't belong to your restaurant." }
  },
  invalid_supplier: {
    ar: { title: "مورد غير صالح", description: "المورد المحدد غير موجود." },
    en: { title: "Invalid Supplier", description: "The selected supplier doesn't exist." }
  },
  same_branch: {
    ar: { title: "نفس الفرع", description: "لا يمكن النقل لنفس الفرع." },
    en: { title: "Same Branch", description: "Cannot transfer to the same branch." }
  },
  count_not_found: {
    ar: { title: "الجرد غير موجود", description: "لم يتم العثور على عملية الجرد." },
    en: { title: "Count Not Found", description: "Stock count not found." }
  },
  count_immutable: {
    ar: { title: "لا يمكن التعديل", description: "لا يمكن تعديل جرد معتمد أو ملغي." },
    en: { title: "Cannot Modify", description: "Cannot modify an approved or cancelled stock count." }
  },
  no_count_lines: {
    ar: { title: "لا توجد أصناف", description: "لم يتم العثور على أصناف في هذا الجرد." },
    en: { title: "No Items", description: "No items found in this stock count." }
  },
  
  // ===================== SHIFT ERRORS =====================
  no_open_shift: {
    ar: { title: "لا توجد وردية مفتوحة", description: "افتح وردية أولاً لبدء العمل.", action: "فتح وردية" },
    en: { title: "No Open Shift", description: "Open a shift first to start working.", action: "Open Shift" }
  },
  shift_already_open: {
    ar: { title: "وردية مفتوحة بالفعل", description: "لا يمكن فتح ورديتين في نفس الوقت." },
    en: { title: "Shift Already Open", description: "Cannot open two shifts at the same time." }
  },
  
  // ===================== QR ORDER ERRORS =====================
  qr_disabled: {
    ar: { title: "طلبات QR معطلة", description: "خدمة طلبات QR غير مفعّلة لهذا المطعم." },
    en: { title: "QR Orders Disabled", description: "QR ordering is not enabled for this restaurant." }
  },
  table_not_found: {
    ar: { title: "الطاولة غير موجودة", description: "لم يتم العثور على الطاولة المحددة." },
    en: { title: "Table Not Found", description: "The specified table could not be found." }
  },
  table_inactive: {
    ar: { title: "الطاولة غير نشطة", description: "هذه الطاولة غير متاحة حالياً." },
    en: { title: "Table Inactive", description: "This table is currently unavailable." }
  },
  order_not_pending: {
    ar: { title: "الطلب ليس معلقاً", description: "لا يمكن تأكيد أو رفض هذا الطلب." },
    en: { title: "Order Not Pending", description: "This order cannot be confirmed or rejected." }
  },
  order_already_confirmed: {
    ar: { title: "الطلب مؤكد مسبقاً", description: "تم تأكيد هذا الطلب بالفعل." },
    en: { title: "Already Confirmed", description: "This order has already been confirmed." }
  },
  order_branch_mismatch: {
    ar: { title: "عدم تطابق الفرع", description: "هذا الطلب ينتمي لفرع آخر." },
    en: { title: "Branch Mismatch", description: "This order belongs to a different branch." }
  },
  
  // ===================== RECIPE ERRORS =====================
  recipe_error: {
    ar: { title: "خطأ في الوصفة", description: "حدث خطأ أثناء حفظ الوصفة." },
    en: { title: "Recipe Error", description: "An error occurred while saving the recipe." }
  },
  
  // ===================== VALIDATION ERRORS =====================
  missing_fields: {
    ar: { title: "حقول ناقصة", description: "يرجى ملء جميع الحقول المطلوبة." },
    en: { title: "Missing Fields", description: "Please fill in all required fields." }
  },
  invalid_input: {
    ar: { title: "بيانات غير صالحة", description: "يرجى التحقق من البيانات المدخلة." },
    en: { title: "Invalid Input", description: "Please check the entered data." }
  },
  invalid_format: {
    ar: { title: "صيغة غير صالحة", description: "صيغة البيانات المدخلة غير صحيحة." },
    en: { title: "Invalid Format", description: "The data format is incorrect." }
  },
  
  // ===================== GENERAL ERRORS =====================
  not_found: {
    ar: { title: "غير موجود", description: "لم يتم العثور على العنصر المطلوب." },
    en: { title: "Not Found", description: "The requested item could not be found." }
  },
  server_error: {
    ar: { title: "خطأ في الخادم", description: "حدث خطأ تقني. يرجى المحاولة لاحقاً." },
    en: { title: "Server Error", description: "A technical error occurred. Please try again later." }
  },
  unexpected: {
    ar: { title: "حدث خطأ", description: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى." },
    en: { title: "Error Occurred", description: "An unexpected error occurred. Please try again." }
  },
  network_error: {
    ar: { title: "خطأ في الاتصال", description: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى.", action: "إعادة المحاولة" },
    en: { title: "Connection Error", description: "Check your internet connection and try again.", action: "Retry" }
  },
  
  // ===================== BRANCH ERRORS =====================
  active_cashiers: {
    ar: { title: "لا يمكن حذف الفرع", description: "يرجى إلغاء تفعيل جميع الكاشيرات في هذا الفرع أولاً." },
    en: { title: "Cannot Delete Branch", description: "Please deactivate all cashiers in this branch first." }
  },
  open_shifts: {
    ar: { title: "لا يمكن حذف الفرع", description: "يرجى إغلاق جميع الورديات المفتوحة في هذا الفرع أولاً." },
    en: { title: "Cannot Delete Branch", description: "Please close all open shifts in this branch first." }
  },
  
  // ===================== EMAIL ERRORS =====================
  email_config_missing: {
    ar: { title: "خدمة البريد غير مهيأة", description: "خدمة البريد الإلكتروني غير مهيأة. تواصل مع الدعم." },
    en: { title: "Email Not Configured", description: "Email service is not configured. Contact support." }
  },
  email_send_failed: {
    ar: { title: "فشل إرسال البريد", description: "تعذر إرسال البريد الإلكتروني. حاول مرة أخرى." },
    en: { title: "Email Failed", description: "Failed to send email. Please try again." }
  },
  owner_email_missing: {
    ar: { title: "البريد غير موجود", description: "بريد المالك غير متوفر." },
    en: { title: "Email Missing", description: "Owner email is not available." }
  },
};

/**
 * Success message mappings for standardized success toasts
 */
const SUCCESS_MESSAGES: Record<string, { ar: string; en: string }> = {
  saved: { ar: "تم الحفظ بنجاح", en: "Saved successfully" },
  created: { ar: "تم الإنشاء بنجاح", en: "Created successfully" },
  updated: { ar: "تم التحديث بنجاح", en: "Updated successfully" },
  deleted: { ar: "تم الحذف بنجاح", en: "Deleted successfully" },
  completed: { ar: "تم بنجاح", en: "Completed successfully" },
  sent: { ar: "تم الإرسال بنجاح", en: "Sent successfully" },
  // Staff management
  staff_created: { ar: "تم إنشاء الموظف بنجاح", en: "Staff member created successfully" },
  password_reset: { ar: "تم إعادة تعيين كلمة المرور", en: "Password reset successfully" },
  email_updated: { ar: "تم تحديث البريد الإلكتروني", en: "Email updated successfully" },
  status_updated: { ar: "تم تحديث الحالة", en: "Status updated successfully" },
  // Inventory
  stock_received: { ar: "تم استلام المخزون", en: "Stock received successfully" },
  adjustment_created: { ar: "تم تسجيل التعديل", en: "Adjustment recorded" },
  waste_recorded: { ar: "تم تسجيل الهدر", en: "Waste recorded" },
  transfer_complete: { ar: "تم النقل بنجاح", en: "Transfer completed" },
  count_approved: { ar: "تم اعتماد الجرد", en: "Stock count approved" },
  // Recipe
  recipe_saved: { ar: "تم حفظ الوصفة", en: "Recipe saved" },
  recipes_imported: { ar: "تم استيراد الوصفات", en: "Recipes imported" },
  // Orders
  order_confirmed: { ar: "تم تأكيد الطلب", en: "Order confirmed" },
  order_rejected: { ar: "تم رفض الطلب", en: "Order rejected" },
  payment_complete: { ar: "تم الدفع بنجاح", en: "Payment completed" },
  refund_complete: { ar: "تم الاسترجاع بنجاح", en: "Refund completed" },
  // Restaurant
  restaurant_activated: { ar: "تم تفعيل المطعم", en: "Restaurant activated" },
  restaurant_deactivated: { ar: "تم تعطيل المطعم", en: "Restaurant deactivated" },
  subscription_renewed: { ar: "تم تجديد الاشتراك", en: "Subscription renewed" },
  // Notifications
  notification_sent: { ar: "تم إرسال الإشعار", en: "Notification sent" },
  reminder_sent: { ar: "تم إرسال التذكير", en: "Reminder sent" },
};

/**
 * Error patterns for fallback detection when no code is provided
 */
const ERROR_PATTERNS = {
  INVALID_CREDENTIALS: /invalid.*credentials|invalid.*login|wrong.*password|incorrect.*password/i,
  SESSION_EXPIRED: /session.*expired|jwt.*expired|token.*expired|refresh.*failed/i,
  EMAIL_NOT_CONFIRMED: /email.*not.*confirmed|verify.*email/i,
  WEAK_PASSWORD: /weak.*password|password.*too.*short|password.*requirements/i,
  EMAIL_TAKEN: /email.*registered|email.*taken|already.*exists.*email|duplicate.*email/i,
  PERMISSION_DENIED: /policy|rls|denied|permission|not.*allowed|unauthorized|access.*denied|forbidden|403/i,
  SUBSCRIPTION_EXPIRED: /subscription.*expired|subscription.*inactive/i,
  NETWORK_ERROR: /network|failed.*to.*fetch|connection|timeout|econnrefused|offline|load.*failed/i,
  SERVER_ERROR: /500|internal.*server|server.*error/i,
  DUPLICATE: /duplicate.*key|already.*exists|unique.*constraint/i,
  NOT_FOUND: /not.*found|no.*rows|does.*not.*exist/i,
};

const PATTERN_TO_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: "not_authorized",
  SESSION_EXPIRED: "invalid_token",
  EMAIL_NOT_CONFIRMED: "not_authorized",
  WEAK_PASSWORD: "weak_password",
  EMAIL_TAKEN: "user_exists",
  PERMISSION_DENIED: "not_authorized",
  SUBSCRIPTION_EXPIRED: "subscription_expired",
  NETWORK_ERROR: "network_error",
  SERVER_ERROR: "server_error",
  DUPLICATE: "user_exists",
  NOT_FOUND: "not_found",
};

/**
 * Extracts error code from various error formats
 */
function extractErrorCode(error: unknown): string | null {
  if (!error) return null;
  
  if (typeof error === "object" && error !== null) {
    const obj = error as Record<string, unknown>;
    
    // Check for structured error code: { error: { code: 'xxx' } }
    if (obj.error && typeof obj.error === "object") {
      const nestedError = obj.error as Record<string, unknown>;
      if (typeof nestedError.code === "string") {
        return nestedError.code;
      }
    }
    
    // Check for direct code property
    if (typeof obj.code === "string") {
      return obj.code;
    }
    
    // Check error property as string (legacy)
    if (typeof obj.error === "string") {
      // Check if it matches a known code
      const code = obj.error.toLowerCase().replace(/[^a-z_]/g, "_");
      if (ERROR_CODE_MESSAGES[code]) {
        return code;
      }
    }
  }
  
  return null;
}

/**
 * Extracts error message from various error formats for pattern matching
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
    
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (typeof obj.error_description === "string") return obj.error_description;
    
    if (obj.error && typeof obj.error === "object") {
      const nestedError = obj.error as Record<string, unknown>;
      if (typeof nestedError.message === "string") return nestedError.message;
    }
    
    if (obj.context && typeof obj.context === "object") {
      const ctx = obj.context as Record<string, unknown>;
      if (typeof ctx.message === "string") return ctx.message;
    }
  }
  
  return "";
}

/**
 * Detects error code from message using patterns (fallback)
 */
function detectErrorCodeFromPattern(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  for (const [patternName, pattern] of Object.entries(ERROR_PATTERNS)) {
    if (pattern.test(lowerMessage)) {
      return PATTERN_TO_CODE[patternName] || "unexpected";
    }
  }
  
  return "unexpected";
}

/**
 * Gets localized error message from error code or raw error
 */
export function getSystemErrorMessage(
  error: unknown,
  language: "ar" | "en" = "en"
): SystemErrorResult {
  // Try to extract structured error code first
  const code = extractErrorCode(error);
  
  if (code && ERROR_CODE_MESSAGES[code]) {
    const messages = ERROR_CODE_MESSAGES[code];
    return {
      title: messages[language].title,
      description: messages[language].description,
      action: messages[language].action
    };
  }
  
  // Fallback: pattern matching on message
  const message = extractErrorMessage(error);
  const fallbackCode = detectErrorCodeFromPattern(message);
  const fallbackMessages = ERROR_CODE_MESSAGES[fallbackCode] || ERROR_CODE_MESSAGES.unexpected;
  
  return {
    title: fallbackMessages[language].title,
    description: fallbackMessages[language].description,
    action: fallbackMessages[language].action
  };
}

/**
 * Gets localized error message directly from an error code
 */
export function getErrorMessageByCode(
  code: string,
  language: "ar" | "en" = "en"
): SystemErrorResult {
  const messages = ERROR_CODE_MESSAGES[code] || ERROR_CODE_MESSAGES.unexpected;
  return {
    title: messages[language].title,
    description: messages[language].description,
    action: messages[language].action
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
 * Shows an error by code as a toast notification (bilingual)
 */
export function showErrorByCode(
  code: string,
  language: "ar" | "en" = "en"
): void {
  const errorResult = getErrorMessageByCode(code, language);
  
  toast({
    title: errorResult.title,
    description: errorResult.description,
    variant: "destructive"
  });
}

/**
 * Shows a success toast notification (bilingual)
 */
export function showSystemSuccess(
  messageKey: keyof typeof SUCCESS_MESSAGES,
  language: "ar" | "en" = "en",
  customMessage?: string
): void {
  const message = SUCCESS_MESSAGES[messageKey] || SUCCESS_MESSAGES.completed;
  
  toast({
    title: customMessage || message[language]
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

/**
 * Export error codes for use in edge functions
 */
export type ErrorCode = keyof typeof ERROR_CODE_MESSAGES;
export type SuccessKey = keyof typeof SUCCESS_MESSAGES;
