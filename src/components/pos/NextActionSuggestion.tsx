/**
 * Next Action Suggestion Component
 * Shows a subtle suggestion for the next logical step after completing an action
 * Auto-dismisses after a few seconds
 */

import { Lightbulb, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface NextActionSuggestionProps {
  message: string;
  onDismiss?: () => void;
  className?: string;
}

export function NextActionSuggestion({
  message,
  onDismiss,
  className,
}: NextActionSuggestionProps) {
  const { language } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "bg-purple-50 dark:bg-purple-950/20",
        "border border-purple-200 dark:border-purple-800/50",
        "animate-in fade-in slide-in-from-bottom-2 duration-300",
        className
      )}
    >
      <div className="flex-shrink-0 p-1 rounded-full bg-purple-100 dark:bg-purple-900/30">
        <Lightbulb className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-purple-700 dark:text-purple-300 truncate">
          {message}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 flex-shrink-0 text-purple-500 hover:text-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/30"
        onClick={onDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

/**
 * Inline variant for tighter spaces
 */
export function NextActionSuggestionInline({
  message,
  onDismiss,
  className,
}: NextActionSuggestionProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400",
        "animate-in fade-in duration-300",
        className
      )}
    >
      <ArrowRight className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{message}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-0.5 rounded hover:bg-purple-100 dark:hover:bg-purple-900/30"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
