// Kastana POS Assistant Response Formatter
// Rules: Arabic primary, English terms OK, max 6 lines, structured output

export interface FormattedResponse {
  reason?: string;
  steps: string[];
  note?: string;
}

/**
 * Format a response following the strict structure:
 * 1) Reason (if exists)
 * 2) Steps (numbered)
 * 3) Optional note
 * 
 * Max 6 lines total
 */
export function formatResponse(
  response: FormattedResponse,
  language: "ar" | "en"
): string {
  const lines: string[] = [];
  
  // 1) Reason (optional)
  if (response.reason) {
    lines.push(response.reason);
  }
  
  // 2) Steps (numbered)
  const maxSteps = response.reason ? 4 : 5; // Leave room for reason/note
  const stepsToShow = response.steps.slice(0, maxSteps);
  
  stepsToShow.forEach((step, index) => {
    const num = language === "ar" ? `${index + 1}.` : `${index + 1}.`;
    lines.push(`${num} ${step}`);
  });
  
  // 3) Note (optional) - only if we have room
  if (response.note && lines.length < 6) {
    const notePrefix = language === "ar" ? "💡" : "💡";
    lines.push(`${notePrefix} ${response.note}`);
  }
  
  // Enforce max 6 lines
  return lines.slice(0, 6).join("\n");
}

/**
 * Parse raw knowledge content into structured format
 * Extracts reason, steps, and notes from verbose content
 */
export function parseAndCondense(
  rawContent: string,
  language: "ar" | "en"
): string {
  // If already short, return as-is
  const lines = rawContent.split("\n").filter(l => l.trim());
  if (lines.length <= 6) {
    return rawContent;
  }
  
  // Extract key parts
  const condensed: string[] = [];
  let foundSteps = false;
  let stepCount = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Skip empty or header-like lines
    if (!trimmed || trimmed.endsWith(":")) continue;
    
    // Check if it's a numbered step
    const isStep = /^[0-9١٢٣٤٥٦٧٨٩][\.\)]/.test(trimmed) || /^•/.test(trimmed);
    
    if (isStep && stepCount < 4) {
      foundSteps = true;
      condensed.push(trimmed);
      stepCount++;
    } else if (!foundSteps && condensed.length === 0) {
      // First meaningful line as reason
      condensed.push(trimmed);
    }
  }
  
  // Add a note if there's room
  if (condensed.length < 6) {
    const noteKeywords = language === "ar" 
      ? ["ملاحظة", "تنبيه", "💡"]
      : ["note", "tip", "💡"];
    
    for (const line of lines) {
      if (noteKeywords.some(kw => line.toLowerCase().includes(kw.toLowerCase()))) {
        condensed.push(line.trim());
        break;
      }
    }
  }
  
  return condensed.slice(0, 6).join("\n");
}

/**
 * Quick response templates for common intents
 */
export const quickResponses = {
  payment_disabled: {
    ar: formatResponse({
      reason: "زر الدفع معطل لأحد الأسباب:",
      steps: [
        "تأكد من وجود أصناف في الطلب",
        "تأكد من فتح الوردية (Shift)",
        "تأكد أن الطلب غير مدفوع مسبقاً"
      ],
      note: "افتح الوردية أولاً إذا لم تكن مفتوحة"
    }, "ar"),
    en: formatResponse({
      reason: "Pay button is disabled because:",
      steps: [
        "Ensure order has items",
        "Ensure shift is open",
        "Ensure order isn't already paid"
      ],
      note: "Open shift first if not already open"
    }, "en")
  },
  
  how_to_pay: {
    ar: formatResponse({
      steps: [
        "اضغط \"دفع\" في لوحة الطلب",
        "اختر طريقة الدفع (Cash / Card)",
        "أدخل المبلغ المستلم (للنقد)",
        "اضغط \"تأكيد\""
      ],
      note: "يمكن تقسيم الدفع على عدة طرق"
    }, "ar"),
    en: formatResponse({
      steps: [
        "Click \"Pay\" in order panel",
        "Select payment method (Cash / Card)",
        "Enter received amount (for cash)",
        "Click \"Confirm\""
      ],
      note: "You can split across multiple methods"
    }, "en")
  },
  
  how_to_hold: {
    ar: formatResponse({
      steps: [
        "اضغط \"Hold\" لتعليق الطلب",
        "ابدأ طلباً جديداً",
        "لاستئناف: اضغط \"Held Orders\"",
        "اختر الطلب ← \"Resume\""
      ]
    }, "ar"),
    en: formatResponse({
      steps: [
        "Click \"Hold\" to save order",
        "Start a new order",
        "To resume: click \"Held Orders\"",
        "Select order → \"Resume\""
      ]
    }, "en")
  },
  
  how_to_merge: {
    ar: formatResponse({
      steps: [
        "افتح أحد الطلبين",
        "اضغط (⋮) ← \"دمج\"",
        "اختر الطلب الهدف",
        "أكد الدمج"
      ],
      note: "لا يمكن التراجع بعد الدمج"
    }, "ar"),
    en: formatResponse({
      steps: [
        "Open one of the orders",
        "Click (⋮) → \"Merge\"",
        "Select target order",
        "Confirm merge"
      ],
      note: "Cannot undo after merge"
    }, "en")
  },
  
  z_report_explained: {
    ar: formatResponse({
      reason: "تقرير Z = ملخص الوردية:",
      steps: [
        "المبيعات: إجمالي + صافي",
        "طرق الدفع: نقد / بطاقات / محفظة",
        "النقدية: افتتاحي → متوقع → فعلي",
        "الخصومات والمرتجعات"
      ],
      note: "يُنشأ عند إغلاق الوردية"
    }, "ar"),
    en: formatResponse({
      reason: "Z Report = Shift summary:",
      steps: [
        "Sales: Gross + Net",
        "Payments: Cash / Cards / Wallet",
        "Drawer: Opening → Expected → Actual",
        "Discounts & Refunds"
      ],
      note: "Generated when closing shift"
    }, "en")
  },
  
  gross_vs_net: {
    ar: formatResponse({
      steps: [
        "Gross = المبلغ قبل الخصومات",
        "Net = المبلغ بعد الخصومات والمرتجعات",
        "المعادلة: Net = Gross - خصم - مرتجع"
      ],
      note: "هامش الربح يُحسب على Net"
    }, "ar"),
    en: formatResponse({
      steps: [
        "Gross = Amount before discounts",
        "Net = Amount after discounts & refunds",
        "Formula: Net = Gross - discount - refund"
      ],
      note: "Profit margin calculated on Net"
    }, "en")
  }
};

/**
 * Get a quick response by key
 */
export function getQuickResponse(
  key: keyof typeof quickResponses,
  language: "ar" | "en"
): string {
  return quickResponses[key]?.[language] || "";
}
