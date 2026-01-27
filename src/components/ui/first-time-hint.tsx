/**
 * First-Time Hint Component
 * A reusable component for showing one-time educational hints
 * across all major modules in the system.
 */

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const HINTS_STORAGE_KEY = "kastana_first_time_hints";

export type HintKey =
  | "pos_orders"
  | "pos_tables"
  | "pos_qr_orders"
  | "inventory_overview"
  | "inventory_recipes"
  | "shifts"
  | "reports"
  | "kds"
  | "settings"
  | "menu_management";

interface HintConfig {
  title: { ar: string; en: string };
  steps: { ar: string; en: string }[];
}

const HINT_CONFIGS: Record<HintKey, HintConfig> = {
  pos_orders: {
    title: { ar: "كيف يعمل الطلب؟", en: "How does ordering work?" },
    steps: [
      { ar: "إنشاء الطلب", en: "Create the order" },
      { ar: "إضافة الأصناف", en: "Add items" },
      { ar: "الدفع أو التعليق", en: "Pay or hold" },
    ],
  },
  pos_tables: {
    title: { ar: "كيف تعمل الطاولات؟", en: "How do tables work?" },
    steps: [
      { ar: "اختر طاولة لبدء طلب", en: "Select a table to start an order" },
      { ar: "الطاولة تظهر مشغولة حتى الدفع", en: "Table shows occupied until payment" },
      { ar: "يمكنك دمج أو نقل الطلبات", en: "You can merge or transfer orders" },
    ],
  },
  pos_qr_orders: {
    title: { ar: "كيف تعمل طلبات QR؟", en: "How do QR orders work?" },
    steps: [
      { ar: "الطلبات تصل من العملاء عبر QR", en: "Orders arrive from customers via QR" },
      { ar: "راجع الطلب ثم اعتمده أو ارفضه", en: "Review then accept or reject" },
      { ar: "بعد الاعتماد يمكنك الدفع أو الإرسال للمطبخ", en: "After approval, pay or send to kitchen" },
    ],
  },
  inventory_overview: {
    title: { ar: "كيف يعمل المخزون؟", en: "How does inventory work?" },
    steps: [
      { ar: "أضف أصناف المخزون", en: "Add inventory items" },
      { ar: "اربطها بوصفات أصناف القائمة", en: "Link them to menu item recipes" },
      { ar: "الخصم يتم تلقائياً عند البيع", en: "Deduction happens automatically on sale" },
    ],
  },
  inventory_recipes: {
    title: { ar: "كيف تعمل الوصفة؟", en: "How do recipes work?" },
    steps: [
      { ar: "الوصفة تحدد الأصناف التي يتم خصمها من المخزون", en: "The recipe defines which items are deducted from inventory" },
      { ar: "يتم الخصم فقط عند بيع الصنف", en: "Deduction only happens when the item is sold" },
      { ar: "إذا لم يكن الصنف مرتبطًا بوصفة، فلن يتم خصم المخزون", en: "If the item has no recipe, inventory won't be deducted" },
    ],
  },
  shifts: {
    title: { ar: "كيف تعمل الوردية؟", en: "How do shifts work?" },
    steps: [
      { ar: "افتح الوردية لبدء العمل", en: "Open shift to start working" },
      { ar: "سجل المبيعات والمصروفات", en: "Record sales and expenses" },
      { ar: "أغلق الوردية وراجع تقرير Z", en: "Close shift and review Z report" },
    ],
  },
  reports: {
    title: { ar: "كيف تعمل التقارير؟", en: "How do reports work?" },
    steps: [
      { ar: "اختر الفترة الزمنية", en: "Select the time period" },
      { ar: "اختر نوع التقرير", en: "Choose report type" },
      { ar: "راجع البيانات واتخذ القرارات", en: "Review data and make decisions" },
    ],
  },
  kds: {
    title: { ar: "كيف يعمل KDS؟", en: "How does KDS work?" },
    steps: [
      { ar: "الطلبات تظهر عند إرسالها من POS", en: "Orders appear when sent from POS" },
      { ar: "اضغط على الطلب لتحديثه كجاهز", en: "Tap order to mark as ready" },
      { ar: "الطلبات الجاهزة تختفي تلقائياً", en: "Ready orders auto-clear" },
    ],
  },
  settings: {
    title: { ar: "كيف تعمل الإعدادات؟", en: "How do settings work?" },
    steps: [
      { ar: "الإعدادات تؤثر على جميع الفروع", en: "Settings affect all branches" },
      { ar: "تغييرات الضريبة تظهر فوراً", en: "Tax changes appear immediately" },
      { ar: "بعض الإعدادات تحتاج إعادة تحميل", en: "Some settings need a refresh" },
    ],
  },
  menu_management: {
    title: { ar: "كيف تدير القائمة؟", en: "How to manage the menu?" },
    steps: [
      { ar: "أضف التصنيفات أولاً", en: "Add categories first" },
      { ar: "أضف الأصناف تحت كل تصنيف", en: "Add items under each category" },
      { ar: "حدد الأسعار والتوفر لكل فرع", en: "Set prices and availability per branch" },
    ],
  },
};

function getShownHints(): HintKey[] {
  try {
    const stored = localStorage.getItem(HINTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function markHintShown(key: HintKey): void {
  const shown = getShownHints();
  if (!shown.includes(key)) {
    shown.push(key);
    localStorage.setItem(HINTS_STORAGE_KEY, JSON.stringify(shown));
  }
}

export function isHintShown(key: HintKey): boolean {
  return getShownHints().includes(key);
}

interface FirstTimeHintProps {
  hintKey: HintKey;
  className?: string;
}

export function FirstTimeHint({ hintKey, className }: FirstTimeHintProps) {
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const wasShown = isHintShown(hintKey);
    setDismissed(wasShown);
  }, [hintKey]);

  const handleDismiss = () => {
    markHintShown(hintKey);
    setDismissed(true);
  };

  if (dismissed) return null;

  const config = HINT_CONFIGS[hintKey];
  if (!config) return null;

  const title = config.title[language as "ar" | "en"] || config.title.en;
  const steps = config.steps.map((s) => s[language as "ar" | "en"] || s.en);
  const gotItText = language === "ar" ? "فهمت" : "Got it";

  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-muted/30",
        "animate-in fade-in slide-in-from-top-2 duration-300",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-sm font-medium">{title}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <ol className="space-y-1.5 mb-3">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs h-8"
        onClick={handleDismiss}
      >
        {gotItText}
      </Button>
    </div>
  );
}

/**
 * Hook to check if a hint should be shown
 */
export function useFirstTimeHint(key: HintKey) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    setShouldShow(!isHintShown(key));
  }, [key]);

  const dismiss = () => {
    markHintShown(key);
    setShouldShow(false);
  };

  return { shouldShow, dismiss };
}
