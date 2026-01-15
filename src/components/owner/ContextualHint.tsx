import { useState, useEffect } from "react";
import { X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ContextualHintProps {
  id: string;
  message: string;
  className?: string;
}

export function ContextualHint({ id, message, className }: ContextualHintProps) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const key = `hint_dismissed_${id}`;
    const wasDismissed = localStorage.getItem(key) === "true";
    setDismissed(wasDismissed);
  }, [id]);

  const handleDismiss = () => {
    const key = `hint_dismissed_${id}`;
    localStorage.setItem(key, "true");
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-lg text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50",
        className
      )}
    >
      <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
      <span className="flex-1">{message}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 p-0 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50"
        onClick={handleDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
