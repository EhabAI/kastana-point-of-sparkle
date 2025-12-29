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
    
    // Dashboard
    "owner_dashboard": "Owner Dashboard",
    "system_admin": "System Admin",
    "cashier": "Cashier",
    "owner": "Owner",
    
    // Tabs
    "overview": "Overview",
    "analytics": "Analytics",
    "reports": "Reports",
    "menu": "Menu",
    "manage": "Manage",
    "branches": "Branches",
    "settings": "Settings",
    
    // Branch
    "select_branch_first": "Select branch first",
    "branch": "Branch",
    "branches_management": "Branches Management",
    "add_branch": "Add Branch",
    "edit_branch": "Edit Branch",
    "branch_name": "Branch Name",
    "branch_code": "Branch Code",
    "branch_address": "Address",
    "branch_phone": "Phone",
    "set_default": "Set Default",
    "copy_from_branch": "Copy from Branch",
    
    // Menu
    "menu_categories": "Menu Categories",
    "menu_items": "Menu Items",
    "add_category": "Add Category",
    "add_item": "Add Item",
    "category_name": "Category Name",
    "item_name": "Item Name",
    "price": "Price",
    "description": "Description",
    "available": "Available",
    "unavailable": "Unavailable",
    "offer": "Offer",
    "promo": "Promo",
    
    // Staff
    "staff_management": "Staff Management",
    "tables": "Tables",
    
    // No data
    "no_restaurant": "No Restaurant Assigned",
    "no_categories": "No categories yet. Create one to get started.",
    "no_items": "No items in this category.",
    "no_branches": "No branches found.",
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
    
    // Dashboard
    "owner_dashboard": "لوحة تحكم المالك",
    "system_admin": "مدير النظام",
    "cashier": "كاشير",
    "owner": "مالك",
    
    // Tabs
    "overview": "نظرة عامة",
    "analytics": "التحليلات",
    "reports": "التقارير",
    "menu": "القائمة",
    "manage": "الإدارة",
    "branches": "الفروع",
    "settings": "الإعدادات",
    
    // Branch
    "select_branch_first": "اختر الفرع أولاً",
    "branch": "الفرع",
    "branches_management": "إدارة الفروع",
    "add_branch": "إضافة فرع",
    "edit_branch": "تعديل الفرع",
    "branch_name": "اسم الفرع",
    "branch_code": "رمز الفرع",
    "branch_address": "العنوان",
    "branch_phone": "الهاتف",
    "set_default": "تعيين كافتراضي",
    "copy_from_branch": "نسخ من فرع",
    
    // Menu
    "menu_categories": "فئات القائمة",
    "menu_items": "عناصر القائمة",
    "add_category": "إضافة فئة",
    "add_item": "إضافة عنصر",
    "category_name": "اسم الفئة",
    "item_name": "اسم العنصر",
    "price": "السعر",
    "description": "الوصف",
    "available": "متوفر",
    "unavailable": "غير متوفر",
    "offer": "عرض",
    "promo": "ترويج",
    
    // Staff
    "staff_management": "إدارة الموظفين",
    "tables": "الطاولات",
    
    // No data
    "no_restaurant": "لا يوجد مطعم مخصص",
    "no_categories": "لا توجد فئات بعد. أنشئ واحدة للبدء.",
    "no_items": "لا توجد عناصر في هذه الفئة.",
    "no_branches": "لا توجد فروع.",
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
