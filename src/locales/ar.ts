// Arabic translations for Kastana POS
export default {
  // Restaurant Operational States
  status_inactive: "غير نشط",
  status_setup_incomplete: "نشط – إعداد غير مكتمل",
  status_ready: "نشط – جاهز",
  status_setup_explanation: "المطعم نشط، لكن بعض الميزات غير مفعّلة (مثل الاشتراك أو الإضافات).",
  
  // Offers Status Card
  offers_status_title: "حالة العروض",
  offers_status_tooltip: "عرض الحالة الحالية لفئة العروض بدون الذهاب لإدارة القائمة",
  offer_status_active: "عرض نشط",
  offer_status_scheduled: "عرض مجدول",
  offer_status_expired: "انتهى العرض",
  offer_status_none: "لا يوجد عروض نشطة",
  offer_status_disabled: "العروض معطلة",
  starts_from: "يبدأ من",
  ends_at: "ينتهي في",
  offers_auto_visible_hint: "جميع العروض مفعّلة تلقائيًا خلال هذه المدة",
  no_offers_category_hint: "لا توجد فئة عروض",
  offers_always_visible_hint: "العروض مرئية دائماً عندما تكون الفئة مفعّلة",

  // System Health Snapshot
  health_title: "الحالة",
  health_restaurant: "المطعم",
  health_inventory: "المخزون",
  health_shift: "الوردية",
  health_qr_orders: "طلبات QR",
  health_enabled: "مفعّل",
  health_disabled: "معطّل",
  health_shift_open: "مفتوحة",
  health_shift_closed: "مغلقة",
  health_qr_pending: "قيد الانتظار",
  health_qr_none: "لا يوجد",
  // Owner Error Messages (subscription/permission errors)
  error_unexpected_owner_title: "حدث خطأ ما",
  error_unexpected_owner_desc: "يرجى المحاولة مرة أخرى أو التواصل مع الدعم إذا استمرت المشكلة.",
  error_owner_permission_title: "الإجراء غير مسموح",
  error_owner_permission_desc: "قد يكون اشتراكك قد انتهى. يرجى التواصل مع الدعم للتجديد.",
  error_owner_duplicate_title: "موجود مسبقاً",
  error_owner_duplicate_desc: "هذا العنصر موجود مسبقاً. يرجى استخدام اسم مختلف.",
  error_owner_not_found_title: "غير موجود",
  error_owner_not_found_desc: "لم يتم العثور على العنصر المطلوب.",
  error_owner_network_title: "خطأ في الاتصال",
  error_owner_network_desc: "يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.",
  error_owner_restaurant_mismatch_title: "عدم تطابق المطعم",
  error_owner_restaurant_mismatch_desc: "هذا الإجراء غير مسموح لهذا المطعم.",
  error_owner_branch_active_cashiers_title: "لا يمكن حذف الفرع",
  error_owner_branch_active_cashiers_desc: "يرجى إلغاء تفعيل جميع الكاشيرات في هذا الفرع أولاً.",
  error_owner_branch_open_shifts_title: "لا يمكن حذف الفرع",
  error_owner_branch_open_shifts_desc: "يرجى إغلاق جميع الورديات المفتوحة في هذا الفرع أولاً.",
  // Cash difference labels (shift close)
  shift_cash_difference: "فرق النقد",
  shift_cash_over: "زيادة نقدية",
  shift_cash_short: "نقص نقدي",
  shift_cash_match: "متطابق",
  calculating_expected_cash: "جارِ حساب النقد المتوقع...",
  failed_to_load_expected_cash: "فشل تحميل النقد المتوقع. يرجى المحاولة مرة أخرى.",
  
  // Cash Differences Card (Owner Dashboard)
  cash_diff_title: "فروقات النقد – اليوم",
  cash_diff_desc: "فروقات درج النقد من الورديات المغلقة",
  cash_diff_closed_shifts: "الورديات المغلقة",
  cash_diff_total: "إجمالي الفروقات",
  cash_diff_username: "اسم المستخدم",
  cash_diff_shift_id: "رقم الوردية",
  cash_diff_expected: "النقد المتوقع",
  cash_diff_actual: "النقد الفعلي",
  cash_diff_difference: "فرق النقد",
  cash_diff_tooltip: "الفرق بين النقد المتوقع والمُدخل عند إغلاق الوردية",
  cash_diff_shortage: "نقص نقدي",
  cash_diff_excess: "زيادة نقدية",
  cash_diff_empty: "لا توجد فروقات نقد اليوم",
  // Menu page - phone & table
  menu_phone_label: "رقم الهاتف (اختياري)",
  menu_phone_placeholder: "+962 7XX XXX XXX",
  menu_phone_error: "الرجاء إدخال رقم هاتف صحيح (7-15 رقم)",
  menu_table_not_found: "الطاولة غير موجودة",
  menu_table_inactive: "الطاولة غير نشطة",
  // Common
  sign_out: "تسجيل الخروج",
  save: "حفظ",
  save_changes: "حفظ التغييرات",
  cancel: "إلغاء",
  edit: "تعديل",
  delete: "حذف",
  create: "إنشاء",
  add: "إضافة",
  close: "إغلاق",
  confirm: "تأكيد",
  continue: "متابعة",
  loading: "جار التحميل...",
  processing: "جار المعالجة...",
  active: "نشط",
  inactive: "غير نشط",
  default: "افتراضي",
  disabled: "معطل",
  name: "الاسم",
  optional: "اختياري",
  email: "البريد الإلكتروني",
  password: "كلمة المرور",
  status: "الحالة",
  created: "تاريخ الإنشاء",
  copy: "نسخ",
  export_csv: "تصدير CSV",
  custom: "مخصص",
  open: "مفتوح",
  closed: "مغلق",
  closed_tooltip: "مغلق — لا توجد وردية مفتوحة حالياً.",
  unknown: "غير معروف",
  page: "صفحة",
  of: "من",
  showing: "عرض",
  to: "إلى",
  actions: "الإجراءات",
  action: "الإجراء",
  entity: "الكيان",
  timestamp: "الوقت",
  back: "رجوع",
  print: "طباعة",
  refund: "استرجاع",
  total: "الإجمالي",
  subtotal: "المجموع الفرعي",
  discount: "الخصم",
  tax: "الضريبة",
  service_charge: "رسوم الخدمة",
  rounding_adjustment: "التقريب",
  items: "عناصر",
  reason: "السبب",
  amount: "المبلغ",
  exact: "المبلغ بالضبط",
  reset: "إعادة تعيين",
  fill: "ملء",
  fill_remaining: "ملء المبلغ المتبقي",
  remaining_must_be_zero: "يجب أن يكون المتبقي 0.000 للإكمال",
  overpayment_cash_only: "الدفع الزائد مسموح فقط للنقد (الباقي)",

  // Restaurant inactive
  restaurant_inactive_title: "المطعم غير نشط",
  restaurant_inactive_message: "هذا المطعم غير نشط حالياً. يرجى التواصل مع الدعم.",
  owner_dashboard: "لوحة تحكم المالك",
  dashboard: "لوحة التحكم",
  system_admin: "مدير النظام",
  cashier: "كاشير",
  owner: "مالك",
  your_restaurant_info: "معلومات مطعمك",
  edit_name: "تعديل الاسم",
  edit_restaurant_name: "تعديل اسم المطعم",
  update_restaurant_name: "تحديث اسم مطعمك.",
  restaurant_name: "اسم المطعم",

  // Navigation
  overview: "نظرة عامة",
  analytics: "التحليلات",
  reports: "التقارير",
  menu: "القائمة",
  manage: "الإدارة",
  branches: "الفروع",
  inventory: "المخزون",
  inventory_coming_soon: "إدارة المخزون قريباً",
  settings: "الإعدادات",

  // Inventory Dashboard
  inv_low_stock: "مخزون منخفض",
  inv_low_stock_desc: "الأصناف أقل من الحد الأدنى",
  inv_no_low_stock: "لا توجد أصناف منخفضة المخزون",
  inv_near_reorder: "قريب من إعادة الطلب",
  inv_near_reorder_desc: "الأصناف التي تقترب من نقطة إعادة الطلب",
  inv_no_reorder_needed: "لا حاجة لإعادة الطلب",
  inv_recent_transactions: "الحركات الأخيرة",
  inv_recent_transactions_desc: "آخر 10 حركات مخزون",
  inv_no_transactions: "لا توجد حركات حديثة",
  inv_waste_summary: "الهدر (7 أيام)",
  inv_waste_summary_desc: "إجمالي الهدر في آخر 7 أيام",
  inv_no_waste: "لا يوجد هدر مسجل",
  inv_txn_purchase_receipt: "شراء",
  inv_txn_adjustment_in: "تعديل +",
  inv_txn_adjustment_out: "تعديل -",
  inv_txn_adjustment: "تسوية مخزون",
  inv_txn_waste: "هدر",
  inv_txn_transfer_out: "نقل صادر",
  inv_txn_transfer_in: "نقل وارد",
  inv_txn_transfer: "تحويل مخزون",
  inv_txn_stock_count_adjustment: "تعديل جرد",
  inv_txn_initial_stock: "مخزون ابتدائي",
  inv_txn_sale: "بيع",
  inv_txn_unknown: "عملية مخزون",

  // Inventory Items List
  inv_dashboard: "لوحة التحكم",
  inv_items: "الأصناف",
  inv_items_list: "أصناف المخزون",
  inv_items_list_desc: "عرض وإدارة أصناف المخزون",
  inv_search_items: "بحث عن أصناف...",
  inv_all_items: "كل الأصناف",
  inv_low_stock_only: "المخزون المنخفض فقط",
  inv_no_items: "لا توجد أصناف مخزون",
  inv_item_name: "اسم الصنف",
  inv_item_name_placeholder: "مثال: طماطم",
  inv_on_hand: "الكمية المتوفرة",
  inv_min_level: "الحد الأدنى",
  inv_reorder_point: "نقطة إعادة الطلب",
  inv_base_unit: "وحدة القياس",
  inv_edit_item: "تعديل الصنف",
  inv_edit_item_desc: "تحديث إعدادات الصنف",
  inv_item_active: "الصنف نشط",
  inv_item_active_desc: "الأصناف غير النشطة لن تظهر في العمليات",
  inv_name_required: "اسم الصنف مطلوب",
  inv_invalid_values: "الحد الأدنى ونقطة إعادة الطلب يجب أن تكون موجبة",
  inv_item_updated: "تم تحديث الصنف بنجاح",
  inv_update_failed: "فشل تحديث الصنف",
  inv_item_transactions: "حركات الصنف",
  inv_transactions_for: "سجل الحركات لـ",
  inv_import_csv: "استيراد CSV",
  inv_export_csv: "تصدير CSV",
  inv_import_csv_desc: "استيراد أصناف المخزون من ملف CSV",
  inv_csv_file: "ملف CSV",
  inv_click_to_upload: "انقر لرفع ملف CSV",
  inv_csv_columns: "الأعمدة المطلوبة",
  inv_csv_note_quantity: "عمود الكمية سيُضيف للمخزون (لن يستبدل الموجود).",
  inv_select_branch_file: "الرجاء اختيار فرع وملف",
  inv_select_file: "الرجاء اختيار ملف",
  inv_unit_not_found: "الوحدة غير موجودة",
  inv_branch_not_found: "الفرع غير موجود",
  inv_unit_mismatch: "عدم تطابق الوحدة مع الصنف الموجود",
  inv_import_success: "تم الاستيراد",
  inv_import_failed: "فشل الاستيراد",
  inv_import: "استيراد",
  inv_transaction_failed: "فشل إضافة المخزون",
  inv_stock_added: "كميات مخزون مُضافة",
  inv_items_reused: "أصناف موجودة متطابقة",
  inv_import_warning_title: "تنبيه هام",
  inv_import_warning_msg: "هذا الاستيراد سيُضيف الكميات للمخزون الحالي. الكميات الموجودة لن تُستبدل.",
  inv_confirm_import: "تأكيد الاستيراد",
  existing: "الحالي",

  // Inventory Operations
  inv_new_operation: "عملية جديدة",
  inv_receive_purchase: "استلام مشتريات",
  inv_receive_purchase_desc: "تسجيل البضاعة الواردة من الموردين",
  inv_adjustment: "تعديل",
  inv_adjustment_desc: "تعديل مستويات المخزون زيادة أو نقصان",
  inv_waste: "هدر",
  inv_waste_desc: "تسجيل العناصر التالفة أو المهدرة",
  inv_transfer: "نقل",
  inv_transfer_desc: "نقل الأصناف بين الفروع",
  inv_stock_count: "جرد المخزون",
  inv_stock_count_desc: "جرد فعلي للمخزون",
  inv_supplier: "المورد",
  inv_supplier_name: "اسم المورد",
  inv_select_supplier: "اختر المورد",
  inv_supplier_created: "تم إنشاء المورد",
  inv_receipt_no: "رقم الفاتورة",
  inv_receipt_no_placeholder: "مثال: INV-001",
  inv_unit_cost: "التكلفة",
  inv_unit_cost_helper: "اختياري – اتركه فارغاً إذا كان غير معروف",
  inv_add_line: "إضافة سطر",
  inv_select_item: "اختر الصنف",
  inv_qty: "الكمية",
  inv_unit: "الوحدة",
  inv_notes: "ملاحظات",
  inv_notes_placeholder: "ملاحظات اختيارية...",
  inv_submit_receive: "استلام البضاعة",
  inv_purchase_received: "تم استلام المشتريات بنجاح",
  inv_add_items: "الرجاء إضافة صنف واحد على الأقل",
  inv_adjustment_type: "نوع التعديل",
  inv_increase: "زيادة",
  inv_decrease: "نقصان",
  inv_item: "الصنف",
  inv_select_reason: "اختر السبب",
  inv_fill_required: "الرجاء ملء جميع الحقول المطلوبة",
  inv_qty_positive: "الكمية يجب أن تكون أكبر من صفر",
  inv_qty_must_be_positive: "الكمية يجب أن تكون أكبر من صفر.",
  inv_item_no_unit: "هذا الصنف لم يتم تعريف وحدة مخزون له. يرجى تهيئة الصنف أولاً.",
  inv_select_item_first: "اختر صنفاً أولاً",
  inv_submit_adjustment: "تأكيد التعديل",
  inv_adjustment_created: "تم تسجيل التعديل",
  inv_reason_correction: "تصحيح جرد",
  inv_reason_damaged: "تلف",
  inv_reason_prep_error: "خطأ تحضير",
  inv_reason_staff_use: "استخدام موظفين",
  inv_reason_sample: "عينة / تذوق",
  inv_waste_expired: "منتهي الصلاحية",
  inv_waste_spoiled: "فاسد",
  inv_waste_damaged: "تالف",
  inv_waste_dropped: "مكسور/مسكوب",
  inv_waste_other: "أخرى",
  inv_record_waste: "تسجيل الهدر",
  inv_waste_recorded: "تم تسجيل الهدر",
  inv_from_branch: "من الفرع",
  inv_to_branch: "إلى الفرع",
  inv_select_branches: "اختر الفرعين",
  inv_different_branches: "اختر فروع مختلفة",
  inv_submit_transfer: "إتمام النقل",
  inv_transfer_complete: "تم النقل بنجاح",
  inv_operation_failed: "فشلت العملية",
  inv_count_list: "الجرد",
  inv_new_count: "جرد جديد",
  inv_count_items: "عد الأصناف",
  inv_no_counts: "لا يوجد جرد",
  inv_status_draft: "مسودة",
  inv_status_submitted: "مقدم",
  inv_status_approved: "معتمد",
  inv_status_cancelled: "ملغي",
  inv_continue_count: "متابعة",
  inv_submit_count: "تقديم",
  inv_approve: "اعتماد",
  inv_awaiting_approval: "بانتظار الاعتماد",
  inv_count_notes_placeholder: "ملاحظات الجرد...",
  inv_create_count: "إنشاء جرد",
  inv_count_created: "تم إنشاء الجرد",
  inv_count_submitted: "تم تقديم الجرد",
  inv_count_approved: "تم اعتماد الجرد",
  inv_count_cancelled: "تم إلغاء الجرد",
  inv_no_items_to_count: "لا توجد أصناف للعد",
  inv_no_items_in_branch: "لا توجد أصناف في هذا الفرع",
  inv_expected: "المتوقع",
  inv_variance: "الفرق",
  inv_theoretical: "النظري",
  inv_actual: "الفعلي",
  inv_total_items: "إجمالي الأصناف",
  inv_counted: "تم العد",
  inv_overage: "زيادة",
  inv_shortage: "نقص",
  inv_create_first_count: "إنشاء أول جرد",
  inv_cancel_count: "إلغاء الجرد",
  inv_cancel_count_title: "إلغاء الجرد",
  inv_cancel_reason: "سبب الإلغاء",
  inv_confirm_cancel: "تأكيد الإلغاء",
  inv_approve_count_title: "اعتماد الجرد",
  inv_confirm_approve: "اعتماد الجرد",
  inv_approved_at: "تم الاعتماد",
  inv_with_variance: "بفروقات",
  inv_no_variance: "لا توجد فروقات",
  inv_owner_only_feature: "هذه الميزة متاحة للمالك فقط.",
  inv_stock_count_history: "سجل الجرد",
  inv_stock_count_history_desc: "عرض عمليات الجرد المكتملة والملغاة",
  inv_no_history: "لا يوجد سجل",
  inv_count_date: "تاريخ الجرد",
  inv_approved_by: "اعتمد بواسطة",
  inv_count_details: "تفاصيل الجرد",
  view_details: "عرض التفاصيل",
  access_denied: "غير مصرح",
  view: "عرض",

  // Inventory Insights
  inv_insights: "رؤية المخزون",
  inv_insights_desc: "تحليلات الفروقات والتنبيهات الذكية",
  inv_variance_trends: "اتجاهات الفروقات",
  inv_top_variance: "أعلى الفروقات",
  inv_breakdown: "التوزيع",
  inv_alerts: "التنبيهات",
  trends: "الاتجاهات",
  top: "الأعلى",
  breakdown: "التوزيع",
  alerts: "تنبيهات",
  inv_total_overage: "إجمالي الزيادة",
  inv_total_shortage: "إجمالي النقص",
  inv_net_variance: "صافي الفروقات",
  inv_counts_approved: "عمليات الجرد المعتمدة",
  counts: "عمليات",
  inv_variance_over_time: "الفروقات عبر الزمن",
  inv_variance_over_time_desc: "تتبع اتجاهات الزيادة والنقص",
  inv_no_variance_data: "لا توجد بيانات فروقات",
  inv_no_variance_data_hint: "اعتمد عمليات الجرد لمشاهدة اتجاهات الفروقات",
  overage: "زيادة",
  shortage: "نقص",
  inv_variance_by_branch: "الفروقات حسب الفرع",
  last_60_days: "آخر 60 يوم",
  last_90_days: "آخر 90 يوم",
  daily: "يومي",
  weekly: "أسبوعي",
  inv_top_variance_items: "أصناف أعلى فروقات",
  inv_top_variance_items_desc: "الأصناف ذات أعلى فروقات بالكمية أو القيمة",
  by_quantity: "بالكمية",
  by_value: "بالقيمة",
  inv_variance_qty: "كمية الفرق",
  inv_variance_value: "قيمة الفرق",
  inv_occurrences: "التكرار",
  inv_no_variance_items: "لا توجد أصناف بفروقات",
  inv_breakdown_by_reason: "التوزيع حسب السبب",
  inv_breakdown_by_reason_desc: "توزيع حركات المخزون",
  inv_no_breakdown_data: "لا توجد بيانات للتوزيع",
  inv_reason_details: "تفاصيل الأسباب",
  inv_reason_usage: "الاستخدام (المبيعات)",
  inv_reason_waste: "الهدر",
  inv_reason_refund: "الاسترجاعات",
  inv_reason_adjustment: "التعديلات",
  inv_qty_label: "الكمية",
  inv_value_label: "القيمة",
  inv_transactions_label: "المعاملات",
  inv_breakdown_by_branch: "التوزيع حسب الفرع",
  inv_smart_alerts: "التنبيهات الذكية",
  inv_smart_alerts_desc: "أنماط مكتشفة تتطلب الانتباه",
  critical: "حرج",
  warnings: "تحذيرات",
  inv_no_alerts: "لا توجد تنبيهات",
  inv_no_alerts_desc: "أنماط فروقات المخزون تبدو سليمة",
  inv_why_triggered: "سبب هذا التنبيه",
  inv_what_to_review: "ما يجب مراجعته",
  current: "الحالي",
  previous: "السابق",
  change: "التغيير",
  occurrences: "التكرار",

  // Consumption Variance Analysis
  inv_consumption: "الاستهلاك",
  inv_consumption_variance: "فروقات الاستهلاك",
  inv_consumption_variance_desc: "مقارنة الاستهلاك النظري والفعلي",
  inv_items_analyzed: "الأصناف المحللة",
  inv_over_consumption: "استهلاك زائد",
  inv_under_consumption: "استهلاك أقل",
  inv_cost_impact: "تأثير التكلفة",
  inv_tagging_progress: "تقدم التصنيف",
  tagged: "مصنف",
  untagged: "غير مصنف",
  inv_variance_details: "تفاصيل الفروقات",
  inv_variance_pct: "نسبة الفرق",
  inv_root_cause: "السبب الجذري",
  inv_tag_variance: "تصنيف الفرق",
  inv_tag_notes_placeholder: "أضف ملاحظات حول هذا الفرق...",
  remove: "إزالة",
  last_month: "الشهر الماضي",
  select_branch: "اختر الفرع",

  operational_status: "الحالة التشغيلية",
  attention_required: "يتطلب الانتباه",
  todays_sales: "مبيعات اليوم",
  todays_orders: "طلبات اليوم",
  open_shifts: "الورديات المفتوحة",
  oldest: "الأقدم",
  staff: "الموظفين",
  opens_at: "يفتح الساعة",
  opens_on: "يفتح",
  shift_already_open_at_branch: "توجد وردية مفتوحة بالفعل في هذا الفرع. يرجى إغلاقها قبل فتح وردية جديدة.",
  
  // Operational Status Tooltips
  status_tooltip: "هل المطعم مفتوح حالياً بناءً على ساعات العمل.",
  sales_tooltip: "إجمالي الإيرادات من الطلبات المدفوعة اليوم.",
  orders_tooltip: "عدد الطلبات المكتملة اليوم.",
  shifts_tooltip: "الورديات المفتوحة حالياً. الورديات الطويلة (+10 ساعات) تظهر بشكل مميز.",
  tables_tooltip: "إجمالي عدد الطاولات النشطة في مطعمك.",
  staff_tooltip: "إجمالي عدد الموظفين النشطين (الكاشير والمطبخ).",

  // Analytics
  analytics_charts: "التحليلات والرسوم البيانية",
  analytics_desc: "اتجاهات المبيعات، ساعات الذروة، وأداء الفئات",
  sales_trend: "اتجاه المبيعات",
  peak_hours: "ساعات الذروة",
  category_performance: "أداء الفئات",
  no_sales_data: "لا توجد بيانات مبيعات لهذه الفترة.",
  no_order_data: "لا توجد بيانات طلبات لهذه الفترة.",
  no_category_data: "لا توجد بيانات فئات لهذه الفترة.",
  sales: "المبيعات",
  orders: "الطلبات",

  // Reports
  performance_metrics: "مقاييس الأداء",
  total_sales: "إجمالي المبيعات",
  net_sales: "صافي المبيعات",
  number_of_orders: "عدد الطلبات",
  total_orders: "إجمالي الطلبات",
  total_discounts: "إجمالي الخصومات",
  sales_by_cashier: "المبيعات حسب الكاشير",
  no_sales_data_period: "لا توجد بيانات مبيعات لهذه الفترة.",

  // Audit logs
  audit_logs: "سجل المراجعة",
  audit_logs_desc: "عرض سجل النشاط لمطعمك",
  no_audit_logs: "لا توجد سجلات مراجعة.",

  // Best/Worst sellers
  best_worst_sellers: "الأكثر والأقل مبيعاً",
  best_worst_desc: "تحديد العناصر الأكثر والأقل أداءً في القائمة",
  top_5_best: "أفضل 5 مبيعاً",
  bottom_5: "أقل 5 مبيعاً",
  sold: "مباع",
  not_enough_data: "لا توجد بيانات كافية لعرض الأقل مبيعاً.",

  // Cashier performance
  cashier_performance: "أداء الكاشير",
  cashier_performance_desc: "تتبع المبيعات والخصومات والإلغاءات حسب الكاشير",
  avg_order: "متوسط الطلب",
  discounts_given: "الخصومات الممنوحة",
  voided_items: "العناصر الملغاة",
  cancelled_orders: "الطلبات الملغاة",
  no_shift_data: "لا توجد بيانات ورديات لهذه الفترة.",

  // Shifts
  shifts: "الورديات",
  shift: "الوردية",
  started: "البداية",
  ended: "النهاية",
  opening_cash: "النقد الافتتاحي",
  closing_cash: "النقد الختامي",
  expected_cash: "النقد المتوقع",
  actual_cash: "النقد الفعلي",
  difference: "الفرق",
  no_shifts_found: "لا توجد ورديات لهذه الفترة.",
  shift_open: "الوردية مفتوحة",
  shift_closed: "الوردية مغلقة",
  open_shift: "فتح الوردية",
  close_shift: "إغلاق الوردية",
  enter_opening_cash: "أدخل مبلغ النقد الافتتاحي لبدء ورديتك",
  enter_closing_cash: "عدّ درجك وأدخل مبلغ النقد الختامي",
  shift_start_time: "وقت بدء الوردية",
  shift_opened: "تم فتح الوردية",
  shift_closed_msg: "تم إغلاق الوردية",
  cannot_close_held_orders: "لا يمكن إغلاق الوردية مع وجود طلبات معلقة. يرجى حلها أولاً.",

  // Date filters
  today: "اليوم",
  yesterday: "أمس",
  this_week: "هذا الأسبوع",
  this_month: "هذا الشهر",
  last_7_days: "آخر 7 أيام",
  last_30_days: "آخر 30 يوم",

  // Branch management
  branch_management: "إدارة الفروع",
  manage_restaurant_branches: "إدارة فروع المطعم",
  select_branch_first: "اختر الفرع أولاً",
  branch: "الفرع",
  branches_management: "إدارة الفروع",
  add_branch: "إضافة فرع",
  add_new_branch: "أضف فرعاً جديداً للمطعم",
  edit_branch: "تعديل الفرع",
  branch_name: "اسم الفرع",
  branch_name_required: "اسم الفرع *",
  branch_name_placeholder: "مثال: فرع الشميساني",
  branch_code: "الرمز",
  branch_code_placeholder: "مثال: SHM",
  branch_address: "العنوان",
  full_address: "العنوان الكامل",
  branch_phone: "رقم الهاتف",
  set_default: "تعيين كافتراضي",
  cannot_delete_default: "لا يمكن حذف الفرع الافتراضي",
  confirm_delete_branch: "حذف الفرع؟",
  delete_branch_warning: "سيتم حذف الفرع نهائياً",
  cannot_delete_branch: "لا يمكن حذف الفرع",
  branch_has_active_cashiers: "هذا الفرع لديه كاشيرات نشطون. يرجى إلغاء تفعيلهم أو إعادة تعيينهم أولاً.",
  branch_has_open_shifts: "هذا الفرع لديه ورديات مفتوحة. يرجى إغلاق جميع الورديات قبل الحذف.",
  no_branches_add: "لا توجد فروع. أضف فرعاً للبدء.",

  // Branch prices/promos
  branch_prices_promos: "أسعار وعروض الفرع",
  manage_prices_promos: "إدارة الأسعار والعروض لكل فرع",
  select_branch_to_manage: "يجب اختيار فرع من القائمة أعلاه لإدارة الأسعار والعروض",
  copy_from_branch: "نسخ من فرع",
  all_categories: "كل الأصناف",
  selected: "محدد",
  available: "متوفر",
  unavailable: "غير متوفر",
  active_status: "نشط",
  disabled_status: "معطل",
  promo: "عرض",
  deselect: "إلغاء التحديد",
  select_all: "تحديد الكل",
  no_items: "لا توجد أصناف",
  uncategorized: "غير مصنف",
  offer: "عرض",
  custom_price: "سعر مخصص",
  edit_item: "تعديل الصنف",
  base_price: "السعر الأساسي",
  branch_price: "سعر الفرع (اتركه فارغاً لاستخدام السعر الأساسي)",
  promo_settings: "إعدادات العرض",
  promo_price: "سعر العرض",
  promo_label: "نص العرض",
  promo_label_placeholder: "مثال: خصم 20%",
  promo_start: "بداية العرض",
  promo_end: "نهاية العرض",
  apply_promo: "تطبيق العرض",
  apply_promo_to_selected: "تطبيق العرض على العناصر المحددة",
  copy_prices: "نسخ الأسعار",
  copy_prices_from_branch: "نسخ الأسعار من فرع آخر لهذا الفرع",
  source_branch: "الفرع المصدر",
  select_source_branch: "اختر الفرع المصدر",
  include_promos: "تضمين العروض",
  copy_promo_settings: "نسخ إعدادات العروض أيضاً",
  for_sale: "للبيع",
  item_must_be_active: "يجب تفعيل الصنف لتغيير التوفر",
  mark_unavailable: "تحديد كغير متوفر",
  mark_available: "تحديد كمتوفر",
  disable_item: "تعطيل الصنف",
  enable_item: "تفعيل الصنف",

  // Menu management
  menu_categories: "فئات القائمة",
  menu_items: "عناصر القائمة",
  add_category: "إضافة فئة",
  add_item: "إضافة عنصر",
  category_name: "اسم الفئة",
  item_name: "اسم العنصر",
  price: "السعر",
  description: "الوصف",
  organize_menu: "نظّم قائمتك بالفئات",
  manage_menu_items: "إدارة عناصر القائمة",
  create_category: "إنشاء فئة",
  add_new_category: "إضافة فئة جديدة للقائمة.",
  edit_category: "تعديل الفئة",
  update_category: "تحديث اسم الفئة.",
  create_menu_item: "إنشاء عنصر",
  add_new_item: "إضافة عنصر جديد للقائمة.",
  edit_menu_item: "تعديل العنصر",
  update_item: "تحديث تفاصيل العنصر.",
  select_category: "اختر الفئة",
  choose_category: "اختر فئة",
  mark_as_offer: "تحديد كعرض",
  description_optional: "الوصف (اختياري)",

  // Item Type Classification
  item_type: "نوع الصنف",
  item_type_drink: "مشروب",
  item_type_food: "وجبة",
  item_type_ready_product: "منتج جاهز",
  item_type_addon: "إضافة",
  item_type_service: "خدمة",
  item_type_combo: "كومبو",
  items_require_recipe: "أصناف تتطلب وصفة",
  items_without_recipe: "أصناف بلا وصفة",
  items_no_recipe_needed: "أصناف لا تحتاج وصفة",
  filter_by_item_type: "تصفية حسب النوع",

  // Staff management
  staff_management: "إدارة الموظفين",
  manage_cashiers: "إدارة كاشيرات مطعمك",
  manage_staff_desc: "إدارة كاشيرات وموظفي المطبخ لمطعمك",
  add_cashier: "إضافة كاشير",
  add_new_cashier: "إضافة كاشير جديد",
  create_cashier_desc: "إنشاء حساب كاشير جديد لمطعمك.",
  create_cashier: "إنشاء كاشير",
  no_cashiers: "لا يوجد كاشيرات بعد. أضف واحداً للبدء.",
  cashiers: "الكاشيرات",
  kitchen_staff: "موظفو المطبخ",
  add_kitchen_staff: "إضافة موظف مطبخ",
  add_new_kitchen_staff: "إضافة موظف مطبخ جديد",
  create_kitchen_desc: "إنشاء حساب موظف مطبخ جديد لمطعمك.",
  create_kitchen_staff: "إنشاء موظف مطبخ",
  no_kitchen_staff: "لا يوجد موظفي مطبخ بعد. أضف واحداً للبدء.",
  no_email: "لا يوجد بريد إلكتروني",
  enter_email: "الرجاء إدخال البريد الإلكتروني",
  password_min: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  min_6_chars: "6 أحرف على الأقل",
  reset_password: "إعادة تعيين كلمة المرور",
  reset_password_for: "أدخل كلمة المرور الجديدة لـ",
  new_password: "كلمة المرور الجديدة",
  confirm_reset_password: "تأكيد إعادة تعيين كلمة المرور",
  confirm_reset_password_desc: "هل أنت متأكد من إعادة تعيين كلمة المرور لـ",
  password_reset_success: "تم إعادة تعيين كلمة المرور بنجاح",
  password_reset_failed: "فشل إعادة تعيين كلمة المرور",

  // Tables
  tables: "الطاولات",
  tables_management: "إدارة الطاولات",
  tables_desc: "إدارة طاولات المطعم مع رموز QR للوصول للقائمة",
  qr_order_disabled_info: "QR Order غير مفعّل لهذا المطعم",
  add_table: "إضافة طاولة",
  add_table_desc: "إنشاء طاولة جديدة برمز QR فريد.",
  edit_table: "تعديل الطاولة",
  edit_table_desc: "تحديث اسم الطاولة.",
  table_name: "اسم الطاولة",
  table_name_placeholder: "مثال: طاولة 1، الشرفة أ",
  number_of_chairs: "عدد الكراسي",
  no_tables: "لا توجد طاولات بعد. أضف أول طاولة للبدء.",
  enter_table_name: "الرجاء إدخال اسم الطاولة",
  link_copied: "تم نسخ الرابط",
  code: "الرمز",
  filter_by_branch: "تصفية حسب الفرع",
  all_branches: "كل الفروع",
  no_branch: "لا يوجد فرع",
  unknown_branch: "فرع غير معروف",
  branch_required: "الفرع مطلوب",
  branch_required_for_qr: "الفرع مطلوب لإنشاء رمز QR",
  select_branch_required: "الرجاء اختيار فرع",
  assign_to_branch: "تعيين للفرع",
  table: "الطاولة",
  table_active: "نشطة",
  table_held: "معلقة",
  merged: "مدمجة",
  merge_tables: "دمج الطاولات",

  // Restaurant settings
  restaurant_settings: "إعدادات المطعم",
  configure_preferences: "تكوين تفضيلات مطعمك",
  currency: "العملة",
  jordanian_dinar: "دينار أردني (للقراءة فقط)",
  tax_settings: "إعدادات الضريبة",
  tax_percentage: "نسبة الضريبة (%)",
  prices_include_tax: "الأسعار تشمل الضريبة؟",
  menu_prices_include_tax: "أسعار القائمة تشمل الضريبة",
  business_hours: "ساعات العمل",
  sunday: "الأحد",
  monday: "الاثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت",

  // Payment methods
  payment_methods: "طرق الدفع",
  payment_methods_desc: "تكوين طرق الدفع المقبولة لكل فرع",
  configure_payment_methods_per_branch: "إعداد طرق الدفع لكل فرع",
  cash: "نقداً",
  accept_cash_payments: "قبول الدفع النقدي",
  visa: "فيزا/ماستر",
  accept_visa_payments: "قبول بطاقات فيزا وماستركارد",
  mastercard: "ماستركارد",
  accept_mastercard_payments: "قبول بطاقات ماستركارد",
  efawateer: "إي فواتيركم",
  accept_efawateer_payments: "قبول دفع فواتير إي فواتيركم",
  cliq: "كليك",
  accept_cliq_payments: "قبول الدفع الفوري عبر كليك",
  wallet: "محفظة",
  accept_wallet_payments: "الدفع عبر المحافظ الإلكترونية",
  card: "بطاقة",
  mobile: "موبايل",

  // Discount settings
  discount_settings: "إعدادات الخصم",
  discount_settings_desc: "تكوين قواعد الخصم للاستخدام المستقبلي (إعداد فقط)",
  enable_discounts: "تفعيل الخصومات",
  allow_discounts: "السماح بتكوين الخصومات",
  discount_type: "نوع الخصم",
  percentage: "نسبة مئوية (%)",
  fixed_amount: "مبلغ ثابت",
  max_discount_value: "الحد الأقصى للخصم (اختياري)",
  max_percent_desc: "الحد الأقصى لنسبة الخصم المسموح بها",
  max_fixed_desc: "الحد الأقصى لمبلغ الخصم الثابت المسموح به",
  save_discount_settings: "حفظ إعدادات الخصم",
  discount_settings_saved: "تم حفظ إعدادات الخصم",

  // Notifications
  notifications_alerts: "الإشعارات والتنبيهات",
  notifications_desc: "تنبيهات استباقية حول أداء مطعمك",
  all_clear: "كل شيء على ما يرام!",
  no_alerts: "لا توجد تنبيهات أو إشعارات في الوقت الحالي.",
  sales_up: "ارتفاع المبيعات!",
  sales_up_msg: "مبيعات اليوم ارتفعت بنسبة {percent}% مقارنة بالأمس ({today} مقابل {yesterday} {currency})",
  sales_down: "انخفاض المبيعات",
  sales_down_msg: "مبيعات اليوم انخفضت بنسبة {percent}% مقارنة بالأمس ({today} مقابل {yesterday} {currency})",
  high_cancellations: "نسبة إلغاء عالية",
  high_cancellations_msg: "{percent}% من طلبات اليوم تم إلغاؤها ({cancelled} من {total})",
  high_voids: "عدد إلغاءات عالي",
  high_voids_msg: "{count} عنصر ملغي في آخر 7 أيام. يُنصح بالمراجعة مع الموظفين.",
  long_shift: "وردية مفتوحة طويلة",
  long_shift_msg: "وردية مفتوحة منذ {hours} ساعة. يُنصح بالتحقق إذا كان يجب إغلاقها.",
  high_discounts: "استخدام خصومات عالي",
  high_discounts_msg: "{percent}% من مبيعات اليوم كانت مخصومة ({amount} {currency})",
  no_sales_today: "لا مبيعات اليوم",
  no_sales_today_msg: "لم يتم تسجيل أي طلبات مكتملة اليوم بعد.",
  great_performance: "أداء رائع!",
  great_performance_msg: "العمليات تسير بسلاسة مع إلغاءات منخفضة.",

  // Operational Alerts
  alert_long_shift: "⏱ وردية مفتوحة طويلة",
  alert_long_shift_msg: "وردية مفتوحة لأكثر من {hours} ساعة (الفرع: {branch})",
  alert_stuck_order: "⏳ طلب معلق",
  alert_stuck_order_msg: "الطلب #{orderNumber} معلق منذ {duration}",
  alert_long_table: "🪑 طاولة مشغولة طويلاً",
  alert_long_table_msg: "الطاولة {tableName} مشغولة منذ {duration}",
  alert_excessive_refunds: "💰 استردادات عالية اليوم",
  alert_excessive_refunds_msg: "عدد مرتفع من الاستردادات اليوم ({count} استرداد)",

  // Refund & Void Insights
  refund_void_insights: "رؤية الاستردادات والإلغاءات",
  refund_void_insights_desc: "نظرة عامة على نشاط الاستردادات والإلغاءات لليوم",
  refunds_today: "استردادات اليوم",
  refunded_amount: "المبلغ المسترد",
  voided_orders_today: "الطلبات الملغاة اليوم",
  refunds_by_cashier: "الاستردادات حسب الكاشير",
  top_void_reasons: "أبرز أسباب الإلغاء",
  no_refunds_today: "لا توجد استردادات اليوم",
  no_voided_orders_today: "لا توجد طلبات ملغاة اليوم",
  no_reason_given: "لم يُذكر السبب",

  // CSV Upload
  csv_upload: "رفع ملف CSV",
  csv_upload_desc: "استيراد عناصر القائمة والعروض من ملفات CSV",
  upload_menu_csv: "رفع ملف CSV للقائمة",
  menu_csv_columns: "الأعمدة المطلوبة: category_en، category_ar، item_en، item_ar، price",
  upload_offers_csv: "رفع ملف CSV للعروض",
  offers_csv_columns: "الأعمدة المطلوبة: item_en، item_ar، price، description_en، description_ar",
  uploading: "جار الرفع...",
  selected_file: "المحدد",
  csv_empty: "ملف CSV فارغ أو لا يحتوي على بيانات",
  missing_columns: "أعمدة مطلوبة مفقودة",
  no_valid_rows: "لم يتم العثور على صفوف بيانات صالحة في CSV",
  menu_csv_success: "تم رفع ملف CSV للقائمة بنجاح!",
  offers_csv_success: "تم رفع ملف CSV للعروض بنجاح!",
  categories_created: "فئات تم إنشاؤها",
  items_created: "عناصر تم إنشاؤها",
  items_updated: "عناصر تم تحديثها",
  offers_created: "عروض تم إنشاؤها",
  offers_updated: "عروض تم تحديثها",
  successfully_processed: "تمت المعالجة بنجاح",

  // Errors / Empty states
  no_restaurant: "لا يوجد مطعم مخصص",
  no_restaurant_desc: "يرجى التواصل مع مدير النظام لتعيين مطعم لحسابك.",
  no_categories: "لا توجد فئات بعد. أنشئ واحدة للبدء.",
  no_items_category: "لا توجد عناصر في هذه الفئة. أضف واحداً للبدء.",
  no_branches: "لا توجد فروع.",
  select_category_view: "اختر فئة لعرض العناصر.",
  confirm_delete_category: "هل أنت متأكد من حذف هذه الفئة؟ سيتم حذف جميع العناصر فيها أيضاً.",
  confirm_delete_item: "هل أنت متأكد من حذف هذا العنصر؟",
  enter_category_name: "الرجاء إدخال اسم الفئة",
  select_category_first: "الرجاء اختيار فئة أولاً",
  enter_item_name: "الرجاء إدخال اسم العنصر",

  // QR Pending Orders
  qr_no_pending_orders: "لا توجد طلبات QR معلقة",
  qr_orders_appear_here: "ستظهر طلبات QR الجديدة هنا",
  qr_items: "عناصر",
  qr_table: "طاولة",
  qr_view_items: "عرض العناصر",
  qr_total: "الإجمالي",
  qr_reject: "رفض",
  qr_accept: "قبول",
  qr_confirm: "تأكيد",
  qr_reject_order: "رفض الطلب",
  qr_reject_confirm_msg: "هل أنت متأكد من رفض هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
  qr_reject_reason_placeholder: "سبب الرفض (مطلوب)",
  qr_reject_reason_required: "سبب الرفض مطلوب",

  // POS - Payment Dialog
  payment: "الدفع",
  order_total: "إجمالي الطلب",
  remaining_to_pay: "المتبقي للدفع",
  payment_complete: "اكتمل الدفع",
  change_to_give: "الباقي للعميل",
  remaining_from_customer: "المتبقي على العميل",
  card_must_be_exact: "يجب أن تكون مدفوعات البطاقة بالضبط",
  add_payment_method: "إضافة طريقة دفع",
  split_bill: "تقسيم الفاتورة",
  complete_payment: "إتمام الدفع",
  payment_failed: "فشل الدفع",
  payment_success: "تم الدفع بنجاح",
  payment_blocked_pending: "لا يمكن الدفع لطلبات QR المعلقة - اقبل أولاً",

  // POS - Receipt Dialog
  order: "الطلب",
  dine_in: "أكل محلي",
  takeaway: "سفري",
  customer: "العميل",
  phone: "الهاتف",
  payment_methods_label: "طريقة الدفع",
  thank_you: "شكراً لزيارتكم!",

  // POS - Refund Dialog
  process_refund: "معالجة الاسترجاع",
  confirm_refund: "تأكيد الاسترجاع",
  total_paid: "إجمالي المدفوع",
  already_refunded: "تم استرجاعه مسبقاً",
  remaining: "المتبقي",
  refund_type: "نوع الاسترجاع",
  full_refund: "استرجاع كامل",
  partial_refund: "استرجاع جزئي",
  custom_amount: "مبلغ مخصص",
  refund_amount: "مبلغ الاسترجاع",
  reason_required: "السبب مطلوب",
  review_refund: "مراجعة الاسترجاع",
  about_to_refund: "أنت على وشك استرجاع",
  refund_for_order: "استرجاع للطلب",
  refund_processed: "تم معالجة الاسترجاع بنجاح",
  refund_failed: "فشل معالجة الاسترجاع",
  select_refund_reason: "اختر سبباً",
  refund_reason_customer_request: "طلب العميل",
  refund_reason_order_mistake: "خطأ في الطلب",
  refund_reason_system_error: "خطأ في النظام",
  refund_reason_other: "أخرى",
  refund_notes_placeholder: "ملاحظات إضافية (اختياري)...",
  max: "الحد الأقصى",
  amount_exceeds_refundable: "المبلغ يتجاوز الرصيد القابل للاسترجاع",

  // POS - Z Report (Financial)
  z_report: "تقرير Z",
  z_financial_report: "تقرير Z المالي",
  shift_opened_at: "تم فتح الوردية",
  shift_closed_at: "تم إغلاق الوردية",
  sales_summary: "ملخص المبيعات",
  payment_breakdown: "تفصيل المدفوعات",
  cash_reconciliation: "مطابقة النقد",
  cash_sales: "مبيعات نقدية",
  cash_in: "إدخال نقد",
  cash_out: "سحب نقد",
  refunds: "الاسترجاعات",
  other: "أخرى",
  no_report_data: "لا تتوفر بيانات التقرير",
  // Z Report - Market-correct accounting
  gross_sales: "إجمالي المبيعات",
  before_refunds: "قبل الاسترجاعات",
  gross_total: "المجموع الإجمالي",
  refund_count: "عدد الاسترجاعات",
  refund_subtotal: "المبلغ الفرعي للاسترجاع",
  refund_tax: "ضريبة الاسترجاع",
  refund_service_charge: "رسوم خدمة الاسترجاع",
  total_refunded: "إجمالي المسترجع",
  cash_refunds: "استرجاع نقدي",
  card_refunds: "استرجاع بطاقة",
  mobile_refunds: "استرجاع موبايل",
  adjusted_totals: "المجاميع المعدلة",
  after_refunds: "بعد الاسترجاعات",
  adjusted_total_sales: "إجمالي المبيعات المعدل",
  net: "صافي",
  total_collected: "إجمالي المحصل",
  net_cash_sales: "صافي المبيعات النقدية",

  // POS - Inventory Summary Report
  inventory_summary: "ملخص المخزون",
  inventory_daily_summary: "ملخص حركات المخزون اليومية",
  incoming_movements: "الحركات الواردة",
  outgoing_movements: "الحركات الصادرة",
  total_incoming: "إجمالي الوارد",
  total_outgoing: "إجمالي الصادر",
  net_movement: "صافي الحركة",
  net_summary: "الملخص الصافي",
  all_movements: "جميع الحركات",
  no_incoming_movements: "لا توجد حركات واردة",
  no_outgoing_movements: "لا توجد حركات صادرة",

  // POS - Cash Movement
  cash_movement: "حركة النقد",
  cash_movement_desc: "تسجيل النقد المضاف أو المسحوب من الدرج",
  cash_in_label: "إدخال نقد",
  cash_out_label: "سحب نقد",
  reason_optional: "السبب (اختياري)",
  cash_movement_reason_placeholder: "أدخل سبب حركة النقد...",
  cash_added: "تم إضافة النقد",
  cash_removed: "تم سحب النقد",

  // POS - Table Orders
  active_orders: "الطلبات النشطة",
  active_orders_on_table: "طلبات نشطة على هذه الطاولة",
  select_to_continue: "اختر واحداً للمتابعة.",
  resume_add_items: "استئناف / إضافة عناصر",
  pay_close: "دفع وإغلاق",
  pay_table: "دفع الطاولة",
  pay_all_orders: "دفع جميع الطلبات",
  table_checkout: "تسوية الطاولة",
  combined_total: "المجموع الكلي",
  table_checkout_success: "تم تسوية الطاولة بنجاح",
  on_hold: "معلق",
  confirmed: "مؤكد",
  no_items_label: "لا توجد عناصر",
  more: "المزيد",

  // POS - Open Orders
  no_open_orders: "لا توجد طلبات مفتوحة",
  start_new_order: "ابدأ طلباً جديداً لرؤيته هنا",
  move: "نقل",
  split: "تقسيم",
  edit_pay: "تعديل / دفع",
  move_to_table: "نقل إلى طاولة",
  select_new_table: "اختر طاولة جديدة للطلب",
  move_order: "نقل الطلب",
  close_order: "إغلاق الطلب",
  close_order_confirm: "هل أنت متأكد أنك تريد إغلاق هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",

  // POS - Order Panel
  order_panel_title: "الطلب الحالي",
  new_order: "طلب جديد",
  no_current_order: "لا يوجد طلب حالي",
  tap_to_start: "اضغط لبدء طلب جديد",
  hold: "تعليق",
  void: "إلغاء",
  pay: "دفع",
  order_created: "تم إنشاء الطلب",
  order_held: "تم تعليق الطلب",
  order_held_automatically: "تم تعليق الطلب السابق تلقائياً",
  order_cancelled: "تم إلغاء الطلب",
  order_voided: "تم إبطال الطلب",
  order_loaded: "تم تحميل الطلب",
  order_closed: "تم إغلاق الطلب",
  order_moved: "تم نقل الطلب",
  order_split: "تم تقسيم الطلب بنجاح",
  order_merged: "تم دمج الطلبات",
  order_reopened: "تم إعادة فتح الطلب",
  order_confirmed: "تم تأكيد الطلب",
  order_rejected: "تم رفض الطلب",
  failed_create_order: "فشل إنشاء الطلب",
  failed_hold_order: "فشل تعليق الطلب",
  failed_cancel_order: "فشل إلغاء الطلب",
  failed_void_order: "فشل إبطال الطلب",
  failed_load_order: "فشل تحميل الطلب",
  failed_close_order: "فشل إغلاق الطلب",
  failed_move_order: "فشل نقل الطلب",
  failed_split_order: "فشل تقسيم الطلب",
  failed_merge_orders: "فشل دمج الطلبات",
  failed_reopen_order: "فشل إعادة فتح الطلب",
  failed_confirm_order: "فشل تأكيد الطلب",
  failed_reject_order: "فشل رفض الطلب",
  no_order_to_move: "لا يوجد طلب للنقل",
  can_only_move_open_orders: "يمكن فقط نقل الطلبات المفتوحة أو المعلقة",
  cannot_move_to_same_table: "لا يمكن النقل لنفس الطاولة",
  table_not_found: "الطاولة غير موجودة",
  target_table_has_order: "الطاولة تحتوي على طلب نشط",
  select_target_table: "اختر الطاولة التي تريد نقل الطلب إليها",
  order_moved_successfully: "تم نقل الطلب بنجاح",
  select_target_table_for_order: "اختر الطاولة التي تريد نقل الطلب #{{orderNumber}} إليها",

  // POS - Order Items
  item_voided: "تم إلغاء العنصر",
  item_transferred: "تم نقله",
  failed_add_item: "فشل إضافة العنصر",
  failed_update_quantity: "فشل تحديث الكمية",
  failed_remove_item: "فشل إزالة العنصر",
  failed_void_item: "فشل إلغاء العنصر",
  failed_save_notes: "فشل حفظ الملاحظات",
  failed_transfer_item: "فشل نقل العنصر",
  cannot_void_must_be_open: "يمكن فقط إلغاء العناصر من الطلبات المفتوحة",
  cannot_transfer_from_open: "يمكن فقط نقل العناصر من الطلبات المفتوحة",
  need_two_items: "يجب أن يحتوي الطلب على عنصرين على الأقل للنقل",
  cannot_transfer_voided: "لا يمكن نقل العناصر الملغاة",
  empty_order_discarded: "تم إهمال الطلب الفارغ",
  hold_failed_discarded: "فشل التعليق - تم الإهمال تلقائياً",
  cannot_hold_empty: "لا يمكن تعليق طلب فارغ",
  can_only_hold_open: "يمكن فقط تعليق الطلبات المفتوحة",
  cannot_pay_not_open: "لا يمكن الدفع - يجب أن يكون الطلب مفتوحاً",
  can_only_void_open: "يمكن فقط إبطال الطلبات المفتوحة",
  can_only_refund_paid: "يمكن فقط استرجاع الطلبات المدفوعة",
  already_fully_refunded: "تم استرجاع الطلب بالكامل مسبقاً",
  can_only_reopen_paid: "يمكن فقط إعادة فتح الطلبات المدفوعة",
  cannot_reopen_refunded: "لا يمكن إعادة فتح الطلبات المسترجعة",
  select_occupied_table: "اختر طاولة مشغولة",
  select_second_table: "اختر الطاولة الثانية للدمج",

  // Soft Lock Messages
  cannot_refund_shift_closed: "لا يمكن معالجة الاسترجاع بعد إغلاق الوردية.",
  cannot_move_ready_order: "هذا الطلب جاهز بالفعل ولا يمكن نقله.",
  cannot_merge_paid_orders: "لا يمكن دمج الطلبات المدفوعة.",
  void_paid_use_refund: "يجب استرجاع الطلبات المدفوعة، وليس إبطالها.",

  // POS - Held Orders
  held_orders: "الطلبات المعلقة",
  no_held_orders: "لا توجد طلبات معلقة",
  resume: "استئناف",

  // POS - Recent Orders
  recent_orders: "الطلبات الأخيرة",
  no_recent_orders: "لا توجد طلبات حديثة",
  view_receipt: "عرض الإيصال",
  reopen: "إعادة فتح",

  // POS - Header
  no_active_shift: "لا توجد وردية نشطة",
  must_open_shift: "يجب عليك فتح وردية قبل بدء العمل.",

  // POS - Dialogs
  void_order: "إبطال الطلب",
  void_order_desc: "أدخل سبب إبطال هذا الطلب.",
  void_reason: "سبب الإبطال",
  void_reason_placeholder: "أدخل سبب الإبطال...",
  cancel_order: "إلغاء الطلب",
  cancel_order_desc: "أدخل سبب إلغاء هذا الطلب.",
  cancel_reason: "سبب الإلغاء",
  cancel_reason_placeholder: "أدخل سبب الإلغاء...",
  void_item: "إلغاء العنصر",
  void_item_desc: "أدخل سبب إلغاء هذا العنصر.",
  remove_last_item: "إزالة العنصر الأخير",
  remove_last_item_desc: "هذا هو العنصر الأخير في الطلب. هل تريد إزالته؟",
  item_notes: "ملاحظات العنصر",
  notes: "ملاحظات",
  notes_placeholder: "أضف تعليمات خاصة...",
  select_modifiers: "اختر الإضافات",
  required: "مطلوب",
  select_at_least: "اختر على الأقل",
  select_up_to: "اختر حتى",
  new_order_dialog_title: "طلب جديد",
  order_type: "نوع الطلب",
  select_table: "اختر الطاولة",
  customer_name: "اسم العميل",
  customer_phone: "هاتف العميل",
  confirm_new_order: "تأكيد الطلب الجديد",
  hold_current_order: "تعليق الطلب الحالي وبدء طلب جديد؟",
  hold_and_new: "تعليق وجديد",
  discard_and_new: "إهمال وجديد",
  reopen_order: "إعادة فتح الطلب",
  reopen_order_desc: "سيؤدي هذا إلى إعادة الطلب إلى الحالة المفتوحة وإزالة جميع المدفوعات.",
  transfer_item: "نقل العنصر",
  transfer_item_desc: "اختر طلباً مستهدفاً لنقل هذا العنصر إليه.",
  target_order: "الطلب المستهدف",
  transfer: "نقل",
  split_order: "تقسيم الطلب",
  split_order_desc: "اختر العناصر لنقلها إلى طلب جديد.",
  confirm_split: "تأكيد التقسيم",
  merge_orders: "دمج الطلبات",
  merge_orders_desc: "دمج طلبات من طاولتين في طلب واحد.",
  primary_table: "الطاولة الرئيسية",
  secondary_table: "الطاولة الثانوية",
  confirm_merge: "تأكيد الدمج",
  discount_dialog_title: "تطبيق الخصم",
  discount_value: "قيمة الخصم",
  apply_discount: "تطبيق الخصم",
  clear_discount: "إزالة الخصم",
  discount_applied: "تم تطبيق الخصم",
  discount_removed: "تم إزالة الخصم",
  failed_apply_discount: "فشل تطبيق الخصم",
  failed_remove_discount: "فشل إزالة الخصم",

  // POS - Shift Summary
  shift_summary: "ملخص الوردية",
  shift_complete: "تم إكمال ورديتك.",
  shift_duration: "مدة الوردية",
  orders_completed: "الطلبات المكتملة",
  done: "تم",

  // Error messages
  failed_record_cash: "فشل تسجيل حركة النقد",
  missing_user_restaurant: "بيانات المستخدم أو المطعم مفقودة",
  order_not_found: "الطلب غير موجود",
  failed_open_shift: "فشل فتح الوردية",
  failed_close_shift: "فشل إغلاق الوردية",

  // Additional POS strings
  current_order: "الطلب الحالي",
  no_items_in_order: "لا توجد عناصر في الطلب",
  no_categories_found: "لم يتم العثور على فئات",
  no_tables_configured: "لا توجد طاولات مُعدّة لهذا الفرع",
  busy: "مشغول",
  free: "فارغ",
  occupied: "مشغول",
  seats: "مقاعد",
  mergedOrdersTooltip: "طلبات مدمجة — توجد عدة طلبات على هذه الطاولة",
  order_prefix: "الطلب",
  transferring: "جار النقل...",
  confirm_transfer: "تأكيد النقل",
  about_to_transfer: "أنت على وشك نقل",
  to_order: "إلى الطلب",
  transfer_note: "سيتم نقل العنصر بالكامل (بما في ذلك الملاحظات والإضافات).",
  no_other_open_orders: "لا توجد طلبات مفتوحة أخرى",
  table_assigned: "طاولة مُعيّنة",
  next: "التالي",
  merge_orders_question: "دمج الطلبات؟",
  about_to_merge: "سيتم دمج الطلبات في طلب واحد.",
  will_be_merged_into: "سيتم دمجه في",
  the_older_order: "الطلب الأقدم",
  all_items_moved: "سيتم نقل جميع العناصر من",
  order_will_be_closed: "لا يمكن التراجع عن هذه العملية.",
  merging: "جار الدمج...",
  orders_on_hold: "طلب(ات) معلقة. استأنف للمتابعة أو ألغِ للإبطال.",
  orders_you_hold: "ستظهر الطلبات المعلقة هنا",
  cancel_order_question: "إلغاء هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.",
  keep_order: "إبقاء الطلب",
  yes_cancel: "نعم، إلغاء",
  cancelling: "جار الإلغاء...",
  takeaway_label: "سفري",
  view_completed_orders: "عرض الطلبات المكتملة من هذه الوردية",
  no_completed_orders: "لا توجد طلبات مكتملة بعد",
  summary: "الملخص",
  payments: "المدفوعات",
  receipt: "الإيصال",
  shift_status_open: "الوردية مفتوحة",
  shift_status_closed: "الوردية مغلقة",
  held: "معلق",
  cash_in_out: "إدخال/سحب نقد",
  no_open_orders_title: "لا توجد طلبات مفتوحة",
  start_order_hint: "ابدأ طلباً جديداً لرؤيته هنا",
  restaurant: "المطعم",

  // Public Menu Page
  menu_table: "الطاولة",
  menu_quantity: "الكمية",
  menu_notes: "ملاحظات",
  menu_notes_placeholder: "بدون سكر، حليب أقل...",
  menu_confirm_order: "تأكيد الطلب",
  menu_order_summary: "ملخص الطلب",
  menu_no_items: "لا يوجد أصناف",
  menu_order_sent: "تم إرسال طلبك للكاشير",
  menu_order_error: "حدث خطأ أثناء إرسال الطلب",
  menu_your_order: "طلبك",
  menu_send_to_cashier: "تثبيت الطلب",
  menu_no_phone: "لا يوجد رقم هاتف للكاشير",
  menu_load_error: "تعذر فتح القائمة",
  menu_restaurant_not_found: "المطعم غير موجود",
  menu_invalid_restaurant: "معرف المطعم غير صالح",
  menu_categories_error: "فشل تحميل التصنيفات",
  menu_items_error: "فشل تحميل الأصناف",
  menu_currency: "د.أ",
  menu_items_label: "أصناف",
  menu_remove: "إزالة",
  menu_order_notes: "ملاحظات على الطلب",
  menu_order_notes_placeholder: "مثال: شاي بالنعنع، القهوة سادة",

  // Additional POS Dialog strings
  cancel_order_title: "إلغاء الطلب",
  cancel_order_warning: "لا يمكن التراجع عن هذا الإجراء",
  cancel_order_warning_desc: "سيتم إلغاء الطلب نهائياً وإزالته من قائمة الطلبات النشطة.",
  reason_for_cancellation: "سبب الإلغاء",
  cancel_reason_input_placeholder: "أدخل سبب إلغاء هذا الطلب...",
  active_order_exists: "يوجد طلب نشط",
  open_order_exists: "يوجد طلب مفتوح. ماذا تريد أن تفعل؟",
  hold_current_start_new: "تعليق الطلب الحالي وبدء جديد",
  order_will_be_empty: "الطلب سيصبح فارغاً",
  removing_last_item_warning: "سيترك هذا الطلب بدون عناصر. فكر بإلغاء الطلب بدلاً من ذلك.",
  keep_item: "إبقاء العنصر",
  remove_item: "إزالة العنصر",
  removing: "جار الإزالة...",
  discount_preview: "معاينة الخصم",
  customize_item: "تخصيص",
  no_modifiers_available: "لا توجد إضافات لهذا الصنف",
  select_one: "اختر واحد",
  modifiers_label: "الإضافات",
  item_total: "إجمالي الصنف",
  add_to_order: "إضافة للطلب",
  skip: "تخطي",
  adding: "جار الإضافة...",
  add_with_modifiers: "إضافة مع الإضافات",
  select_order_type: "اختر نوع الطلب للبدء",
  customer_info_optional: "معلومات العميل (اختياري)",
  enter_name: "أدخل الاسم...",
  phone_number: "رقم الهاتف",
  enter_phone: "أدخل الهاتف...",
  creating: "جار الإنشاء...",
  start_order: "بدء الطلب",
  reopen_order_title: "إعادة فتح الطلب",
  reopen_for_correction: "للتصحيح",
  order_will_be_reopened: "سيتم إعادة فتح الطلب",
  reopening_allows: "سيتم نقل هذا الطلب إلى الحالة المفتوحة. ستتمكن من:",
  edit_items_quantities: "تعديل العناصر والكميات",
  apply_modify_discounts: "تطبيق أو تعديل الخصومات",
  process_additional_payments: "معالجة مدفوعات إضافية",
  close_order_again: "إغلاق الطلب مرة أخرى عند الجهوزية",
  reopening: "جار إعادة الفتح...",
  shift_closed_title: "تم إغلاق الوردية",
  shift_closed_success: "تم إغلاق ورديتك بنجاح.",
  split_order_title: "تقسيم الطلب",
  split_order_hint: "اختر العناصر لنقلها لطلب جديد. كلا الطلبين سيبقيان على نفس الطاولة.",
  items_to_new_order: "عناصر للطلب الجديد",
  items_remaining: "العناصر المتبقية",
  new_order_total: "إجمالي الطلب الجديد",
  at_least_one_item: "يجب أن يبقى عنصر واحد على الأقل في الطلب الأصلي.",
  splitting: "جار التقسيم...",
  table_active_orders: "الطلبات النشطة",
  active_order_count: "طلب نشط على هذه الطاولة.",
  active_orders_count: "طلبات نشطة على هذه الطاولة. اختر واحداً للمتابعة.",
  void_item_title: "إلغاء العنصر",
  void_item_audit_note: "سيتم تسجيل هذا الإجراء لأغراض المراجعة.",
  item_to_void: "العنصر للإلغاء",
  reason_for_voiding: "سبب الإلغاء",
  void_item_input_placeholder: "أدخل سبب إلغاء هذا العنصر...",
  reason_required_to_void: "السبب مطلوب لإلغاء العنصر",
  voiding: "جار الإلغاء...",
  void_order_title: "إبطال الطلب",
  void_order_warning_desc: "سيتم إبطال الطلب نهائياً. سيتم الاحتفاظ بالعناصر وبيانات الطلب لأغراض المراجعة.",
  void_order_input_placeholder: "أدخل سبب إبطال هذا الطلب...",

  pos_new_order: "طلب جديد",
  pos_favorites: "المفضلة",
  pos_qr_pending: "طلبات QR",
  pos_open_orders: "الطلبات المفتوحة",
  pos_tables: "الطاولات",

  // Reports Module
  financial: "المالية",
  operations: "العمليات",
  
  // Financial Reports
  daily_sales_report: "تقرير المبيعات اليومية",
  taxes_collected: "الضرائب المحصلة",
  final_total: "الإجمالي النهائي",
  payment_methods_report: "تقرير طرق الدفع",
  cash_total: "إجمالي النقد",
  card_total: "إجمالي البطاقات",
  other_payments: "مدفوعات أخرى",
  transactions: "معاملة",
  refunds_report: "تقرير الاستردادات",
  total_refunds: "إجمالي الاستردادات",
  refunds_count: "عدد الاستردادات",
  by_reason: "حسب السبب",
  by_cashier: "حسب الكاشير",
  no_refund_data: "لا توجد بيانات استرداد لهذه الفترة.",
  no_payment_data: "لا توجد بيانات دفع لهذه الفترة.",
  
  // Orders Reports
  orders_overview: "نظرة عامة على الطلبات",
  paid: "مدفوع",
  cancelled: "ملغي",
  refunded: "مسترد",
  open_orders: "الطلبات المفتوحة",
  closed_orders: "الطلبات المغلقة",
  refunded_orders: "الطلبات المستردة",
  voided_orders: "الطلبات الملغاة",
  orders_by_type: "الطلبات حسب النوع",
  orders_by_source: "الطلبات حسب المصدر",
  average_order_value: "متوسط قيمة الطلب",
  aov: "م.ق.ط",
  total_revenue: "إجمالي الإيرادات",
  peak_hours_report: "ساعات الذروة",
  hour: "الساعة",
  orders_count: "عدد الطلبات",
  no_orders_data: "لا توجد بيانات طلبات لهذه الفترة.",
  
  // Orders Hidden from Kitchen (Owner-only)
  orders_hidden_from_kitchen: "الطلبات المخفية عن المطبخ",
  show_hidden_orders: "إظهار الطلبات المخفية",
  hidden_orders_tooltip: "عرض الطلبات غير المعروضة في شاشة المطبخ (KDS) وفهم سبب إخفائها.",
  hidden_orders_description: "هذه الطلبات غير معروضة في شاشة المطبخ بسبب حالتها أو النطاق الزمني أو مصدرها.",
  reason_hidden: "سبب الإخفاء",
  status_excluded: "حالة مكتملة/مدفوعة",
  outside_time_window: "خارج نطاق 12 ساعة",
  pending_qr_order: "طلب QR معلق",
  no_hidden_orders: "جميع الطلبات معروضة حاليًا في شاشة المطبخ.",
  
  // Menu Reports
  top_selling_items: "الأصناف الأكثر مبيعاً",
  least_selling_items: "الأصناف الأقل مبيعاً",
  sales_by_category: "المبيعات حسب الفئة",
  item_performance: "أداء الأصناف",
  item: "الصنف",
  quantity: "الكمية",
  quantity_sold: "الكمية المباعة",
  revenue: "الإيرادات",
  category: "الفئة",
  no_menu_data: "لا توجد بيانات أداء القائمة لهذه الفترة.",
  
  // Staff Reports
  cashier_activity: "نشاط الكاشير",
  voids_refunds: "الإلغاءات والاستردادات",
  no_voids_refunds: "لا توجد إلغاءات أو استردادات مسجلة.",
  void_count: "عدد الإلغاءات",
  no_staff_data: "لا توجد بيانات أداء الموظفين لهذه الفترة.",
  
  // Operations Reports
  shifts_history: "سجل الورديات",
  cash_difference: "تقرير فرق النقد",
  cash_difference_report: "تقرير فرق النقد",
  tables_usage: "استخدام الطاولات",
  duration: "المدة",
  date: "التاريخ",
  expected: "المتوقع",
  actual: "الفعلي",
  avg: "متوسط",
  sales_per_shift: "المبيعات لكل وردية",
  orders_per_table: "الطلبات لكل طاولة",
  avg_duration: "متوسط المدة",
  no_operations_data: "لا توجد بيانات عمليات لهذه الفترة.",
  no_table_data: "لا توجد بيانات استخدام الطاولات لهذه الفترة.",
  
  // Branch Reports
  sales_per_branch: "المبيعات حسب الفرع",
  orders_per_branch: "الطلبات حسب الفرع",
  shifts_per_branch: "الورديات حسب الفرع",
  of_total: "من الإجمالي",
  single_branch_msg: "لديك فرع واحد فقط. ستظهر تقارير الفروع المتعددة عند إضافة المزيد من الفروع.",
  no_branch_data: "لا توجد بيانات فروع لهذه الفترة.",

  // Report Filters
  all_cashiers: "كل الكاشيرات",
  all_methods: "كل الطرق",
  all_types: "كل الأنواع",
  clear_filters: "مسح الفلاتر",
  orders_details: "تفاصيل الطلبات",
  net_after_refunds: "الصافي بعد الاستردادات",
  type: "النوع",
  source: "المصدر",
  payment_method: "طريقة الدفع",
  time: "الوقت",
  order_number: "رقم الطلب",
  cash_movements: "حركات النقد",
  rows_per_page: "صفوف",

  // NumericKeypad translations
  keypad_enter_value: "أدخل القيمة",
  keypad_whole_number: "الرجاء إدخال رقم صحيح",
  keypad_min_value: "الحد الأدنى للقيمة هو",
  keypad_max_value: "الحد الأقصى للقيمة هو",
  keypad_clear: "مسح",

  // POS hardcoded strings
  no_restaurant_or_branch: "لم يتم تعيين مطعم أو فرع لهذا الكاشير.",
  failed_load_session: "فشل تحميل الجلسة. يرجى المحاولة مرة أخرى.",
  search_items_placeholder: "البحث في الأصناف... (Ctrl+F)",
  no_tables_found: "لم يتم العثور على طاولات",
  ask_owner_create_tables: "اطلب من المالك إنشاء طاولات لهذا الفرع.",
  ready_to_merge: "جاهز للدمج",
  merge_with_another: "دمج مع طاولة أخرى",
  cancelled_from_held: "تم الإلغاء من الطلبات المعلقة",
  empty_order_cancelled: "تم إلغاء الطلب الفارغ بواسطة الكاشير",

  // Menu language guidance
  menu_language_title: "لغة عرض الأصناف",
  menu_language_description: "يتم عرض أسماء الأصناف والتصنيفات باللغة التي يتم إدخالها عند الإنشاء. تغيير لغة النظام (عربي / English) يؤثر على واجهة النظام فقط ولا يغيّر لغة عناصر القائمة.",
  menu_language_example_intro: "إذا كان مطعمك يخدم زبائن بلغتين، يمكنك إدخال الاسم بالشكل التالي:",
  menu_language_future_note: "سيتم دعم إدخال أسماء الأصناف بأكثر من لغة في تحديثات قادمة من النظام.",
  menu_language_tooltip: "اسم الصنف يظهر بنفس اللغة التي يتم إدخالها، بغضّ النظر عن لغة النظام.",

  // Recipe Builder
  recipes: "الوصفات",
  recipe_builder: "منشئ الوصفات",
  recipe_builder_desc: "تعريف المكونات والكميات لأصناف القائمة لتمكين حساب التكلفة وخصم المخزون تلقائياً.",
  recipe_note: "ملاحظة: يتم خصم المخزون فقط للأصناف المرتبطة بوصفة.",
  recipe_how_it_works_title: "كيف تعمل الوصفة؟",
  recipe_how_it_works_step1: "الوصفة تحدد الأصناف التي يتم خصمها من المخزون",
  recipe_how_it_works_step2: "يتم الخصم فقط عند بيع الصنف",
  recipe_how_it_works_step3: "إذا لم يكن الصنف مرتبطًا بوصفة، فلن يتم خصم المخزون",
  recipe_got_it: "فهمت",
  select_menu_item: "اختر صنف من القائمة",
  search_menu_items: "ابحث عن أصناف القائمة...",
  no_results: "لا توجد نتائج",
  recipe_exists: "وصفة موجودة",
  ingredients: "المكونات",
  ingredients_desc: "أضف أصناف المخزون المطلوبة لتحضير هذا الطبق.",
  add_ingredient: "إضافة مكون",
  add_first_ingredient: "إضافة أول مكون",
  no_recipe_defined: "لم يتم تعريف وصفة بعد. أضف مكونات لإنشاء وصفة.",
  select_ingredient: "اختر المكون",
  duplicate_ingredients_error: "تم اكتشاف مكونات مكررة. يجب أن يظهر كل مكون مرة واحدة فقط.",
  recipe_active: "الوصفة نشطة",
  recipe_notes_placeholder: "ملاحظات اختيارية حول التحضير، الحصص، إلخ.",
  save_recipe: "حفظ الوصفة",
  saving: "جاري الحفظ...",
  import_csv_recipes: "استيراد CSV للوصفات",
  import_recipes_from_csv: "استيراد الوصفات من CSV",
  csv_headers_required: "رؤوس الأعمدة المطلوبة في ملف CSV",
  select_csv_file: "اختر ملف CSV",
  csv_headers_missing: "رؤوس الأعمدة المطلوبة مفقودة",
  csv_parse_error: "خطأ في قراءة ملف CSV. يرجى التحقق من تنسيق الملف.",
  csv_total_rows: "إجمالي الصفوف",
  csv_valid_rows: "صفوف صحيحة",
  csv_invalid_rows: "صفوف غير صحيحة",
  csv_fix_errors_before_import: "يرجى تصحيح جميع الأخطاء قبل الاستيراد. أعد رفع ملف CSV مصحح.",
  csv_row_valid: "صحيح",
  csv_error_menu_item_required: "اسم صنف القائمة مطلوب",
  csv_error_inventory_item_required: "اسم صنف المخزون مطلوب",
  csv_error_quantity_required: "الكمية مطلوبة",
  csv_error_quantity_invalid: "الكمية يجب أن تكون رقماً أكبر من 0",
  csv_error_unit_required: "الوحدة مطلوبة",
  csv_import_success: "تم استيراد الوصفات بنجاح",
  csv_import_partial_success: "تم استيراد الوصفات مع بعض الأخطاء",
  csv_import_failed: "فشل استيراد الوصفات",
  csv_menu_items_updated: "أصناف القائمة المحدثة",
  csv_recipe_lines_inserted: "سطور الوصفات المضافة",
  csv_errors: "الأخطاء",
  importing: "جاري الاستيراد...",
  menu_item: "صنف القائمة",
  import: "استيراد",

  // Inventory Deduction
  inventory_negative_warning: "المخزون أصبح سالباً لبعض الأصناف",
  inventory_deduction_failed: "فشل خصم المخزون. تم إتمام الدفع بنجاح.",
  inventory_warning_title: "تحذير مخزون منخفض",
  inventory_warning_desc: "الأصناف التالية أصبحت أقل من الصفر بعد هذا البيع. يُنصح بإعادة التخزين قريباً.",
  view_inventory: "عرض المخزون",
  was: "كان",
  more_items: "أصناف أخرى",

  // ═══════════════════════════════════════════════════════════════════
  // CASHIER ERROR MESSAGES - User-friendly Arabic messages
  // ═══════════════════════════════════════════════════════════════════
  
  // Inventory Insufficient (Recipe-based items)
  error_inventory_insufficient_title: "لا يمكن إتمام الدفع",
  error_inventory_insufficient_desc: "المخزون غير كافٍ لإتمام هذا الطلب",
  error_inventory_insufficient_ingredient: "المكوّن الناقص",
  error_inventory_insufficient_action: "يرجى إبلاغ صاحب المطعم أو تحديث المخزون",
  
  // Empty or Invalid Recipe
  error_recipe_invalid_title: "لا يمكن إتمام الطلب",
  error_recipe_invalid_desc: "هذا الصنف غير جاهز للبيع",
  error_recipe_invalid_action: "يرجى إبلاغ الإدارة",
  
  // Unit Mismatch
  error_unit_mismatch_title: "مشكلة في إعداد الصنف",
  error_unit_mismatch_desc: "لا يمكن خصم المخزون بسبب إعدادات غير صحيحة",
  error_unit_mismatch_action: "يرجى إبلاغ الإدارة",
  
  // Held Order Payment
  error_order_held_title: "لا يمكن الدفع",
  error_order_held_desc: "هذا الطلب معلّق",
  error_order_held_action: "يرجى استئناف الطلب أولًا",
  
  // Empty Order
  error_order_empty_title: "لا يمكن إتمام الدفع",
  error_order_empty_desc: "الطلب لا يحتوي على أي عناصر",
  
  // Already Paid/Closed Order
  error_order_closed_title: "هذا الطلب مغلق",
  error_order_closed_desc: "لا يمكن تعديل أو إعادة الدفع",
  
  // Permission Error
  error_permission_title: "غير مصرح",
  error_permission_desc: "لا تملك الصلاحية لتنفيذ هذه العملية",
  
  // Technical Failure
  error_technical_title: "لم يتم إتمام العملية",
  error_technical_desc: "حدثت مشكلة أثناء معالجة الطلب",
  error_technical_action: "يرجى المحاولة مرة أخرى",
  
  // Global Fallback
  error_fallback_title: "لم يتم إتمام العملية",
  error_fallback_desc: "حدث خطأ غير متوقع",
  error_fallback_action: "يرجى المحاولة مرة أخرى أو إبلاغ الإدارة",
  
  // Payment specific errors
  error_payment_underpaid: "المبلغ المدفوع أقل من إجمالي الطلب",
  error_payment_card_overpay: "لا يمكن الدفع الزائد بالبطاقة",
  error_payment_duplicate: "تم دفع هذا الطلب مسبقًا",
  error_restaurant_inactive: "المطعم غير نشط حاليًا",

  // Costing & Profit Reports
  costing_profit: "التكاليف والأرباح",
  costing_overview: "ملخص التكاليف",
  total_cogs: "إجمالي تكلفة المبيعات",
  gross_profit: "إجمالي الربح",
  profit_margin: "هامش الربح",
  profit_margin_percent: "نسبة هامش الربح",
  profit_by_item: "الربح حسب الصنف",
  profit_by_category: "الربح حسب الفئة",
  profit_by_branch: "الربح حسب الفرع",
  cogs: "تكلفة المبيعات",
  profit: "الربح",
  margin: "الهامش",
  margin_percent: "نسبة الهامش",
  no_costing_data: "لا توجد بيانات تكلفة لهذه الفترة",
  no_item_profit_data: "لا توجد بيانات ربح للأصناف",
  no_category_profit_data: "لا توجد بيانات ربح للفئات",
  no_branch_profit_data: "لا توجد بيانات ربح للفروع",
  showing_top_20_of: "عرض أعلى 20 من",
  metric: "المؤشر",
  cost: "التكلفة",
  total_recipe_cost: "إجمالي تكلفة الوصفة",

  // Inventory Module Disabled
  inventory_module_disabled_title: "إدارة المخزون غير مفعّلة",
  inventory_module_disabled_message: "إدارة المخزون غير مفعّلة لهذا المطعم. يمكن طلب تفعيلها من إدارة النظام.",

  // KDS
  kitchen_display: "شاشة المطبخ",
  new_orders: "طلبات جديدة",
  in_progress: "قيد التحضير",
  ready: "جاهز",
  start_cooking: "بدء الطهي",
  mark_ready: "تحديد كجاهز",
  ready_for_pickup: "جاهز للتسليم",
  status_updated: "تم تحديث الحالة",
  order_started: "بدأ تحضير الطلب",
  order_ready: "الطلب جاهز",
  status_update_failed: "فشل تحديث الحالة",
  no_active_kitchen_orders: "لا توجد طلبات مطبخ نشطة حاليًا",
  kds_disabled_title: "شاشة المطبخ غير مفعّلة",
  kds_disabled_message: "شاشة المطبخ غير مفعّلة لهذا المطعم. يرجى التواصل مع إدارة النظام.",
  kitchen: "المطبخ",
  sound_on: "الصوت مفعّل",
  sound_off: "الصوت مغلق",
  kds_settings: "إعدادات الشاشة",
  auto_clear_ready: "إخفاء الجاهز تلقائياً",
  clear_after: "إخفاء بعد",
  minutes: "دقيقة",
  back_to_cooking: "العودة للتحضير",
  enter_fullscreen: "ملء الشاشة",
  exit_fullscreen: "الخروج من ملء الشاشة",

  // Kitchen Performance Reports
  kitchen_performance: "أداء المطبخ",
  kitchen_performance_desc: "مقاييس المطبخ الحية",
  avg_prep_time: "متوسط وقت التحضير",
  vs_yesterday: "مقارنة بالأمس",
  slower: "أبطأ",
  faster: "أسرع",
  trend_same: "نفسه",
  orders_by_status: "الطلبات حسب الحالة",
  delayed_orders: "طلبات متأخرة",
  delayed_definition: "أكثر من 15 دقيقة تحضير",
  of_orders: "من",
  orders_completed_today: "طلب اليوم",
  kitchen_peak_hours: "ساعات الذروة",
  week_peak: "هذا الأسبوع",

  // Empty state explanations
  no_orders_possible_reasons: "الأسباب المحتملة:",
  reason_no_active_shift: "لا توجد وردية مفتوحة",
  reason_different_branch: "الطلبات على فرع مختلف",
  reason_status_not_open: "الحالة ليست مفتوحة/مؤكدة",
  no_qr_orders_possible_reasons: "الأسباب المحتملة:",
  reason_no_qr_orders_yet: "لا توجد طلبات QR بعد",
  reason_already_processed: "تمت معالجة جميع الطلبات",

  // Micro UX Badges
  badge_qr: "QR",
  badge_hold: "معلق",
  badge_merged: "مدمج",
  badge_discount: "خصم",
  badge_refund: "مسترد",
  badge_notes: "ملاحظات",

  // Quick Insights
  quick_insights: "نظرة سريعة",
  top_seller_today: "الأكثر مبيعاً اليوم",
  highest_variance: "أعلى فرق",
  no_top_seller_today: "لا توجد مبيعات اليوم",
  variance_exceeds_normal: "الفرق يتجاوز المعدل الطبيعي",

  // Assistant Quick Prompts
  prompt_summarize_day: "لخص يومي",
  prompt_what_changed: "شو تغيّر عن أمس؟",
  prompt_why_alert: "ليش النظام أعطاني تنبيه؟",
  prompt_explain_confidence: "اشرح مؤشر الثقة",
  prompt_how_helps_today: "كيف يساعدني هذا النظام اليوم؟",

  // Smart Features
  end_of_day_summary: "ملخص نهاية اليوم",
  what_changed: "ما الذي تغير عن الأمس",
  sales_comparison: "مقارنة المبيعات",
  sales_up_today: "المبيعات ارتفعت اليوم",
  sales_down_today: "المبيعات انخفضت اليوم",
  sales_same: "المبيعات مشابهة للأمس",
  most_frequent_issue: "المشكلة الأكثر تكراراً",
  silent_loss_meter: "الخسارة غير المباشرة اليوم",
  silent_loss_tooltip: "مجموع الخسائر من الخصومات والاسترجاعات وفروق المخزون",
  system_confidence: "ثقة النظام",
  confidence_excellent: "ممتاز",
  confidence_good: "جيد",
  confidence_needs_attention: "يحتاج انتباه",
  suggested_action: "الإجراء المقترح",
  close_shift_suggestion: "أغلق الوردية",
  review_inventory_suggestion: "راجع تقرير المخزون",
  complete_open_orders_suggestion: "أكمل الطلبات المفتوحة",
  first_shift_welcome: "مرحباً بك في أول وردية!",
  first_shift_guide: "دعني أرشدك للأساسيات",
  explain_this: "اشرح هذا",
  mistake_pattern_detected: "لوحظ نمط اليوم",
  training_replay: "عرض التدريب",
  view_cashier_actions: "عرض إجراءات الكاشير",
  operational_score: "درجة التشغيل",
  based_on_today: "بناءً على عمليات اليوم",

  // System Status
  kds: "شاشة المطبخ",
  smart_assistant: "المساعد",
  enabled: "مفعّل",

  // Action Warnings
  action_affects_reports_inventory: "هذا الإجراء سيؤثر على التقارير والمخزون",

  // Contextual Hints
  hint_variance_report: "هذا التقرير يساعدك على اكتشاف الهدر مبكرًا",
  hint_z_report: "هذا تقرير يومي ولا يُستخدم للتحليل طويل المدى",

  // Standard Error Messages (Owner Dashboard)
  error_no_permission: "❌ لا تملك الصلاحية لتنفيذ هذا الإجراء.",
  error_action_unavailable: "⚠️ هذا الإجراء غير متاح حالياً.",
  error_validation_failed: "⚠️ يرجى التأكد من إدخال جميع الحقول بشكل صحيح.",
  error_unexpected: "❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.",
  error_no_data: "لا توجد بيانات بعد.",

  // Kitchen Done Orders Card
  kitchen_done_orders_today: "طلبات المطبخ المنجزة اليوم",

  // Today Income Card
  today_income: "إيرادات اليوم",

  // Combo Items
  combo_items: "مكونات الكومبو",
  combo_items_desc: "أضف أصناف القائمة التي تشكل هذا الكومبو",
  combo_item_added: "تم إضافة الصنف للكومبو",
  combo_item_removed: "تم إزالة الصنف من الكومبو",
  combo_no_items: "لا توجد أصناف في الكومبو بعد",
  manage_combo: "إدارة الكومبو",
  select_item: "اختر صنف",
  qty: "الكمية",

  // Insight Cards
  refund_void_reasons_title: "أسباب الاسترجاع والإلغاء",
  refund_void_reasons_tooltip: "أكثر أسباب الاسترجاع والإلغاء خلال آخر 7 أيام. يساعد على اكتشاف المشاكل الشائعة.",
  no_refunds_or_voids: "لا توجد عمليات استرجاع أو إلغاء",
  inventory_risk_title: "مخاطر المخزون",
  inventory_risk_tooltip: "مشاكل المخزون التي تحتاج انتباه. اضغط على أي صف للتفاصيل.",
  inv_near_reorder_short: "قريب من النفاد",
  inv_near_reorder_tooltip: "أصناف تقترب من الحد الأدنى للمخزون.",
  inv_negative_stock: "مخزون سالب",
  inv_negative_stock_tooltip: "أصناف بكمية سالبة. تحقق من استلامات أو أخطاء مفقودة.",
  inv_items_without_recipe: "أصناف بلا وصفة",
  inv_items_without_recipe_tooltip: "أصناف الطعام والمشروبات بدون وصفات. لن يتم خصم المخزون تلقائياً.",
  today_income_tooltip: "إجمالي الإيرادات من الطلبات المكتملة اليوم.",
  
  // Inventory Transaction Filter
  inv_filter_type: "نوع العملية",
  inv_filter_all: "جميع الأنواع",
  inv_txn_sale_deduction: "خصم بيع",
  inv_txn_refund_restoration: "استعادة استرجاع",
  
  // Z Report Inventory Section
  z_inventory_summary: "ملخص حركات المخزون اليومية",
  z_inventory_summary_desc: "حركات المخزون خلال هذه الوردية",
  z_inv_type: "النوع",
  z_inv_in: "وارد",
  z_inv_out: "صادر",
  z_inv_net: "الصافي",
  z_inv_count: "العدد",
  z_inv_total: "إجمالي الحركات",
  z_inv_no_movements: "لا توجد حركات مخزون خلال هذه الوردية",
  
  // Menu Item Arabic Name Warning
  missing_arabic_name: "الاسم العربي مفقود",
  missing_arabic_name_warning: "لن يظهر الصنف في بحث الكاشير بالعربي",
  missing_arabic_name_tooltip: "لجعل هذا الصنف قابلاً للبحث بالعربي، أضف اسماً عربياً في حقل الوصف.",
  
  // Recent Orders Search/Filter
  search_by_order_number: "بحث برقم الطلب...",
  all: "الكل",
  no_orders_match_filter: "لا توجد طلبات تطابق الفلتر",

  // Daily Summary Card
  daily_summary_title: "ملخص اليوم",
  daily_summary_operational_activity: "النشاط التشغيلي",
  daily_summary_orders_count: "عدد الطلبات",
  daily_summary_refunded_orders_count: "عدد الطلبات المسترجعة",
  daily_summary_top_seller: "أكثر صنف مبيعًا",
  daily_summary_sales: "المبيعات",
  daily_summary_sales_tooltip: "إجمالي قيمة جميع الطلبات قبل الخصومات أو الاسترجاعات.",
  daily_summary_gross_sales: "إجمالي المبيعات",
  daily_summary_refunds: "الاسترجاعات",
  daily_summary_refund_count: "عدد الاسترجاعات",
  daily_summary_refund_total: "إجمالي المسترجع",
  daily_summary_top_refund_reason: "سبب الاسترجاع الأكثر تكرارًا",
  daily_summary_revenue: "إيرادات اليوم",
  daily_summary_revenue_formula: "الإيرادات = إجمالي المدفوعات − إجمالي الاسترجاعات",
  daily_summary_net_revenue: "صافي الإيرادات",
  daily_summary_zero_revenue_explanation: "لم يتم تسجيل إيرادات صافية اليوم بسبب استرجاع جميع المدفوعات.",
  daily_summary_unspecified: "غير محدد",
  
  // Username / Display Name
  display_name: "اسم المستخدم",
  display_name_placeholder: "أدخل اسم المستخدم",
  username_min_2: "اسم المستخدم يجب أن يكون حرفين على الأقل",
  username_min_2_hint: "حرفين على الأقل",
  username_updated: "تم تحديث اسم المستخدم بنجاح",
  edit_display_name: "تعديل اسم المستخدم",
  not_authenticated: "غير مسجل الدخول",
  
  // Email management
  edit_email: "تعديل البريد الإلكتروني",
  edit_email_desc: "أدخل البريد الإلكتروني الجديد لهذا الموظف",
  email_updated: "تم تحديث البريد الإلكتروني بنجاح",
  invalid_email: "الرجاء إدخال بريد إلكتروني صالح",
  
  // System Admin - Subscriptions
  sub_expiring_title: "اشتراكات على وشك الانتهاء",
  sub_expiring_count: "اشتراكات منتهية أو قاربت",
  sub_expiring_desc: "هذه الاشتراكات منتهية أو ستنتهي خلال 7 أيام. قم بالتجديد لاستعادة الوصول.",
  sub_renew: "تجديد",
  sub_add_subscription: "إضافة اشتراك",
  sub_period: "مدة الاشتراك",
  sub_bonus_months: "أشهر مجانية",
  sub_bonus_months_max: "الحد الأقصى 6 أشهر",
  sub_reason: "السبب / ملاحظات",
  sub_reason_placeholder: "مثال: عرض ترويجي، خصم المشتركين الأوائل...",
  sub_reason_renew_placeholder: "مثال: خصم تجديد، عميل مخلص...",
  sub_expires_on: "ينتهي",
  sub_expired_ago: "انتهى منذ {days} أيام",
  sub_expires_in: "ينتهي خلال {days} أيام",
  sub_no_subscription: "لا يوجد اشتراك",
  sub_subscription: "الاشتراك",
  sub_subscription_settings: "إعدادات الاشتراك",
  sub_renew_title: "تجديد الاشتراك",
  sub_renew_desc: "تجديد اشتراك",
  sub_renew_start_note: "ستبدأ الفترة الجديدة من اليوم.",
  sub_renew_button: "تجديد الاشتراك",
  sub_manage: "إدارة الاشتراك",
  sub_manage_title: "إدارة الاشتراك",
  sub_manage_desc: "تحديث إعدادات الاشتراك لـ",
  sub_save_changes: "حفظ التعديلات",
  sub_start_date: "تاريخ البدء",
  sub_note_label: "ملاحظة (اختياري)",
  sub_note_helper: "تُستخدم هذه الملاحظة للتوثيق فقط ولن تظهر لصاحب المطعم.",
  sub_create_desc: "أدخل تفاصيل المطعم الجديد مع الاشتراك.",
  
  // Subscription periods
  period_monthly: "شهر واحد",
  period_quarterly: "3 أشهر",
  period_semi_annual: "6 أشهر",
  period_annual: "سنة كاملة",
  
  // Additional common subscription texts
  days: "أيام",
  upload_logo: "رفع الشعار",
  
  // System Admin - Restaurants list
  sa_restaurants_title: "المطاعم",
  sa_restaurants_subtitle: "جميع المطاعم في النظام",
  sa_no_restaurants: "لا توجد مطاعم بعد. أنشئ واحداً للبدء.",
  sa_create_restaurant: "إنشاء مطعم",
  sa_create_restaurant_desc: "إضافة مطعم جديد",
  sa_create_owner: "إنشاء مالك",
  sa_create_owner_desc: "إضافة حساب مالك جديد",
  sa_assign_owner: "تعيين مالك",
  sa_assign_owner_desc: "ربط المالك بالمطعم",
  sa_owner_label: "المالك",
  sa_no_owner: "لم يتم تعيين مالك",
  sa_logo: "الشعار",
  sa_change_logo: "تغيير الشعار",
  sa_upload_logo: "رفع الشعار",
  
  // WhatsApp Contact
  wa_contact: "واتساب",
  wa_contact_tooltip: "تواصل عبر واتساب",
  wa_copy_tooltip: "نسخ رسالة واتساب",
  wa_no_number: "لا يوجد واتساب",
  wa_no_number_hint: "لا يوجد رقم هاتف متاح لهذا المالك",
  wa_open_failed: "تعذر فتح واتساب",
  wa_open_failed_desc: "يرجى المحاولة من متصفح أو جهاز آخر.",
  wa_copied: "تم النسخ",
  wa_copied_desc: "تم نسخ الرقم والرسالة. الصقها في واتساب.",
  wa_copy_failed: "فشل النسخ",
  sa_status_on: "تشغيل",
  sa_status_off: "إيقاف",
  sa_addons: "الإضافات",
  sa_addon_inventory: "إدارة المخزون",
  sa_addon_kds: "شاشة المطبخ",
  sa_addon_qr: "الطلب عبر QR",
  sa_select_restaurant: "اختر المطعم",
  sa_select_owner: "اختر المالك",
  sa_assign: "تعيين",
  sa_assign_dialog_title: "تعيين مالك للمطعم",
  sa_assign_dialog_desc: "اختر مطعم ومالك لربطهما.",
  sa_create_owner_dialog_title: "إنشاء مالك",
  sa_create_owner_dialog_desc: "إنشاء حساب مالك جديد مع البريد الإلكتروني وكلمة المرور واسم العرض.",
  sa_display_name: "اسم العرض",
  sa_display_name_min: "الحد الأدنى حرفان",
  sa_deactivate_title: "تعطيل المطعم؟",
  sa_deactivate_desc: "سيتم حظر نقطة البيع وطلبات QR ووصول الموظفين فوراً لـ",
  sa_deactivate_note: "سيتم تسجيل خروج جميع الملاك والكاشير ولن يتمكنوا من الوصول للنظام.",
  sa_deactivate: "تعطيل",
  sa_disable_inventory_title: "تعطيل وحدة المخزون؟",
  sa_enable_inventory_title: "تفعيل وحدة المخزون؟",
  sa_disable_inventory_desc: "سيتم تعطيل جميع ميزات المخزون لـ",
  sa_disable_inventory_note: "ستتوقف تتبع المخزون والوصفات وحسابات التكلفة.",
  sa_enable_inventory_desc: "سيتم تفعيل ميزات المخزون لـ",
  sa_enable_inventory_note: "سيتم تمكين تتبع المخزون والوصفات وحسابات التكلفة.",
  sa_disable: "تعطيل",
  sa_enable: "تفعيل",
  sa_disable_kds_title: "تعطيل شاشة المطبخ؟",
  sa_enable_kds_title: "تفعيل شاشة المطبخ؟",
  sa_disable_kds_desc: "سيتم تعطيل شاشة المطبخ لـ",
  sa_disable_kds_note: "لن يتمكن موظفو المطبخ من الوصول.",
  sa_enable_kds_desc: "سيتم تفعيل شاشة المطبخ لـ",
  sa_enable_kds_note: "سيتمكن موظفو المطبخ من عرض وإدارة الطلبات.",
  sa_disable_qr_title: "تعطيل الطلب عبر QR؟",
  sa_enable_qr_title: "تفعيل الطلب عبر QR؟",
  sa_disable_qr_desc: "سيتم تعطيل الطلب عبر QR لـ",
  sa_disable_qr_note: "لن يتمكن العملاء من تقديم الطلبات عبر رمز QR.",
  sa_enable_qr_desc: "سيتم تفعيل الطلب عبر QR لـ",
  sa_enable_qr_note: "يمكن للعملاء مسح رموز QR للطاولات وتقديم الطلبات.",
  sa_edit_name_title: "تعديل اسم المطعم",
  sa_edit_name_desc: "تحديث الاسم لـ",
  sa_enter_new_name: "أدخل الاسم الجديد",
  sa_edit_owner_title: "تعديل حساب المالك",
  sa_edit_owner_desc: "تحديث تفاصيل",
  sa_new_password_hint: "كلمة مرور جديدة (اتركه فارغاً للحفاظ على الحالية)",
  sa_update_logo_title: "تحديث شعار المطعم",
  sa_update_logo_desc: "ارفع شعاراً جديداً لهذا المطعم.",
  
  // Summary Bar
  sa_summary_total: "الإجمالي",
  sa_summary_active: "نشط",
  sa_summary_inactive: "غير نشط",
  sa_summary_incomplete: "غير مكتمل",
  sa_summary_sub_issue: "مشكلة اشتراك",
  
  // Filter Bar
  sa_filter_search_placeholder: "ابحث عن مطعم أو مالك...",
  sa_filter_features: "الميزات",
  sa_filter_clear: "مسح الفلاتر",
  sa_sub_active: "اشتراك نشط",
  sa_sub_expired: "منتهي",
  sa_sub_none: "بدون اشتراك",
  sa_sort_by: "ترتيب حسب",
  sa_sort_newest: "الأحدث أولاً",
  sa_sort_oldest: "الأقدم أولاً",
  sa_sort_last_activity: "آخر نشاط",
  sa_sort_expiry_nearest: "الانتهاء (الأقرب)",
  
  // Pagination
  sa_page_size: "لكل صفحة",
  
  // Stats
  sa_total_restaurants: "إجمالي المطاعم",
  sa_total_owners: "إجمالي الملاك",
  
  // Add-on state labels
  sa_addon_enabled: "مفعّل",
  sa_addon_disabled: "غير مفعّل",
  
  // Subscription bonus text
  sub_free_month: "شهر مجاني",
  sub_free_months: "{{count}} أشهر مجانًا",
  
  // Send to Kitchen
  send_to_kitchen: "إرسال إلى المطبخ",
  sent_to_kitchen: "تم الإرسال للمطبخ",
  send_to_kitchen_tooltip_enabled: "سيتم إرسال العناصر الجديدة فقط إلى المطبخ",
  send_to_kitchen_tooltip_disabled: "لا توجد عناصر جديدة للإرسال",
  items_sent_to_kitchen: "تم إرسال الأصناف إلى المطبخ",
  send_to_kitchen_failed: "فشل إرسال العناصر إلى المطبخ",
  
  // Subscription Expired
  subscription_expired_title: "انتهى الاشتراك",
  subscription_expired_message: "اشتراك المطعم منتهي. يرجى التواصل مع الدعم لتجديد الاشتراك.",
  contact_support: "تواصل مع الدعم",

  // QR Order Status View
  qr_status_received_title: "تم استلام طلبك بنجاح",
  qr_status_received_subtitle: "جاري تحضير الطلب",
  qr_status_preparing_title: "طلبك قيد التحضير",
  qr_status_preparing_subtitle: "المطبخ يعمل على تجهيز طلبك",
  qr_status_ready_title: "طلبك جاهز",
  qr_status_ready_subtitle: "يرجى انتظار التقديم",
  qr_status_cancelled_title: "يرجى مراجعة طاقم المطعم",
  qr_status_cancelled_subtitle: "للمساعدة بخصوص طلبك",
  qr_status_no_active_order: "لا يوجد طلب نشط حالياً",
  qr_status_order_number: "رقم الطلب",
  qr_status_helper_wait: "يرجى الانتظار، سيتم تحديث الحالة تلقائيًا",

  // Shift Close Warning
  shift_close_warning_title: "تحذير: طلبات مفتوحة",
  shift_close_warning_message: "يوجد طلبات مفتوحة في هذه الوردية. هل أنت متأكد من إغلاق الوردية؟",
  shift_close_warning_note: "إغلاق الوردية مع وجود طلبات مفتوحة قد يؤثر على التقارير.",
  open_orders_count: "الطلبات المفتوحة",
  held_orders_count: "الطلبات المعلقة",
  close_shift_anyway: "إغلاق الوردية",
  closing: "جار الإغلاق...",

  // Refund Reason (optional label)
  refund_reason_label: "سبب الاسترجاع (اختياري)",

  // Module Descriptions (one-sentence clarity notes)
  module_desc_pos: "إنشاء الطلبات، الدفع، وإدارة الطاولات.",
  module_desc_inventory: "تتبع المخزون والخصم التلقائي عند البيع.",
  module_desc_recipes: "ربط الأصناف بالمخزون لحساب التكلفة والخصم.",
  module_desc_reports: "مراجعة المبيعات والأداء واتخاذ القرارات.",
  module_desc_shifts: "فتح وإغلاق الورديات وتتبع النقد.",
  module_desc_kds: "عرض الطلبات في المطبخ وتحديث حالتها.",
  module_desc_settings: "ضبط الضريبة والعمولات وإعدادات النظام.",
  module_desc_tables: "إدارة الطاولات وتتبع حالتها.",
  module_desc_qr_orders: "استلام ومراجعة طلبات العملاء عبر QR.",
  module_desc_menu: "إدارة التصنيفات والأصناف والأسعار.",

  // POS Item Color Legend
  item_color_legend: "دلالات ألوان الأصناف",
  item_color_legend_title: "دلالات ألوان الأصناف:",
  item_color_offer: "صنف عليه عرض أو سعر خاص",
  item_color_selected: "الصنف المحدد حاليًا",
  item_color_regular: "صنف عادي بالسعر الأساسي",
  item_color_favorite: "صنف مفضل",

  // POS Item Tooltips (per-card hover)
  item_tooltip_offer: "عرض خاص",
  item_tooltip_selected: "الصنف المحدد",
  item_tooltip_regular: "سعر عادي",
  item_tooltip_favorite: "مفضل",

  // Promo Status Badges
  promo_status_active: "نشط",
  promo_status_scheduled: "مجدول",
  promo_status_expired: "منتهي",
  promo_status_disabled: "معطل",

  // Promo Enable Toggle
  promo_enabled: "تفعيل العرض",
  promo_enabled_desc: "تشغيل أو إيقاف العرض بغض النظر عن الوقت",

  // Promo Visibility Hint
  promo_visibility_hint: "تظهر العروض تلقائياً حسب التاريخ والحالة. العروض النشطة تظهر في الكاشير وقائمة QR.",
  
  // Time-Based Offers (Offer Category Only)
  offer_time_settings: "إعدادات وقت العرض",
  offer_visibility_hint: "يتم إظهار أو إخفاء العرض تلقائيًا حسب المدة والتفعيل",
  enable_offer: "تفعيل العرض",
  enable_offer_desc: "عند التعطيل، سيُخفى هذا العرض من الكاشير وقائمة QR",
  offer_start_date: "يبدأ من",
  offer_end_date: "ينتهي في",
  offer_dates_optional_hint: "اتركها فارغة لعرض بدون مدة محددة",
  
  // Category-Level Offer Time Controls
  offers_duration: "مدة العروض",
  category_offers_visibility_hint: "يتم إظهار أو إخفاء جميع العروض تلقائيًا حسب هذه المدة",
  category_offers_dates_hint: "اتركها فارغة لإظهار العروض عند تفعيل التصنيف",
  
  // QR Menu UX Improvements
  qr_item_added: "✔️ تمت إضافة الصنف",
  qr_remove_tooltip: "إزالة من الطلب",
  qr_remove_confirm: "إزالة؟",
  qr_amount_due: "المبلغ المستحق",
  qr_phone_trust: "نستخدم رقم الهاتف فقط في حال وجود استفسار عن الطلب",
  qr_notes_placeholder: "مثال: بدون سكر – قليل الثلج – تغليف سفري",
  qr_add_item_first: "أضف صنفًا أولًا",
  qr_language_changed: "تم تغيير اللغة",
} as const;
