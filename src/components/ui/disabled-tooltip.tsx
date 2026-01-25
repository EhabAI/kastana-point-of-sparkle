/**
 * DisabledTooltip Component
 * Shows a small info icon with tooltip explaining WHY a button/option is disabled.
 * UI-only, no logic, no actions.
 */

import { HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type DisabledReasonKey =
  | "order_held"
  | "order_not_open"
  | "no_items"
  | "shift_closed"
  | "kds_disabled"
  | "no_pending_items"
  | "already_sent"
  | "no_payment"
  | "inventory_disabled"
  | "feature_disabled"
  | "zero_total";

interface DisabledTooltipProps {
  reasonKey: DisabledReasonKey;
  language: "ar" | "en";
  className?: string;
  show?: boolean;
}

/**
 * Reason copy - short explanations only
 */
const DISABLED_REASONS: Record<DisabledReasonKey, { ar: string; en: string }> = {
  order_held: {
    ar: "غير متاح لأن الطلب في حالة Hold",
    en: "Not available because order is on hold",
  },
  order_not_open: {
    ar: "غير متاح لأن الطلب ليس مفتوحاً",
    en: "Not available because order is not open",
  },
  no_items: {
    ar: "غير متاح لأن الطلب فارغ",
    en: "Not available because order is empty",
  },
  shift_closed: {
    ar: "غير متاح لأن الوردية مغلقة",
    en: "Not available because shift is closed",
  },
  kds_disabled: {
    ar: "غير متاح لأن KDS غير مفعّل لهذا المطعم",
    en: "Not available because KDS is not enabled",
  },
  no_pending_items: {
    ar: "تم إرسال جميع الأصناف للمطبخ",
    en: "All items have been sent to kitchen",
  },
  already_sent: {
    ar: "تم الإرسال بالفعل",
    en: "Already sent",
  },
  no_payment: {
    ar: "لم يتم إدخال مبلغ للدفع",
    en: "No payment amount entered",
  },
  inventory_disabled: {
    ar: "غير متاح لأن المخزون غير مفعّل",
    en: "Not available because inventory is disabled",
  },
  feature_disabled: {
    ar: "هذه الميزة غير مفعّلة",
    en: "This feature is not enabled",
  },
  zero_total: {
    ar: "غير متاح لأن المجموع صفر",
    en: "Not available because total is zero",
  },
};

export function DisabledTooltip({
  reasonKey,
  language,
  className = "",
  show = true,
}: DisabledTooltipProps) {
  if (!show) return null;
  
  const reason = DISABLED_REASONS[reasonKey];
  if (!reason) return null;

  const text = language === "ar" ? reason.ar : reason.en;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle
            className={cn(
              "h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help inline-block align-middle",
              className
            )}
            aria-label={language === "ar" ? "لماذا معطل؟" : "Why disabled?"}
          />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[200px] text-xs"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper to determine the reason key based on common conditions
 */
export function getDisabledReason(conditions: {
  hasItems?: boolean;
  isOpen?: boolean;
  isHeld?: boolean;
  shiftOpen?: boolean;
  kdsEnabled?: boolean;
  hasPendingItems?: boolean;
  hasPayment?: boolean;
  total?: number;
}): DisabledReasonKey | null {
  const { hasItems, isOpen, isHeld, shiftOpen, kdsEnabled, hasPendingItems, hasPayment, total } = conditions;
  
  if (shiftOpen === false) return "shift_closed";
  if (hasItems === false) return "no_items";
  if (isHeld === true) return "order_held";
  if (isOpen === false) return "order_not_open";
  if (kdsEnabled === false) return "kds_disabled";
  if (hasPendingItems === false) return "no_pending_items";
  if (hasPayment === false) return "no_payment";
  if (total !== undefined && total <= 0) return "zero_total";
  
  return null;
}
