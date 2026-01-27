/**
 * Block Explanation Component
 * Displays a calm, neutral explanation for why an action is blocked
 * Used for silent rule explaining without interrupting workflow
 */

import { Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { type BlockReasonKey, getBlockExplanation } from "@/lib/assistantInFlowIntelligence";

interface BlockExplanationProps {
  reasonKey: BlockReasonKey;
  variant?: "default" | "compact" | "inline";
  className?: string;
}

export function BlockExplanation({
  reasonKey,
  variant = "default",
  className,
}: BlockExplanationProps) {
  const { language } = useLanguage();
  const explanation = getBlockExplanation(reasonKey, language);

  if (variant === "inline") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground",
          className
        )}
      >
        <Info className="h-3 w-3" />
        {explanation}
      </span>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "flex items-center gap-1.5 text-xs text-muted-foreground",
          className
        )}
      >
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>{explanation}</span>
      </div>
    );
  }

  // Default variant - card style
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-md",
        "bg-muted/50 border border-border/50",
        className
      )}
    >
      <Info className="h-4 w-4 flex-shrink-0 text-muted-foreground mt-0.5" />
      <p className="text-xs text-muted-foreground">{explanation}</p>
    </div>
  );
}

/**
 * Enhanced version with icon matching severity
 */
export function BlockExplanationAlert({
  reasonKey,
  severity = "info",
  className,
}: BlockExplanationProps & { severity?: "info" | "warning" }) {
  const { language } = useLanguage();
  const explanation = getBlockExplanation(reasonKey, language);

  const isWarning = severity === "warning";
  const Icon = isWarning ? AlertCircle : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-md text-xs",
        isWarning
          ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
          : "bg-muted/50 text-muted-foreground border border-border/50",
        className
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <p>{explanation}</p>
    </div>
  );
}
