/**
 * Explain Button Component
 * Small help button that opens contextual explanation
 */

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLanguage } from "@/contexts/LanguageContext";

interface ExplainButtonProps {
  topic: string;
  tooltipContent?: { ar: string; en: string };
  onClick?: () => void;
  size?: "sm" | "default";
}

// Predefined explanations for common topics
const EXPLANATIONS: Record<string, { ar: string; en: string }> = {
  variance: {
    ar: "الفرق بين المخزون النظري والفعلي. يساعد على اكتشاف الهدر أو السرقة مبكراً.",
    en: "The difference between theoretical and actual stock. Helps detect waste or theft early.",
  },
  z_report: {
    ar: "تقرير يومي يلخص المبيعات والنقد. يُستخدم لإغلاق اليوم، وليس للتحليل الطويل المدى.",
    en: "Daily report summarizing sales and cash. Used for closing the day, not long-term analysis.",
  },
  refund: {
    ar: "استرداد المبلغ للعميل بعد إتمام الدفع. يُسجل في التقارير ويؤثر على المبيعات.",
    en: "Returning money to customer after payment. Recorded in reports and affects sales.",
  },
  void: {
    ar: "إلغاء صنف قبل الدفع. لا يُسجل كبيع ولا يحتاج استرداد.",
    en: "Canceling an item before payment. Not recorded as a sale, no refund needed.",
  },
  hold: {
    ar: "تعليق الطلب مؤقتاً للمتابعة لاحقاً. الطلب يبقى محفوظاً ويمكن استئنافه.",
    en: "Temporarily holding an order for later. The order is saved and can be resumed.",
  },
  shift: {
    ar: "فترة عمل الكاشير. يجب فتح وردية قبل أي عملية بيع وإغلاقها في نهاية الدوام.",
    en: "Cashier's work period. Must open a shift before any sale and close it at end of day.",
  },
  discount: {
    ar: "خصم على الطلب. يُسجل في التقارير ويحتاج عادةً سبب للمراجعة لاحقاً.",
    en: "Discount on order. Recorded in reports and usually needs a reason for later review.",
  },
  cogs: {
    ar: "تكلفة المبيعات - تكلفة المكونات المستخدمة في كل صنف مباع.",
    en: "Cost of Goods Sold - the cost of ingredients used for each item sold.",
  },
};

export function ExplainButton({ 
  topic, 
  tooltipContent,
  onClick,
  size = "sm"
}: ExplainButtonProps) {
  const { language } = useLanguage();
  
  const explanation = tooltipContent || EXPLANATIONS[topic] || {
    ar: "اضغط للمزيد من المعلومات",
    en: "Click for more information",
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`${size === "sm" ? "h-6 w-6 p-0" : "h-8 w-8 p-0"} text-muted-foreground/60 hover:text-muted-foreground`}
            onClick={onClick}
          >
            <HelpCircle className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </Button>
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="max-w-[250px] text-xs"
        >
          <p>{explanation[language]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
