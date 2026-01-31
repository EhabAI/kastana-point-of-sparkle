/**
 * CSV Upload Error Handler
 * Parses CSV validation and backend errors into user-friendly bilingual messages.
 * Replaces generic "An error occurred" messages with specific, actionable feedback.
 */

type CSVErrorType = 
  | 'missing_columns'
  | 'empty_file'
  | 'no_valid_rows'
  | 'branch_required'
  | 'duplicate_data'
  | 'parse_error'
  | 'permission_error'
  | 'network_error'
  | 'database_error'
  | 'category_error'
  | 'item_error'
  | 'price_error'
  | 'unknown';

interface CSVErrorResult {
  type: CSVErrorType;
  message: string;
  hint?: string;
}

const ERROR_MESSAGES: Record<CSVErrorType, { ar: string; en: string; hint_ar?: string; hint_en?: string }> = {
  missing_columns: {
    ar: "فشل رفع الملف: الأعمدة المطلوبة غير مكتملة",
    en: "Upload failed: Required columns are missing",
    hint_ar: "تأكد من وجود جميع الأعمدة المطلوبة في الملف",
    hint_en: "Make sure all required columns are present in the file"
  },
  empty_file: {
    ar: "الملف فارغ أو لا يحتوي على بيانات",
    en: "File is empty or contains no data",
    hint_ar: "تأكد من أن الملف يحتوي على صفوف بيانات بعد رؤوس الأعمدة",
    hint_en: "Make sure the file has data rows after the header row"
  },
  no_valid_rows: {
    ar: "لم يتم العثور على صفوف بيانات صالحة في الملف",
    en: "No valid data rows found in the file",
    hint_ar: "تحقق من أن الصفوف تحتوي على جميع البيانات المطلوبة",
    hint_en: "Check that rows contain all required data"
  },
  branch_required: {
    ar: "لا يمكن رفع القائمة بدون تحديد الفرع",
    en: "Cannot upload menu without selecting a branch",
    hint_ar: "اختر الفرع من القائمة أعلى الصفحة أولاً",
    hint_en: "Select a branch from the dropdown at the top of the page first"
  },
  duplicate_data: {
    ar: "بعض العناصر موجودة مسبقاً وسيتم تحديثها",
    en: "Some items already exist and will be updated",
    hint_ar: "العناصر المكررة ستُحدّث تلقائياً",
    hint_en: "Duplicate items will be updated automatically"
  },
  parse_error: {
    ar: "خطأ في قراءة الملف - تنسيق غير صحيح",
    en: "Error reading file - Invalid format",
    hint_ar: "تأكد من أن الملف بتنسيق CSV صحيح ومفصول بفاصلة",
    hint_en: "Make sure the file is a valid CSV format separated by commas"
  },
  permission_error: {
    ar: "ليس لديك صلاحية لرفع البيانات",
    en: "You don't have permission to upload data",
    hint_ar: "تأكد من أن اشتراكك فعّال وأنك تملك الصلاحية المناسبة",
    hint_en: "Make sure your subscription is active and you have the appropriate permission"
  },
  network_error: {
    ar: "خطأ في الاتصال أثناء رفع الملف",
    en: "Connection error while uploading file",
    hint_ar: "تحقق من اتصالك بالإنترنت وحاول مرة أخرى",
    hint_en: "Check your internet connection and try again"
  },
  database_error: {
    ar: "حدث خطأ تقني أثناء حفظ البيانات",
    en: "A technical error occurred while saving data",
    hint_ar: "لم يتم حفظ أي بيانات. يرجى المحاولة مرة أخرى",
    hint_en: "No data was saved. Please try again"
  },
  category_error: {
    ar: "خطأ في إنشاء الفئة",
    en: "Error creating category",
    hint_ar: "تأكد من أن اسم الفئة صحيح وغير مكرر",
    hint_en: "Make sure the category name is valid and not duplicated"
  },
  item_error: {
    ar: "خطأ في إنشاء عنصر القائمة",
    en: "Error creating menu item",
    hint_ar: "تأكد من أن اسم العنصر والسعر صحيحين",
    hint_en: "Make sure the item name and price are valid"
  },
  price_error: {
    ar: "السعر غير صحيح في بعض الصفوف",
    en: "Invalid price in some rows",
    hint_ar: "تأكد من أن عمود السعر يحتوي على أرقام فقط",
    hint_en: "Make sure the price column contains only numbers"
  },
  unknown: {
    ar: "حدث خطأ غير متوقع أثناء الرفع",
    en: "An unexpected error occurred during upload",
    hint_ar: "يرجى المحاولة مرة أخرى أو التواصل مع الدعم",
    hint_en: "Please try again or contact support"
  }
};

/**
 * Detects the error type from raw error message or object
 */
