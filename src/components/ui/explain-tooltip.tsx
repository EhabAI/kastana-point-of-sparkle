/**
 * ExplainTooltip Component
 * Lightweight tooltip-based explanation layer for key numbers.
 * Shows a small info icon that displays explanatory text on hover/tap.
 */

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type ExplainKey =
  | "order_total"
  | "tax"
  | "profit"
  | "z_report_total"
  | "confidence_score"
  | "discount"
  | "gross_sales"
  | "net_sales"
  | "service_charge";

interface ExplainTooltipProps {
  explainKey: ExplainKey;
  language: "ar" | "en";
  className?: string;
}

/**
 * Approved tooltip copy - max 3 short lines, human-readable, no formulas
 */
const EXPLAIN_COPY: Record<ExplainKey, { ar: string; en: string }> = {
  order_total: {
    ar: "يُحسب من الأصناف المختارة،\nبعد الخصومات والضريبة.",
    en: "Calculated from the selected items,\nafter discounts and tax.",
  },
  tax: {
    ar: "تُطبق تلقائياً بناءً على\nإعدادات الضريبة في مطعمك.",
    en: "Applied automatically based on\nyour restaurant tax settings.",
  },
  profit: {
    ar: "يُحسب من المبيعات بعد\nخصم التكاليف والاستقطاعات.",
    en: "Calculated from sales after\ncosts and deductions.",
  },
  z_report_total: {
    ar: "ملخص جميع الطلبات المكتملة\nخلال الفترة المحددة.",
    en: "Summary of all completed orders\nwithin the selected period.",
  },
  confidence_score: {
    ar: "يعكس استقرار العمليات\nبناءً على النشاط الأخير.",
    en: "Reflects overall operational stability\nbased on recent activity.",
  },
  discount: {
    ar: "يُطبق يدوياً أو تلقائياً\nوفقاً لقواعد الخصم.",
    en: "Applied manually or automatically\naccording to discount rules.",
  },
  gross_sales: {
    ar: "إجمالي المبيعات قبل\nأي خصومات أو استردادات.",
    en: "Total sales before\nany discounts or refunds.",
  },
  net_sales: {
    ar: "المبيعات بعد خصم\nالتخفيضات المطبقة.",
    en: "Sales after applied\ndiscounts are deducted.",
  },
  service_charge: {
    ar: "رسوم الخدمة المضافة\nحسب إعدادات المطعم.",
    en: "Service fee added according\nto restaurant settings.",
  },
};

export function ExplainTooltip({
  explainKey,
  language,
  className = "",
}: ExplainTooltipProps) {
  const copy = EXPLAIN_COPY[explainKey];
  if (!copy) return null;

  const text = language === "ar" ? copy.ar : copy.en;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info
            className={`h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground cursor-help inline-block align-middle ${className}`}
            aria-label={language === "ar" ? "توضيح" : "Explain"}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[200px] text-xs whitespace-pre-line"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
