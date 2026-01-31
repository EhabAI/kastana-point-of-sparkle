/**
 * Unified Message Resolver for Kastana POS
 * 
 * This module provides a centralized way to resolve bilingual messages
 * with optional training mode support for educational tone.
 * 
 * Usage:
 *   import { resolveMessage } from "@/lib/messageResolver";
 *   const message = resolveMessage("table_created", language, isTrainingMode);
 */

import { getActiveTraining } from "@/lib/trainerEngine";

// ============================================
// TYPES
// ============================================

export type MessageKey = 
  // Tables
  | "table_created"
  | "table_updated"
  | "table_create_error"
  | "table_update_error"
  // Categories
  | "category_created"
  | "category_updated"
  | "category_deleted"
  // Menu Items
  | "item_created"
  | "item_updated"
  | "item_deleted"
  // Staff - Cashiers
  | "cashier_created"
  | "cashier_activated"
  | "cashier_deactivated"
  | "cashier_create_error"
  | "cashier_status_error"
  | "email_already_registered"
  // Staff - Kitchen
  | "kitchen_staff_created"
  | "kitchen_staff_activated"
  | "kitchen_staff_deactivated"
  | "kitchen_staff_create_error"
  | "kitchen_staff_status_error"
  | "kds_required"
  // Owners
  | "owner_created"
  | "owner_create_error"
  | "owner_assigned"
  | "owner_assign_error"
  // Restaurants
  | "restaurant_created"
  | "restaurant_updated"
  | "restaurant_create_error"
  | "restaurant_update_error"
  // Subscriptions
  | "subscription_renewed"
  | "subscription_renew_error"
  | "restaurant_with_subscription_created"
  // Payment Methods
  | "payment_methods_updated"
  | "payment_methods_update_error"
  // Branches
  | "branch_created"
  | "branch_updated"
  | "branch_deleted"
  // Settings
  | "settings_saved"
  // Branch Menu Items
  | "items_updated"
  | "prices_copied"
  // Inventory
  | "inv_waste_recorded"
  | "inv_transfer_complete"
  | "inv_purchase_received"
  | "inv_count_created"
  | "inv_count_submitted"
  | "inv_count_approved"
  | "inv_count_cancelled"
  | "inv_adjustment_saved"
  | "inv_operation_failed"
  | "data_reset_success"
  // Generic
  | "generic_success"
  | "generic_error"
  | "auth_required";

interface MessageDefinition {
  ar: string;
  en: string;
  // Training mode variants (educational tone with 🎓)
  arTraining?: string;
  enTraining?: string;
}

// ============================================
// MESSAGE DEFINITIONS
// ============================================

