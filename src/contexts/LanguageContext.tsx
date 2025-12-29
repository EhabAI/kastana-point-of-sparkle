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
    "save_changes": "Save Changes",
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
    "email": "Email",
    "password": "Password",
    "status": "Status",
    "created": "Created",
    "copy": "Copy",
    "export_csv": "Export CSV",
    "custom": "Custom",
    "open": "Open",
    "closed": "Closed",
    "unknown": "Unknown",
    "page": "Page",
    "of": "of",
    "showing": "Showing",
    "to": "to",
    
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
    
    // Overview Dashboard
    "todays_sales": "Today's Sales",
    "todays_orders": "Today's Orders",
    "open_shifts": "Open Shifts",
    "staff": "Staff",
    "opens_at": "Opens at",
    "opens_on": "Opens",
    
    // Analytics
    "analytics_charts": "Analytics & Charts",
    "analytics_desc": "Sales trends, peak hours, and category performance",
    "sales_trend": "Sales Trend",
    "peak_hours": "Peak Hours",
    "category_performance": "Category Performance",
    "no_sales_data": "No sales data for this period.",
    "no_order_data": "No order data for this period.",
    "no_category_data": "No category data for this period.",
    "sales": "Sales",
    "orders": "Orders",
    
    // Reports
    "performance_metrics": "Performance metrics",
    "total_sales": "Total Sales",
    "number_of_orders": "Number of Orders",
    "total_discounts": "Total Discounts",
    "sales_by_cashier": "Sales by Cashier",
    "no_sales_data_period": "No sales data available for this period.",
    
    // Best/Worst Sellers
    "best_worst_sellers": "Best & Worst Sellers",
    "best_worst_desc": "Identify your top and bottom performing menu items",
    "top_5_best": "Top 5 Best Sellers",
    "bottom_5": "Bottom 5 Sellers",
    "sold": "sold",
    "not_enough_data": "Not enough data to show worst sellers.",
    
    // Cashier Performance
    "cashier_performance": "Cashier Performance",
    "cashier_performance_desc": "Track sales, discounts, and voids by cashier",
    "avg_order": "Avg Order",
    "discounts_given": "Discounts Given",
    "voided_items": "Voided Items",
    "cancelled_orders": "Cancelled Orders",
    "no_shift_data": "No shift data for this period.",
    
    // Shifts
    "shifts": "Shifts",
    "started": "Started",
    "ended": "Ended",
    "opening_cash": "Opening Cash",
    "closing_cash": "Closing Cash",
    "no_shifts_found": "No shifts found for this period.",
    
    // Date Range
    "today": "Today",
    "yesterday": "Yesterday",
    "this_week": "This Week",
    "this_month": "This Month",
    "last_7_days": "Last 7 Days",
    "last_30_days": "Last 30 Days",
    
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
    
    // Staff Management
    "staff_management": "Staff Management",
    "manage_cashiers": "Manage your restaurant's cashiers",
    "add_cashier": "Add Cashier",
    "add_new_cashier": "Add New Cashier",
    "create_cashier_desc": "Create a new cashier account for your restaurant.",
    "create_cashier": "Create Cashier",
    "no_cashiers": "No cashiers yet. Add one to get started.",
    "no_email": "No email address",
    "enter_email": "Please enter an email address",
    "password_min": "Password must be at least 6 characters",
    "min_6_chars": "Minimum 6 characters",
    
    // Table Management
    "tables": "Tables",
    "tables_management": "Tables Management",
    "tables_desc": "Manage restaurant tables with QR codes for menu access",
    "add_table": "Add Table",
    "add_table_desc": "Create a new table with a unique QR code.",
    "edit_table": "Edit Table",
    "edit_table_desc": "Update the table name.",
    "table_name": "Table Name",
    "table_name_placeholder": "e.g., Table 1, Patio A",
    "number_of_chairs": "Number of Chairs",
    "no_tables": "No tables yet. Add your first table to get started.",
    "enter_table_name": "Please enter a table name",
    "link_copied": "Link copied to clipboard",
    "code": "Code",
    
    // Settings
    "restaurant_settings": "Restaurant Settings",
    "configure_preferences": "Configure your restaurant preferences",
    "currency": "Currency",
    "jordanian_dinar": "Jordanian Dinar (read-only)",
    "tax_settings": "Tax Settings",
    "tax_percentage": "Tax Percentage (%)",
    "prices_include_tax": "Prices include tax?",
    "menu_prices_include_tax": "Menu prices already include tax",
    "business_hours": "Business Hours",
    "sunday": "Sunday",
    "monday": "Monday",
    "tuesday": "Tuesday",
    "wednesday": "Wednesday",
    "thursday": "Thursday",
    "friday": "Friday",
    "saturday": "Saturday",
    
    // Discount Settings
    "discount_settings": "Discount Settings",
    "discount_settings_desc": "Configure discount rules for future use (configuration only)",
    "enable_discounts": "Enable Discounts",
    "allow_discounts": "Allow discounts to be configured",
    "discount_type": "Discount Type",
    "percentage": "Percentage (%)",
    "fixed_amount": "Fixed Amount",
    "max_discount_value": "Maximum Discount Value (optional)",
    "max_percent_desc": "Maximum percentage discount allowed",
    "max_fixed_desc": "Maximum fixed discount amount allowed",
    "save_discount_settings": "Save Discount Settings",
    "discount_settings_saved": "Discount settings saved",
    
    // Notifications
    "notifications_alerts": "Notifications & Alerts",
    "notifications_desc": "Proactive alerts about your restaurant performance",
    "all_clear": "All Clear!",
    "no_alerts": "No alerts or notifications at this time.",
    "sales_up": "Sales Up!",
    "sales_up_msg": "Today's sales are up {percent}% compared to yesterday ({today} vs {yesterday} {currency})",
    "sales_down": "Sales Down",
    "sales_down_msg": "Today's sales are down {percent}% compared to yesterday ({today} vs {yesterday} {currency})",
    "high_cancellations": "High Cancellation Rate",
    "high_cancellations_msg": "{percent}% of today's orders were cancelled ({cancelled} of {total})",
    "high_voids": "High Void Count",
    "high_voids_msg": "{count} items voided in the last 7 days. Consider reviewing with staff.",
    "long_shift": "Long Open Shift",
    "long_shift_msg": "A shift has been open for {hours} hours. Consider checking if it should be closed.",
    "high_discounts": "High Discount Usage",
    "high_discounts_msg": "{percent}% of today's sales were discounted ({amount} {currency})",
    "no_sales_today": "No Sales Today",
    "no_sales_today_msg": "No completed orders have been recorded today yet.",
    "great_performance": "Great Performance!",
    "great_performance_msg": "Operations are running smoothly with low cancellations and voids.",
    
    // CSV Upload
    "csv_upload": "CSV Upload",
    "csv_upload_desc": "Import menu items and offers from CSV files",
    "upload_menu_csv": "Upload Menu CSV",
    "menu_csv_columns": "Required columns: category_en, category_ar, item_en, item_ar, price",
    "upload_offers_csv": "Upload Offers CSV",
    "offers_csv_columns": "Required columns: item_en, item_ar, price, description_en, description_ar",
    "uploading": "Uploading...",
    "selected_file": "Selected",
    "csv_empty": "CSV file is empty or has no data rows",
    "missing_columns": "Missing required columns",
    "no_valid_rows": "No valid data rows found in CSV",
    "menu_csv_success": "Menu CSV uploaded successfully!",
    "offers_csv_success": "Offers CSV uploaded successfully!",
    "categories_created": "categories created",
    "items_created": "items created",
    "items_updated": "items updated",
    "offers_created": "offers created",
    "offers_updated": "offers updated",
    "successfully_processed": "Successfully processed",
    
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
    "save_changes": "حفظ التغييرات",
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
    "email": "البريد الإلكتروني",
    "password": "كلمة المرور",
    "status": "الحالة",
    "created": "تاريخ الإنشاء",
    "copy": "نسخ",
    "export_csv": "تصدير CSV",
    "custom": "مخصص",
    "open": "مفتوح",
    "closed": "مغلق",
    "unknown": "غير معروف",
    "page": "صفحة",
    "of": "من",
    "showing": "عرض",
    "to": "إلى",
    
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
    
    // Overview Dashboard
    "todays_sales": "مبيعات اليوم",
    "todays_orders": "طلبات اليوم",
    "open_shifts": "الورديات المفتوحة",
    "staff": "الموظفين",
    "opens_at": "يفتح الساعة",
    "opens_on": "يفتح",
    
    // Analytics
    "analytics_charts": "التحليلات والرسوم البيانية",
    "analytics_desc": "اتجاهات المبيعات، ساعات الذروة، وأداء الفئات",
    "sales_trend": "اتجاه المبيعات",
    "peak_hours": "ساعات الذروة",
    "category_performance": "أداء الفئات",
    "no_sales_data": "لا توجد بيانات مبيعات لهذه الفترة.",
    "no_order_data": "لا توجد بيانات طلبات لهذه الفترة.",
    "no_category_data": "لا توجد بيانات فئات لهذه الفترة.",
    "sales": "المبيعات",
    "orders": "الطلبات",
    
    // Reports
    "performance_metrics": "مقاييس الأداء",
    "total_sales": "إجمالي المبيعات",
    "number_of_orders": "عدد الطلبات",
    "total_discounts": "إجمالي الخصومات",
    "sales_by_cashier": "المبيعات حسب الكاشير",
    "no_sales_data_period": "لا توجد بيانات مبيعات لهذه الفترة.",
    
    // Best/Worst Sellers
    "best_worst_sellers": "الأكثر والأقل مبيعاً",
    "best_worst_desc": "تحديد العناصر الأكثر والأقل أداءً في القائمة",
    "top_5_best": "أفضل 5 مبيعاً",
    "bottom_5": "أقل 5 مبيعاً",
    "sold": "مباع",
    "not_enough_data": "لا توجد بيانات كافية لعرض الأقل مبيعاً.",
    
    // Cashier Performance
    "cashier_performance": "أداء الكاشير",
    "cashier_performance_desc": "تتبع المبيعات والخصومات والإلغاءات حسب الكاشير",
    "avg_order": "متوسط الطلب",
    "discounts_given": "الخصومات الممنوحة",
    "voided_items": "العناصر الملغاة",
    "cancelled_orders": "الطلبات الملغاة",
    "no_shift_data": "لا توجد بيانات ورديات لهذه الفترة.",
    
    // Shifts
    "shifts": "الورديات",
    "started": "البداية",
    "ended": "النهاية",
    "opening_cash": "النقد الافتتاحي",
    "closing_cash": "النقد الختامي",
    "no_shifts_found": "لا توجد ورديات لهذه الفترة.",
    
    // Date Range
    "today": "اليوم",
    "yesterday": "أمس",
    "this_week": "هذا الأسبوع",
    "this_month": "هذا الشهر",
    "last_7_days": "آخر 7 أيام",
    "last_30_days": "آخر 30 يوم",
    
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
    
    // Staff Management
    "staff_management": "إدارة الموظفين",
    "manage_cashiers": "إدارة كاشيرات مطعمك",
    "add_cashier": "إضافة كاشير",
    "add_new_cashier": "إضافة كاشير جديد",
    "create_cashier_desc": "إنشاء حساب كاشير جديد لمطعمك.",
    "create_cashier": "إنشاء كاشير",
    "no_cashiers": "لا يوجد كاشيرات بعد. أضف واحداً للبدء.",
    "no_email": "لا يوجد بريد إلكتروني",
    "enter_email": "الرجاء إدخال البريد الإلكتروني",
    "password_min": "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
    "min_6_chars": "6 أحرف على الأقل",
    
    // Table Management
    "tables": "الطاولات",
    "tables_management": "إدارة الطاولات",
    "tables_desc": "إدارة طاولات المطعم مع رموز QR للوصول للقائمة",
    "add_table": "إضافة طاولة",
    "add_table_desc": "إنشاء طاولة جديدة برمز QR فريد.",
    "edit_table": "تعديل الطاولة",
    "edit_table_desc": "تحديث اسم الطاولة.",
    "table_name": "اسم الطاولة",
    "table_name_placeholder": "مثال: طاولة 1، الشرفة أ",
    "number_of_chairs": "عدد الكراسي",
    "no_tables": "لا توجد طاولات بعد. أضف أول طاولة للبدء.",
    "enter_table_name": "الرجاء إدخال اسم الطاولة",
    "link_copied": "تم نسخ الرابط",
    "code": "الرمز",
    
    // Settings
    "restaurant_settings": "إعدادات المطعم",
    "configure_preferences": "تكوين تفضيلات مطعمك",
    "currency": "العملة",
    "jordanian_dinar": "دينار أردني (للقراءة فقط)",
    "tax_settings": "إعدادات الضريبة",
    "tax_percentage": "نسبة الضريبة (%)",
    "prices_include_tax": "الأسعار تشمل الضريبة؟",
    "menu_prices_include_tax": "أسعار القائمة تشمل الضريبة",
    "business_hours": "ساعات العمل",
    "sunday": "الأحد",
    "monday": "الاثنين",
    "tuesday": "الثلاثاء",
    "wednesday": "الأربعاء",
    "thursday": "الخميس",
    "friday": "الجمعة",
    "saturday": "السبت",
    
    // Discount Settings
    "discount_settings": "إعدادات الخصم",
    "discount_settings_desc": "تكوين قواعد الخصم للاستخدام المستقبلي (إعداد فقط)",
    "enable_discounts": "تفعيل الخصومات",
    "allow_discounts": "السماح بتكوين الخصومات",
    "discount_type": "نوع الخصم",
    "percentage": "نسبة مئوية (%)",
    "fixed_amount": "مبلغ ثابت",
    "max_discount_value": "الحد الأقصى للخصم (اختياري)",
    "max_percent_desc": "الحد الأقصى لنسبة الخصم المسموح بها",
    "max_fixed_desc": "الحد الأقصى لمبلغ الخصم الثابت المسموح به",
    "save_discount_settings": "حفظ إعدادات الخصم",
    "discount_settings_saved": "تم حفظ إعدادات الخصم",
    
    // Notifications
    "notifications_alerts": "الإشعارات والتنبيهات",
    "notifications_desc": "تنبيهات استباقية حول أداء مطعمك",
    "all_clear": "كل شيء على ما يرام!",
    "no_alerts": "لا توجد تنبيهات أو إشعارات في الوقت الحالي.",
    "sales_up": "ارتفاع المبيعات!",
    "sales_up_msg": "مبيعات اليوم ارتفعت بنسبة {percent}% مقارنة بالأمس ({today} مقابل {yesterday} {currency})",
    "sales_down": "انخفاض المبيعات",
    "sales_down_msg": "مبيعات اليوم انخفضت بنسبة {percent}% مقارنة بالأمس ({today} مقابل {yesterday} {currency})",
    "high_cancellations": "نسبة إلغاء عالية",
    "high_cancellations_msg": "{percent}% من طلبات اليوم تم إلغاؤها ({cancelled} من {total})",
    "high_voids": "عدد إلغاءات عالي",
    "high_voids_msg": "{count} عنصر ملغي في آخر 7 أيام. يُنصح بالمراجعة مع الموظفين.",
    "long_shift": "وردية مفتوحة طويلة",
    "long_shift_msg": "وردية مفتوحة منذ {hours} ساعة. يُنصح بالتحقق إذا كان يجب إغلاقها.",
    "high_discounts": "استخدام خصومات عالي",
    "high_discounts_msg": "{percent}% من مبيعات اليوم كانت مخصومة ({amount} {currency})",
    "no_sales_today": "لا مبيعات اليوم",
    "no_sales_today_msg": "لم يتم تسجيل أي طلبات مكتملة اليوم بعد.",
    "great_performance": "أداء رائع!",
    "great_performance_msg": "العمليات تسير بسلاسة مع إلغاءات منخفضة.",
    
    // CSV Upload
    "csv_upload": "رفع ملف CSV",
    "csv_upload_desc": "استيراد عناصر القائمة والعروض من ملفات CSV",
    "upload_menu_csv": "رفع ملف CSV للقائمة",
    "menu_csv_columns": "الأعمدة المطلوبة: category_en، category_ar، item_en، item_ar، price",
    "upload_offers_csv": "رفع ملف CSV للعروض",
    "offers_csv_columns": "الأعمدة المطلوبة: item_en، item_ar، price، description_en، description_ar",
    "uploading": "جار الرفع...",
    "selected_file": "المحدد",
    "csv_empty": "ملف CSV فارغ أو لا يحتوي على بيانات",
    "missing_columns": "أعمدة مطلوبة مفقودة",
    "no_valid_rows": "لم يتم العثور على صفوف بيانات صالحة في CSV",
    "menu_csv_success": "تم رفع ملف CSV للقائمة بنجاح!",
    "offers_csv_success": "تم رفع ملف CSV للعروض بنجاح!",
    "categories_created": "فئات تم إنشاؤها",
    "items_created": "عناصر تم إنشاؤها",
    "items_updated": "عناصر تم تحديثها",
    "offers_created": "عروض تم إنشاؤها",
    "offers_updated": "عروض تم تحديثها",
    "successfully_processed": "تمت المعالجة بنجاح",
    
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
