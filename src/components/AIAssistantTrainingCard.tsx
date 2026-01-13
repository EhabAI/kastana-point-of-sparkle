// Training Card Component for AI Assistant
// Short, dismissible training cards with max 3 steps

import { X, GraduationCap, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type TrainingCard, dismissCard } from "@/lib/assistantTrainingCards";

interface AIAssistantTrainingCardProps {
  card: TrainingCard;
  language: "ar" | "en";
  onDismiss: (cardId: string) => void;
}

export function AIAssistantTrainingCard({
  card,
  language,
  onDismiss,
}: AIAssistantTrainingCardProps) {
  const handleDismiss = () => {
    dismissCard(card.id);
    onDismiss(card.id);
  };

  const labels = {
    why: language === "ar" ? "لماذا مهم:" : "Why it matters:",
    steps: language === "ar" ? "الخطوات:" : "Steps:",
    tip: language === "ar" ? "💡 نصيحة:" : "💡 Tip:",
    dismiss: language === "ar" ? "فهمت" : "Got it",
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-primary/20 bg-primary/5 p-4 space-y-3",
        "dark:border-primary/30 dark:bg-primary/10"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm text-primary">
            {card.title[language]}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Why it matters */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{labels.why}</p>
        <p className="text-sm">{card.whyMatters[language]}</p>
      </div>

      {/* Steps (max 3) */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{labels.steps}</p>
        <ol className="text-sm space-y-1 list-decimal list-inside">
          {card.steps[language].slice(0, 3).map((step, index) => (
            <li key={index} className="text-sm">
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* Optional Tip */}
      {card.tip && (
        <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg p-2">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-200">
            {card.tip[language]}
          </p>
        </div>
      )}

      {/* Dismiss button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={handleDismiss}
      >
        {labels.dismiss}
      </Button>
    </div>
  );
}