const MESSAGES: Record<MessageKey, MessageDefinition> = {
  // Tables
  table_created: {
    ar: "تم إنشاء الطاولة بنجاح",
    en: "Table created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء الطاولة",
    enTraining: "🎓 Great! The table has been created",
  },
  table_updated: {
    ar: "تم تحديث الطاولة بنجاح",
    en: "Table updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث الطاولة",
    enTraining: "🎓 Great! The table has been updated",
  },
  table_create_error: {
    ar: "فشل في إنشاء الطاولة",
    en: "Failed to create table",
  },
  table_update_error: {
    ar: "فشل في تحديث الطاولة",
    en: "Failed to update table",
  },

  // Categories
  category_created: {
    ar: "تم إنشاء الفئة بنجاح",
    en: "Category created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء الفئة",
    enTraining: "🎓 Great! The category has been created",
  },
  category_updated: {
    ar: "تم تحديث الفئة بنجاح",
    en: "Category updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث الفئة",
    enTraining: "🎓 Great! The category has been updated",
  },
  category_deleted: {
    ar: "تم حذف الفئة بنجاح",
    en: "Category deleted successfully",
    arTraining: "🎓 ممتاز! تم حذف الفئة",
    enTraining: "🎓 Great! The category has been deleted",
  },

  // Menu Items
  item_created: {
    ar: "تم إنشاء العنصر بنجاح",
    en: "Item created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء العنصر",
    enTraining: "🎓 Great! The item has been created",
  },
  item_updated: {
    ar: "تم تحديث العنصر بنجاح",
    en: "Item updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث العنصر",
    enTraining: "🎓 Great! The item has been updated",
  },
  item_deleted: {
    ar: "تم حذف العنصر بنجاح",
    en: "Item deleted successfully",
    arTraining: "🎓 ممتاز! تم حذف العنصر",
    enTraining: "🎓 Great! The item has been deleted",
  },

  // Cashiers
  cashier_created: {
    ar: "تم إنشاء الكاشير بنجاح",
    en: "Cashier created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء الكاشير",
    enTraining: "🎓 Great! The cashier has been created",
  },
  cashier_activated: {
    ar: "تم تفعيل الكاشير",
    en: "Cashier activated",
    arTraining: "🎓 ممتاز! تم تفعيل الكاشير",
    enTraining: "🎓 Great! The cashier has been activated",
  },
  cashier_deactivated: {
    ar: "تم إلغاء تفعيل الكاشير",
    en: "Cashier deactivated",
    arTraining: "🎓 تم إلغاء تفعيل الكاشير",
    enTraining: "🎓 The cashier has been deactivated",
  },
  cashier_create_error: {
    ar: "فشل في إنشاء الكاشير",
    en: "Error creating cashier",
  },
  cashier_status_error: {
    ar: "فشل في تحديث حالة الكاشير",
    en: "Error updating cashier status",
  },
  email_already_registered: {
    ar: "هذا البريد الإلكتروني مسجل مسبقاً",
    en: "This email is already registered",
  },

  // Kitchen Staff
  kitchen_staff_created: {
    ar: "تم إنشاء موظف المطبخ بنجاح",
    en: "Kitchen staff created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء موظف المطبخ",
    enTraining: "🎓 Great! The kitchen staff has been created",
  },
  kitchen_staff_activated: {
    ar: "تم تفعيل موظف المطبخ",
    en: "Kitchen staff activated",
    arTraining: "🎓 ممتاز! تم تفعيل موظف المطبخ",
    enTraining: "🎓 Great! The kitchen staff has been activated",
  },
  kitchen_staff_deactivated: {
    ar: "تم إلغاء تفعيل موظف المطبخ",
    en: "Kitchen staff deactivated",
    arTraining: "🎓 تم إلغاء تفعيل موظف المطبخ",
    enTraining: "🎓 The kitchen staff has been deactivated",
  },
  kitchen_staff_create_error: {
    ar: "فشل في إنشاء موظف المطبخ",
    en: "Error creating kitchen staff",
  },
  kitchen_staff_status_error: {
    ar: "فشل في تحديث حالة موظف المطبخ",
    en: "Error updating kitchen staff status",
  },
  kds_required: {
    ar: "يجب تفعيل نظام عرض المطبخ (KDS) أولاً",
    en: "KDS must be enabled to create kitchen staff",
  },

  // Owners
  owner_created: {
    ar: "تم إنشاء صاحب المطعم بنجاح",
    en: "Owner created successfully",
  },
  owner_create_error: {
    ar: "فشل في إنشاء صاحب المطعم",
    en: "Error creating owner",
  },
  owner_assigned: {
    ar: "تم تعيين صاحب المطعم بنجاح",
    en: "Owner assigned successfully",
  },
  owner_assign_error: {
    ar: "فشل في تعيين صاحب المطعم",
    en: "Error assigning owner",
  },

  // Restaurants
  restaurant_created: {
    ar: "تم إنشاء المطعم بنجاح",
    en: "Restaurant created successfully",
  },
  restaurant_updated: {
    ar: "تم تحديث المطعم بنجاح",
    en: "Restaurant updated successfully",
  },
  restaurant_create_error: {
    ar: "فشل في إنشاء المطعم",
    en: "Error creating restaurant",
  },
  restaurant_update_error: {
    ar: "فشل في تحديث المطعم",
    en: "Error updating restaurant",
  },

  // Subscriptions
  subscription_renewed: {
    ar: "تم تجديد الاشتراك بنجاح",
    en: "Subscription renewed successfully",
  },
  subscription_renew_error: {
    ar: "فشل في تجديد الاشتراك",
    en: "Error renewing subscription",
  },
  restaurant_with_subscription_created: {
    ar: "تم إنشاء المطعم مع الاشتراك",
    en: "Restaurant created with subscription",
  },

  // Payment Methods
  payment_methods_updated: {
    ar: "تم تحديث طرق الدفع بنجاح",
    en: "Payment methods updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث طرق الدفع",
    enTraining: "🎓 Great! Payment methods have been updated",
  },
  payment_methods_update_error: {
    ar: "فشل في تحديث طرق الدفع",
    en: "Failed to update payment methods",
  },

  // Branches
  branch_created: {
    ar: "تم إنشاء الفرع بنجاح",
    en: "Branch created successfully",
    arTraining: "🎓 ممتاز! تم إنشاء الفرع",
    enTraining: "🎓 Great! The branch has been created",
  },
  branch_updated: {
    ar: "تم تحديث الفرع بنجاح",
    en: "Branch updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث الفرع",
    enTraining: "🎓 Great! The branch has been updated",
  },
  branch_deleted: {
    ar: "تم حذف الفرع بنجاح",
    en: "Branch deleted successfully",
    arTraining: "🎓 تم حذف الفرع",
    enTraining: "🎓 The branch has been deleted",
  },

  // Settings
  settings_saved: {
    ar: "تم حفظ الإعدادات بنجاح",
    en: "Settings saved successfully",
    arTraining: "🎓 ممتاز! تم حفظ الإعدادات",
    enTraining: "🎓 Great! Settings have been saved",
  },

  // Branch Menu Items
  items_updated: {
    ar: "تم تحديث العناصر بنجاح",
    en: "Items updated successfully",
    arTraining: "🎓 ممتاز! تم تحديث العناصر",
    enTraining: "🎓 Great! Items have been updated",
  },
  prices_copied: {
    ar: "تم نسخ الأسعار بنجاح",
    en: "Prices copied successfully",
    arTraining: "🎓 ممتاز! تم نسخ الأسعار",
    enTraining: "🎓 Great! Prices have been copied",
  },

  // Inventory
  inv_waste_recorded: {
    ar: "تم تسجيل الهدر بنجاح",
    en: "Waste recorded successfully",
    arTraining: "🎓 تم تسجيل الهدر",
    enTraining: "🎓 Waste has been recorded",
  },
  inv_transfer_complete: {
    ar: "تمت عملية النقل بنجاح",
    en: "Transfer completed successfully",
    arTraining: "🎓 تم النقل بنجاح",
    enTraining: "🎓 Transfer completed",
  },
  inv_purchase_received: {
    ar: "تم استلام المشتريات بنجاح",
    en: "Purchase received successfully",
    arTraining: "🎓 تم استلام المشتريات",
    enTraining: "🎓 Purchase received",
  },
  inv_count_created: {
    ar: "تم إنشاء الجرد بنجاح",
    en: "Stock count created successfully",
    arTraining: "🎓 تم إنشاء الجرد",
    enTraining: "🎓 Stock count created",
  },
  inv_count_submitted: {
    ar: "تم تقديم الجرد للمراجعة",
    en: "Stock count submitted for review",
    arTraining: "🎓 تم تقديم الجرد",
    enTraining: "🎓 Stock count submitted",
  },
  inv_count_approved: {
    ar: "تم اعتماد الجرد بنجاح",
    en: "Stock count approved successfully",
    arTraining: "🎓 تم اعتماد الجرد",
    enTraining: "🎓 Stock count approved",
  },
  inv_count_cancelled: {
    ar: "تم إلغاء الجرد",
    en: "Stock count cancelled",
    arTraining: "🎓 تم إلغاء الجرد",
    enTraining: "🎓 Stock count cancelled",
  },
  inv_adjustment_saved: {
    ar: "تم حفظ التعديل بنجاح",
    en: "Adjustment saved successfully",
    arTraining: "🎓 تم حفظ التعديل",
    enTraining: "🎓 Adjustment saved",
  },
  inv_operation_failed: {
    ar: "فشلت العملية",
    en: "Operation failed",
  },
  data_reset_success: {
    ar: "تم إعادة تعيين البيانات بنجاح",
    en: "Data reset successfully",
  },

  // Generic
  generic_success: {
    ar: "تمت العملية بنجاح",
    en: "Operation completed successfully",
  },
  generic_error: {
    ar: "حدث خطأ. يرجى المحاولة مرة أخرى",
    en: "An error occurred. Please try again",
  },
  auth_required: {
    ar: "غير مصرح. يرجى تسجيل الدخول مرة أخرى",
    en: "Not authenticated. Please sign in again",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if the user is currently in training mode
 */
export function isInTrainingMode(): boolean {
  const activeTraining = getActiveTraining();
  return activeTraining !== null;
}

/**
 * Resolve a message key to the appropriate localized string
 * 
 * @param key - The message key to resolve
 * @param language - Current language ('ar' | 'en')
 * @param forceTrainingMode - Optional override for training mode detection
 * @returns The localized message string
 */
export function resolveMessage(
  key: MessageKey,
  language: "ar" | "en",
  forceTrainingMode?: boolean
): string {
  const definition = MESSAGES[key];
  
  if (!definition) {
    console.warn(`[MessageResolver] Unknown message key: ${key}`);
    return key;
  }

  const inTraining = forceTrainingMode ?? isInTrainingMode();

  if (language === "ar") {
    return (inTraining && definition.arTraining) 
      ? definition.arTraining 
      : definition.ar;
  } else {
    return (inTraining && definition.enTraining) 
      ? definition.enTraining 
      : definition.en;
  }
}

/**
 * Get the appropriate error message, checking for common patterns
 * 
 * @param error - The error object or message
 * @param language - Current language ('ar' | 'en')
 * @param defaultKey - The default message key for this error context
 * @returns Object with title and optional description
 */
export function resolveErrorMessage(
  error: Error | string,
  language: "ar" | "en",
  defaultKey: MessageKey
): { title: string; description?: string } {
  const errorMessage = typeof error === "string" ? error : error.message;
  
  // Check for common error patterns
  if (errorMessage.includes("already registered")) {
    return { title: resolveMessage("email_already_registered", language) };
  }
  
  if (errorMessage.includes("KDS must be enabled")) {
    return { title: resolveMessage("kds_required", language) };
  }
  
  if (errorMessage.includes("Not authenticated")) {
    return { title: resolveMessage("auth_required", language) };
  }
  
  // Default error with description
  return {
    title: resolveMessage(defaultKey, language),
    description: errorMessage,
  };
}

/**
 * Type-safe access to all message keys
 */
export const MESSAGE_KEYS = Object.keys(MESSAGES) as MessageKey[];
