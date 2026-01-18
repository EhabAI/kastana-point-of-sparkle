/**
 * Global Error Context for Kastana POS
 * 
 * Captures and manages errors across the application.
 * Provides error state for Smart Assistant to explain errors to users.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from "react";

// Error source types
export type ErrorSource = 
  | "csv_import" 
  | "csv_inventory" 
  | "csv_recipes" 
  | "payment" 
  | "invoice" 
  | "order" 
  | "shift" 
  | "inventory" 
  | "refund" 
  | "report" 
  | "table" 
  | "z_report"
  | "network"
  | "permission"
  | "unknown";

// Error payload structure
export interface SystemError {
  id: string;
  error_code: string;
  source: ErrorSource;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
  rawError?: unknown;
}

interface ErrorContextState {
  /** The most recent error that occurred */
  lastError: SystemError | null;
  
  /** Flag indicating if assistant should auto-explain when opened */
  pendingExplanation: boolean;
  
  /** History of errors in this session (limited to last 5) */
  errorHistory: SystemError[];
}

interface ErrorContextActions {
  /** Capture and store a new error */
  captureError: (params: {
    error_code: string;
    source: ErrorSource;
    message: string;
    metadata?: Record<string, unknown>;
    rawError?: unknown;
  }) => SystemError;
  
  /** Request error explanation - opens assistant with error context */
  requestExplanation: () => void;
  
  /** Mark that the pending explanation has been handled */
  clearPendingExplanation: () => void;
  
  /** Clear the last error (after it's been explained) */
  clearLastError: () => void;
  
  /** Get explanation for a specific error */
  getErrorExplanation: (error: SystemError, language: "ar" | "en") => string;
}

type ErrorContextType = ErrorContextState & ErrorContextActions;

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

/**
 * Error explanations mapped by source and common error codes
 */
