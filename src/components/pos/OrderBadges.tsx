import { Badge } from "@/components/ui/badge";
import { Smartphone, Pause, GitMerge, Percent, Undo2, StickyNote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderBadgesProps {
  source?: string;
  status?: string;
  isMerged?: boolean;
  hasDiscount?: boolean;
  hasRefund?: boolean;
  hasNotes?: boolean;
  compact?: boolean;
  className?: string;
}

export function OrderBadges({
  source,
  status,
  isMerged,
  hasDiscount,
  hasRefund,
  hasNotes,
  compact = false,
  className,
}: OrderBadgesProps) {
  const { t } = useLanguage();

  const badges = [];

  // QR Badge
  if (source === "qr") {
    badges.push({
      key: "qr",
      icon: Smartphone,
      label: t("badge_qr"),
      className: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    });
  }

  // Hold Badge
  if (status === "held") {
    badges.push({
      key: "hold",
      icon: Pause,
      label: t("badge_hold"),
      className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    });
  }

  // Merged Badge
  if (isMerged) {
    badges.push({
      key: "merged",
      icon: GitMerge,
      label: t("badge_merged"),
      className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    });
  }

  // Discount Badge
  if (hasDiscount) {
    badges.push({
      key: "discount",
      icon: Percent,
      label: t("badge_discount"),
      className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 border-green-200 dark:border-green-800",
    });
  }

  // Refund Badge
  if (hasRefund) {
    badges.push({
      key: "refund",
      icon: Undo2,
      label: t("badge_refund"),
      className: "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800",
    });
  }

  // Notes Badge
  if (hasNotes) {
    badges.push({
      key: "notes",
      icon: StickyNote,
      label: t("badge_notes"),
      className: "bg-slate-100 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800",
    });
  }

  if (badges.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1 flex-wrap", className)}>
        {badges.map(({ key, icon: Icon, label, className: badgeClassName }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "px-1.5 py-0.5 text-[10px] font-medium gap-0.5 cursor-default border",
                  compact && "px-1 py-0",
                  badgeClassName
                )}
              >
                <Icon className={cn("h-3 w-3", compact && "h-2.5 w-2.5")} />
                {!compact && <span>{label}</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

// Helper to get background class for order status
export function getOrderStatusBackground(status?: string, hasDiscount?: boolean): string {
  if (status === "held") {
    return "bg-amber-50/50 dark:bg-amber-950/20";
  }
  if (hasDiscount) {
    return "bg-green-50/30 dark:bg-green-950/10";
  }
  return "";
}
