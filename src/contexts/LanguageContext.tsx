import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "en" | "ar";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Common
    "sign_out": "Sign Out",
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "create": "Create",
    "add": "Add",
    "close": "Close",
    "confirm": "Confirm",
    "loading": "Loading...",
    "active": "Active",
    "inactive": "Inactive",
    "default": "Default",
    "disabled": "Disabled",
    "name": "Name",
    "optional": "optional",
    
    // Dashboard
    "owner_dashboard": "Owner Dashboard",
    "system_admin": "System Admin",
    "cashier": "Cashier",
    "owner": "Owner",
    "your_restaurant_info": "Your restaurant information",
    "edit_name": "Edit Name",
    "edit_restaurant_name": "Edit Restaurant Name",
    "update_restaurant_name": "Update your restaurant's name.",
    "restaurant_name": "Restaurant Name",
    
    // Tabs
    "overview": "Overview",
    "analytics": "Analytics",
    "reports": "Reports",
    "menu": "Menu",
    "manage": "Manage",
    "branches": "Branches",
    "settings": "Settings",
    
    // Branch Management
    "branch_management": "Branch Management",
    "manage_restaurant_branches": "Manage restaurant branches",
    "select_branch_first": "Select branch first",
    "branch": "Branch",
    "branches_management": "Branches Management",
    "add_branch": "Add Branch",
    "add_new_branch": "Add a new branch to the restaurant",
    "edit_branch": "Edit Branch",
    "branch_name": "Branch Name",
    "branch_name_required": "Branch Name *",
    "branch_name_placeholder": "e.g. Downtown Branch",
    "branch_code": "Code",
    "branch_code_placeholder": "e.g. DT",
    "branch_address": "Address",
    "full_address": "Full address",
    "branch_phone": "Phone",
    "set_default": "Set as Default",
    "cannot_delete_default": "Cannot delete the default branch",
    "confirm_delete_branch": "Are you sure you want to delete branch",
    "no_branches_add": "No branches. Add a branch to get started.",
    
    // Branch Menu Items
    "branch_prices_promos": "Branch Prices & Promos",
    "manage_prices_promos": "Manage prices and promotions for each branch",
    "select_branch_to_manage": "You must select a branch from above to manage prices and promotions",
    "copy_from_branch": "Copy from Branch",
    "all_categories": "All Categories",
    "selected": "selected",
    "available": "Available",
    "unavailable": "Unavailable",
    "active_status": "Active",
    "disabled_status": "Disabled",
    "promo": "Promo",
    "deselect": "Deselect",
    "select_all": "Select All",
    "no_items": "No items",
    "uncategorized": "Uncategorized",
    "offer": "Offer",
    "custom_price": "Custom Price",
    "edit_item": "Edit Item",
    "base_price": "Base Price",
    "branch_price": "Branch Price (leave empty to use base price)",
    "promo_settings": "Promo Settings",
    "promo_price": "Promo Price",
    "promo_label": "Promo Label",
    "promo_label_placeholder": "e.g. 20% Off",
    "promo_start": "Promo Start",
    "promo_end": "Promo End",
    "apply_promo": "Apply Promo",
    "apply_promo_to_selected": "Apply promo to selected items",
    "copy_prices": "Copy Prices",
    "copy_prices_from_branch": "Copy prices from another branch to this one",
    "source_branch": "Source Branch",
    "select_source_branch": "Select source branch",
    "include_promos": "Include Promotions",
    "copy_promo_settings": "Copy promo settings as well",
    
    // Menu
    "menu_categories": "Menu Categories",
    "menu_items": "Menu Items",
    "add_category": "Add Category",
    "add_item": "Add Item",
    "category_name": "Category Name",
    "item_name": "Item Name",
    "price": "Price",
    "description": "Description",
    "organize_menu": "Organize your menu with categories",
    "manage_menu_items": "Manage items in your menu",
    "create_category": "Create Category",
    "add_new_category": "Add a new menu category.",
    "edit_category": "Edit Category",
    "update_category": "Update the category name.",
    "create_menu_item": "Create Menu Item",
    "add_new_item": "Add a new item to your menu.",
    "edit_menu_item": "Edit Menu Item",
    "update_item": "Update the item details.",
    "select_category": "Select Category",
    "choose_category": "Choose a category",
    "mark_as_offer": "Mark as Offer",
    "description_optional": "Description (optional)",
    
    // Staff
    "staff_management": "Staff Management",
    "tables": "Tables",
    
    // No data
    "no_restaurant": "No Restaurant Assigned",
    "no_restaurant_desc": "Please contact your system administrator to assign a restaurant to your account.",
    "no_categories": "No categories yet. Create one to get started.",
    "no_items_category": "No items in this category. Add one to get started.",
    "no_branches": "No branches found.",
    "select_category_view": "Select a category to view items.",
    
    // Confirmations
    "confirm_delete_category": "Are you sure you want to delete this category? All items in it will also be deleted.",
    "confirm_delete_item": "Are you sure you want to delete this item?",
    
    // Toasts
    "enter_category_name": "Please enter a category name",
    "select_category_first": "Please select a category first",
    "enter_item_name": "Please enter an item name",
  },
  ar: {
    // Common
    "sign_out": "تسجيل الخروج",
    "save": "حفظ",
    "cancel": "إلغاء",
    "edit": "تعديل",
    "delete": "حذف",
    "create": "إنشاء",
    "add": "إضافة",
    "close": "إغلاق",
    "confirm": "تأكيد",
    "loading": "جار التحميل...",
    "active": "نشط",
    "inactive": "غير نشط",
    "default": "افتراضي",
    "disabled": "معطل",
    "name": "الاسم",
    "optional": "اختياري",
    
    // Dashboard
    "owner_dashboard": "لوحة تحكم المالك",
    "system_admin": "مدير النظام",
    "cashier": "كاشير",
    "owner": "مالك",
    "your_restaurant_info": "معلومات مطعمك",
    "edit_name": "تعديل الاسم",
    "edit_restaurant_name": "تعديل اسم المطعم",
    "update_restaurant_name": "تحديث اسم مطعمك.",
    "restaurant_name": "اسم المطعم",
    
    // Tabs
    "overview": "نظرة عامة",
    "analytics": "التحليلات",
    "reports": "التقارير",
    "menu": "القائمة",
    "manage": "الإدارة",
    "branches": "الفروع",
    "settings": "الإعدادات",
    
    // Branch Management
    "branch_management": "إدارة الفروع",
    "manage_restaurant_branches": "إدارة فروع المطعم",
    "select_branch_first": "اختر الفرع أولاً",
    "branch": "الفرع",
    "branches_management": "إدارة الفروع",
    "add_branch": "إضافة فرع",
    "add_new_branch": "أضف فرعاً جديداً للمطعم",
    "edit_branch": "تعديل الفرع",
    "branch_name": "اسم الفرع",
    "branch_name_required": "اسم الفرع *",
    "branch_name_placeholder": "مثال: فرع الشميساني",
    "branch_code": "الرمز",
    "branch_code_placeholder": "مثال: SHM",
    "branch_address": "العنوان",
    "full_address": "العنوان الكامل",
    "branch_phone": "رقم الهاتف",
    "set_default": "تعيين كافتراضي",
    "cannot_delete_default": "لا يمكن حذف الفرع الافتراضي",
    "confirm_delete_branch": "هل أنت متأكد من حذف الفرع",
    "no_branches_add": "لا توجد فروع. أضف فرعاً للبدء.",
    
    // Branch Menu Items
    "branch_prices_promos": "أسعار وعروض الفرع",
    "manage_prices_promos": "إدارة الأسعار والعروض لكل فرع",
    "select_branch_to_manage": "يجب اختيار فرع من القائمة أعلاه لإدارة الأسعار والعروض",
    "copy_from_branch": "نسخ من فرع",
    "all_categories": "كل الأصناف",
    "selected": "محدد",
    "available": "متوفر",
    "unavailable": "غير متوفر",
    "active_status": "نشط",
    "disabled_status": "معطل",
    "promo": "عرض",
    "deselect": "إلغاء التحديد",
    "select_all": "تحديد الكل",
    "no_items": "لا توجد أصناف",
    "uncategorized": "غير مصنف",
    "offer": "عرض",
    "custom_price": "سعر مخصص",
    "edit_item": "تعديل الصنف",
    "base_price": "السعر الأساسي",
    "branch_price": "سعر الفرع (اتركه فارغاً لاستخدام السعر الأساسي)",
    "promo_settings": "إعدادات العرض",
    "promo_price": "سعر العرض",
    "promo_label": "نص العرض",
    "promo_label_placeholder": "مثال: خصم 20%",
    "promo_start": "بداية العرض",
    "promo_end": "نهاية العرض",
    "apply_promo": "تطبيق العرض",
    "apply_promo_to_selected": "تطبيق العرض على العناصر المحددة",
    "copy_prices": "نسخ الأسعار",
    "copy_prices_from_branch": "نسخ الأسعار من فرع آخر لهذا الفرع",
    "source_branch": "الفرع المصدر",
    "select_source_branch": "اختر الفرع المصدر",
    "include_promos": "تضمين العروض",
    "copy_promo_settings": "نسخ إعدادات العروض أيضاً",
    
    // Menu
    "menu_categories": "فئات القائمة",
    "menu_items": "عناصر القائمة",
    "add_category": "إضافة فئة",
    "add_item": "إضافة عنصر",
    "category_name": "اسم الفئة",
    "item_name": "اسم العنصر",
    "price": "السعر",
    "description": "الوصف",
    "organize_menu": "نظّم قائمتك بالفئات",
    "manage_menu_items": "إدارة عناصر القائمة",
    "create_category": "إنشاء فئة",
    "add_new_category": "إضافة فئة جديدة للقائمة.",
    "edit_category": "تعديل الفئة",
    "update_category": "تحديث اسم الفئة.",
    "create_menu_item": "إنشاء عنصر",
    "add_new_item": "إضافة عنصر جديد للقائمة.",
    "edit_menu_item": "تعديل العنصر",
    "update_item": "تحديث تفاصيل العنصر.",
    "select_category": "اختر الفئة",
    "choose_category": "اختر فئة",
    "mark_as_offer": "تحديد كعرض",
    "description_optional": "الوصف (اختياري)",
    
    // Staff
    "staff_management": "إدارة الموظفين",
    "tables": "الطاولات",
    
    // No data
    "no_restaurant": "لا يوجد مطعم مخصص",
    "no_restaurant_desc": "يرجى التواصل مع مدير النظام لتعيين مطعم لحسابك.",
    "no_categories": "لا توجد فئات بعد. أنشئ واحدة للبدء.",
    "no_items_category": "لا توجد عناصر في هذه الفئة. أضف واحداً للبدء.",
    "no_branches": "لا توجد فروع.",
    "select_category_view": "اختر فئة لعرض العناصر.",
    
    // Confirmations
    "confirm_delete_category": "هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع العناصر فيها أيضاً.",
    "confirm_delete_item": "هل أنت متأكد من حذف هذا العنصر؟",
    
    // Toasts
    "enter_category_name": "الرجاء إدخال اسم الفئة",
    "select_category_first": "الرجاء اختيار فئة أولاً",
    "enter_item_name": "الرجاء إدخال اسم العنصر",
  },
};

const STORAGE_KEY = "kastana_language";

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ar") return stored;
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const isRTL = language === "ar";

  // Apply RTL direction to document
  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