const ERROR_EXPLANATIONS: Record<string, Record<string, { ar: string; en: string }>> = {
  csv_inventory: {
    default: {
      ar: `🔍 مشكلة في استيراد ملف CSV للمخزون

الأسباب الشائعة:
• **أعمدة مفقودة**: تأكد من وجود (name, base_unit, branch_name, quantity)
• **فرع غير موجود**: تحقق من تطابق اسم الفرع
• **وحدة غير موجودة**: الوحدة يجب أن تكون مسجلة مسبقاً
• **كمية غير صالحة**: يجب أن تكون رقماً موجباً
• **تنسيق الملف**: تأكد أن الملف UTF-8

❓ هل ظهر الخطأ قبل المعاينة أم بعد تأكيد الاستيراد؟`,
      en: `🔍 CSV Inventory Import Issue

Common causes:
• **Missing columns**: Ensure (name, base_unit, branch_name, quantity) exist
• **Branch not found**: Verify branch name matches exactly
• **Unit not found**: Unit must be registered first
• **Invalid quantity**: Must be a positive number
• **File format**: Ensure UTF-8 encoding

❓ Did the error appear before preview or after confirming import?`
    },
    BRANCH_NOT_FOUND: {
      ar: `⚠️ الفرع غير موجود في النظام

السبب: اسم الفرع في ملف CSV لا يتطابق مع الفروع المسجلة.

الحل:
1. افتح صفحة إدارة الفروع وتحقق من الأسماء الصحيحة
2. عدّل ملف CSV ليتطابق مع اسم الفرع بالضبط
3. انتبه للمسافات والحروف الكبيرة/الصغيرة`,
      en: `⚠️ Branch Not Found

Cause: Branch name in CSV doesn't match registered branches.

Solution:
1. Check branch management page for correct names
2. Update CSV to match branch name exactly
3. Watch for spaces and case sensitivity`
    },
    UNIT_NOT_FOUND: {
      ar: `⚠️ وحدة القياس غير موجودة

السبب: الوحدة المذكورة في CSV غير مسجلة في النظام.

الحل:
1. اذهب لإعدادات المخزون > الوحدات
2. أضف الوحدة المطلوبة (كجم، لتر، حبة، إلخ)
3. أعد الاستيراد`,
      en: `⚠️ Unit Not Found

Cause: Unit in CSV is not registered in the system.

Solution:
1. Go to Inventory Settings > Units
2. Add the required unit (kg, liter, piece, etc.)
3. Re-import the file`
    }
  },
  csv_recipes: {
    default: {
      ar: `🔍 مشكلة في استيراد ملف CSV للوصفات

الأسباب الشائعة:
• **صنف غير موجود**: الصنف يجب أن يكون في القائمة أولاً
• **مادة خام غير موجودة**: المواد يجب أن تكون في المخزون
• **كمية غير صالحة**: يجب أن تكون رقماً موجباً
• **وصفة مكررة**: قد تكون الوصفة موجودة مسبقاً
• **المخزون معطل**: تأكد من تفعيل المخزون للمطعم

❓ هل تظهر رسالة خطأ محددة؟`,
      en: `🔍 CSV Recipes Import Issue

Common causes:
• **Menu item not found**: Item must exist in menu first
• **Ingredient not found**: Ingredients must be in inventory
• **Invalid quantity**: Must be a positive number
• **Duplicate recipe**: Recipe may already exist
• **Inventory disabled**: Ensure inventory is enabled

❓ Is there a specific error message?`
    },
    ITEM_NOT_FOUND: {
      ar: `⚠️ الصنف غير موجود في القائمة

السبب: تحاول ربط وصفة بصنف غير موجود.

الحل:
1. تأكد من إضافة الصنف للقائمة أولاً
2. تحقق من تطابق الاسم بالضبط في CSV`,
      en: `⚠️ Menu Item Not Found

Cause: Trying to link recipe to non-existent item.

Solution:
1. Add the menu item first
2. Verify name matches exactly in CSV`
    }
  },
  payment: {
    default: {
      ar: `💳 مشكلة في الدفع أو إغلاق الفاتورة

الأسباب الشائعة:
• **الطلب معلق**: يجب استئناف الطلب أولاً
• **الطلب فارغ**: لا يمكن الدفع لطلب بدون أصناف
• **طريقة الدفع معطلة**: تحقق من إعدادات طرق الدفع
• **الوردية مغلقة**: افتح وردية أولاً
• **الطلب مدفوع سابقاً**: تحقق من حالة الطلب

❓ ما هي الخطوة التي توقفت عندها؟`,
      en: `💳 Payment or Invoice Issue

Common causes:
• **Order on hold**: Resume order first
• **Empty order**: Cannot pay for order without items
• **Payment method disabled**: Check payment settings
• **Shift closed**: Open a shift first
• **Already paid**: Check order status

❓ What step did you stop at?`
    },
    ORDER_ALREADY_PAID: {
      ar: `✅ الطلب مدفوع مسبقاً

هذا الطلب تم إغلاقه بنجاح من قبل. لا يمكن الدفع مرتين لنفس الطلب.

💡 إذا كنت تريد طباعة الإيصال مجدداً، استخدم "الطلبات الأخيرة"`,
      en: `✅ Order Already Paid

This order was already completed. Cannot pay twice for the same order.

💡 To reprint receipt, use "Recent Orders"`
    },
    ORDER_HELD: {
      ar: `⏸️ الطلب معلق (ON HOLD)

لا يمكن الدفع لطلب معلق. يجب استئنافه أولاً.

الحل:
1. اذهب لقائمة الطلبات المعلقة
2. اختر الطلب واضغط "استئناف"
3. ثم أكمل عملية الدفع`,
      en: `⏸️ Order is On Hold

Cannot pay for a held order. Resume it first.

Solution:
1. Go to held orders list
2. Select order and click "Resume"
3. Then complete payment`
    }
  },
  shift: {
    default: {
      ar: `⏱️ مشكلة في الوردية

الأسباب الشائعة:
• **لا توجد وردية مفتوحة**: يجب فتح وردية أولاً
• **وردية مفتوحة بالفعل**: لا يمكن فتح ورديتين
• **طلبات مفتوحة**: أغلق جميع الطلبات قبل إغلاق الوردية
• **فرق في الصندوق**: تأكد من مطابقة المبلغ الفعلي

❓ هل تحاول فتح أم إغلاق الوردية؟`,
      en: `⏱️ Shift Issue

Common causes:
• **No open shift**: Must open shift first
• **Shift already open**: Cannot open two shifts
• **Open orders**: Close all orders before ending shift
• **Cash difference**: Verify actual drawer amount

❓ Are you trying to open or close shift?`
    }
  },
  inventory: {
    default: {
      ar: `📦 مشكلة في المخزون

الأسباب الشائعة:
• **المخزون معطل**: فعّل المخزون من الإعدادات
• **صنف غير موجود**: المادة الخام يجب أن تكون مسجلة
• **كمية غير كافية**: الرصيد أقل من المطلوب
• **وحدة غير صحيحة**: تحقق من وحدة القياس

❓ ما هي العملية التي تحاول تنفيذها؟`,
      en: `📦 Inventory Issue

Common causes:
• **Inventory disabled**: Enable from settings
• **Item not found**: Raw material must be registered
• **Insufficient stock**: Balance less than required
• **Wrong unit**: Verify measurement unit

❓ What operation are you trying to perform?`
    },
    INSUFFICIENT_STOCK: {
      ar: `⚠️ الكمية غير كافية في المخزون

المادة الخام المطلوبة رصيدها أقل من الكمية المطلوبة.

الحل:
1. تحقق من الرصيد الحالي في شاشة المخزون
2. أضف كمية جديدة عبر "استلام مشتريات"
3. أو راجع الوصفة وعدّل الكمية المطلوبة`,
      en: `⚠️ Insufficient Stock

Required ingredient has less than needed quantity.

Solution:
1. Check current balance in inventory screen
2. Add stock via "Receive Purchase"
3. Or review recipe and adjust quantity`
    }
  },
  refund: {
    default: {
      ar: `💸 مشكلة في المرتجع

الأسباب الشائعة:
• **الطلب غير مدفوع**: يجب أن يكون الطلب مدفوعاً
• **تم الاسترجاع سابقاً**: لا يمكن استرجاع نفس الطلب مرتين
• **مبلغ غير صالح**: المبلغ يجب أن يكون أقل من أو يساوي قيمة الطلب
• **لا توجد صلاحية**: تحتاج صلاحية للمرتجعات

❓ ما نوع المرتجع (كامل/جزئي)؟`,
      en: `💸 Refund Issue

Common causes:
• **Order not paid**: Order must be paid first
• **Already refunded**: Cannot refund same order twice
• **Invalid amount**: Must be ≤ order total
• **No permission**: Need refund permission

❓ What type of refund (full/partial)?`
    }
  },
  network: {
    default: {
      ar: `🌐 مشكلة في الاتصال

السبب: فشل الاتصال بالخادم.

الحل:
1. تحقق من اتصال الإنترنت
2. أعد تحميل الصفحة
3. إذا استمرت المشكلة، تواصل مع الدعم`,
      en: `🌐 Connection Issue

Cause: Failed to connect to server.

Solution:
1. Check internet connection
2. Refresh the page
3. If problem persists, contact support`
    }
  },
  permission: {
    default: {
      ar: `🔒 لا تملك الصلاحية

هذا الإجراء يتطلب صلاحيات إضافية غير متوفرة في حسابك.

💡 تواصل مع المدير للحصول على الصلاحية المطلوبة.`,
      en: `🔒 Permission Denied

This action requires additional permissions not available in your account.

💡 Contact your manager for the required permission.`
    }
  },
  unknown: {
    default: {
      ar: `⚠️ حدث خطأ غير متوقع

الحل:
1. أعد تحميل الصفحة
2. حاول مرة أخرى
3. إذا استمرت المشكلة، تواصل مع الدعم الفني

💡 يمكنك وصف ما كنت تفعله وسأحاول مساعدتك.`,
      en: `⚠️ Unexpected Error

Solution:
1. Refresh the page
2. Try again
3. If problem persists, contact support

💡 Describe what you were doing and I'll try to help.`
    }
  }
};