function detectErrorType(error: unknown): CSVErrorType {
  if (!error) return 'unknown';
  
  const errorMessage = typeof error === 'string' 
    ? error.toLowerCase()
    : (error instanceof Error ? error.message.toLowerCase() : '');
  
  // Check for specific error patterns
  if (errorMessage.includes('missing required columns') || 
      errorMessage.includes('missing columns') ||
      errorMessage.includes('أعمدة مطلوبة مفقودة')) {
    return 'missing_columns';
  }
  
  if (errorMessage.includes('empty') || 
      errorMessage.includes('فارغ') ||
      errorMessage.includes('no data rows')) {
    return 'empty_file';
  }
  
  if (errorMessage.includes('no valid') || 
      errorMessage.includes('لم يتم العثور على صفوف')) {
    return 'no_valid_rows';
  }
  
  if (errorMessage.includes('branch') || 
      errorMessage.includes('فرع') ||
      errorMessage.includes('select_branch')) {
    return 'branch_required';
  }
  
  if (errorMessage.includes('duplicate') || 
      errorMessage.includes('already exists') ||
      errorMessage.includes('unique constraint')) {
    return 'duplicate_data';
  }
  
  if (errorMessage.includes('parse') || 
      errorMessage.includes('syntax') ||
      errorMessage.includes('format')) {
    return 'parse_error';
  }
  
  if (errorMessage.includes('permission') || 
      errorMessage.includes('policy') ||
      errorMessage.includes('rls') ||
      errorMessage.includes('denied') ||
      errorMessage.includes('42501')) {
    return 'permission_error';
  }
  
  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')) {
    return 'network_error';
  }
  
  if (errorMessage.includes('category') || 
      errorMessage.includes('فئة')) {
    return 'category_error';
  }
  
  if (errorMessage.includes('item') || 
      errorMessage.includes('عنصر') ||
      errorMessage.includes('صنف')) {
    return 'item_error';
  }
  
  if (errorMessage.includes('price') || 
      errorMessage.includes('سعر') ||
      errorMessage.includes('nan') ||
      errorMessage.includes('number')) {
    return 'price_error';
  }
  
  return 'database_error';
}

/**
 * Gets a user-friendly error message for CSV upload errors.
 * Handles bilingual messages based on the current language.
 * 
 * @param error - The raw error from validation or backend
 * @param language - Current UI language ('ar' or 'en')
 * @param isTrainingMode - Whether training mode is active (for educational hints)
 * @param missingColumns - Specific missing columns for detailed message
 */
export function getCSVErrorMessage(
  error: unknown,
  language: 'ar' | 'en',
  isTrainingMode: boolean = false,
  missingColumns?: string[]
): CSVErrorResult {
  const errorType = detectErrorType(error);
  const errorConfig = ERROR_MESSAGES[errorType];
  
  // Build base message
  let message = language === 'ar' ? errorConfig.ar : errorConfig.en;
  
  // Append specific missing columns if provided
  if (errorType === 'missing_columns' && missingColumns?.length) {
    const columnsStr = missingColumns.join(', ');
    message += `: ${columnsStr}`;
  }
  
  // Add educational hint in training mode
  let hint: string | undefined;
  if (isTrainingMode) {
    hint = language === 'ar' ? errorConfig.hint_ar : errorConfig.hint_en;
  }
  
  return {
    type: errorType,
    message,
    hint
  };
}

/**
 * Builds a success message for CSV upload with statistics
 */
export function getCSVSuccessMessage(
  language: 'ar' | 'en',
  stats: {
    categoriesCreated?: number;
    itemsCreated?: number;
    itemsUpdated?: number;
    branchLinksCreated?: number;
    offersCreated?: number;
    offersUpdated?: number;
  }
): string {
  const parts: string[] = [];
  
  if (language === 'ar') {
    if (stats.categoriesCreated) parts.push(`${stats.categoriesCreated} فئات تم إنشاؤها`);
    if (stats.itemsCreated) parts.push(`${stats.itemsCreated} عناصر تم إنشاؤها`);
    if (stats.itemsUpdated) parts.push(`${stats.itemsUpdated} عناصر تم تحديثها`);
    if (stats.offersCreated) parts.push(`${stats.offersCreated} عروض تم إنشاؤها`);
    if (stats.offersUpdated) parts.push(`${stats.offersUpdated} عروض تم تحديثها`);
    if (stats.branchLinksCreated) parts.push(`${stats.branchLinksCreated} روابط فرع تم إنشاؤها`);
    return `تمت المعالجة بنجاح: ${parts.join('، ')}`;
  } else {
    if (stats.categoriesCreated) parts.push(`${stats.categoriesCreated} categories created`);
    if (stats.itemsCreated) parts.push(`${stats.itemsCreated} items created`);
    if (stats.itemsUpdated) parts.push(`${stats.itemsUpdated} items updated`);
    if (stats.offersCreated) parts.push(`${stats.offersCreated} offers created`);
    if (stats.offersUpdated) parts.push(`${stats.offersUpdated} offers updated`);
    if (stats.branchLinksCreated) parts.push(`${stats.branchLinksCreated} branch links created`);
    return `Successfully processed: ${parts.join(', ')}`;
  }
}