export function ErrorContextProvider({ children }: { children: ReactNode }) {
  const [lastError, setLastError] = useState<SystemError | null>(null);
  const [pendingExplanation, setPendingExplanation] = useState(false);
  const [errorHistory, setErrorHistory] = useState<SystemError[]>([]);
  
  // Ref to track callbacks for opening assistant
  const onRequestExplanationRef = useRef<(() => void) | null>(null);
  
  /**
   * Register a callback to be called when explanation is requested
   * Used by SmartAssistantLite to open drawer
   */
  const setOnRequestExplanation = useCallback((callback: (() => void) | null) => {
    onRequestExplanationRef.current = callback;
  }, []);

  const captureError = useCallback(({
    error_code,
    source,
    message,
    metadata,
    rawError
  }: {
    error_code: string;
    source: ErrorSource;
    message: string;
    metadata?: Record<string, unknown>;
    rawError?: unknown;
  }): SystemError => {
    const error: SystemError = {
      id: `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      error_code,
      source,
      message,
      metadata,
      timestamp: new Date(),
      rawError
    };
    
    setLastError(error);
    setPendingExplanation(true); // Mark that we have a new error to explain
    
    // Add to history (keep last 5)
    setErrorHistory(prev => [error, ...prev].slice(0, 5));
    
    console.log("[ErrorContext] Captured error:", { error_code, source, message });
    
    return error;
  }, []);

  const requestExplanation = useCallback(() => {
    if (onRequestExplanationRef.current) {
      onRequestExplanationRef.current();
    }
  }, []);

  const clearPendingExplanation = useCallback(() => {
    setPendingExplanation(false);
  }, []);

  const clearLastError = useCallback(() => {
    setLastError(null);
    setPendingExplanation(false);
  }, []);

  const getErrorExplanation = useCallback((error: SystemError, language: "ar" | "en"): string => {
    const sourceExplanations = ERROR_EXPLANATIONS[error.source] || ERROR_EXPLANATIONS.unknown;
    const codeExplanation = sourceExplanations[error.error_code];
    
    if (codeExplanation) {
      return codeExplanation[language];
    }
    
    // Fallback to default for this source
    return sourceExplanations.default?.[language] || ERROR_EXPLANATIONS.unknown.default[language];
  }, []);

  const value: ErrorContextType & { setOnRequestExplanation: typeof setOnRequestExplanation } = {
    // State
    lastError,
    pendingExplanation,
    errorHistory,
    // Actions
    captureError,
    requestExplanation,
    clearPendingExplanation,
    clearLastError,
    getErrorExplanation,
    setOnRequestExplanation
  };

  return (
    <ErrorContext.Provider value={value as ErrorContextType}>
      {children}
    </ErrorContext.Provider>
  );
}

export function useErrorContext() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error("useErrorContext must be used within an ErrorContextProvider");
  }
  return context;
}

// Hook to access the setOnRequestExplanation (internal use only)
export function useErrorContextInternal() {
  const context = useContext(ErrorContext) as ErrorContextType & { 
    setOnRequestExplanation: (callback: (() => void) | null) => void 
  };
  if (!context) {
    throw new Error("useErrorContextInternal must be used within an ErrorContextProvider");
  }
  return context;
}

// Types are already exported with the interface above
