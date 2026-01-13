// Training List Component for AI Assistant
// Shows all available training cards that can be re-opened

import { GraduationCap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  getAllTrainingCards,
  getDismissedCards,
  undismissCard,
  type TrainingCard,
} from "@/lib/assistantTrainingCards";

interface AIAssistantTrainingListProps {
  language: "ar" | "en";
  onSelectCard: (card: TrainingCard) => void;
  onClose: () => void;
}

export function AIAssistantTrainingList({
  language,
  onSelectCard,
  onClose,
}: AIAssistantTrainingListProps) {
  const allCards = getAllTrainingCards();
  const dismissedIds = getDismissedCards();

  const labels = {
    title: language === "ar" ? "دليل التدريب" : "Training Guide",
    subtitle:
      language === "ar"
        ? "اضغط على أي بطاقة لعرض التفاصيل"
        : "Click any card to view details",
    dismissed: language === "ar" ? "تم الإخفاء" : "Dismissed",
    restore: language === "ar" ? "إعادة عرض" : "Restore",
    close: language === "ar" ? "إغلاق" : "Close",
  };

  const handleRestore = (cardId: string) => {
    undismissCard(cardId);
    const card = allCards.find((c) => c.id === cardId);
    if (card) {
      onSelectCard(card);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-primary/5">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">{labels.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
      </div>

      {/* Card List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {allCards.map((card) => {
            const isDismissed = dismissedIds.includes(card.id);

            return (
              <div
                key={card.id}
                className={cn(
                  "p-3 rounded-lg border transition-colors",
                  isDismissed
                    ? "bg-muted/50 border-muted"
                    : "bg-card border-border hover:border-primary/50 cursor-pointer"
                )}
                onClick={() => !isDismissed && onSelectCard(card)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        isDismissed && "text-muted-foreground"
                      )}
                    >
                      {card.title[language]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {card.whyMatters[language]}
                    </p>
                  </div>

                  {isDismissed && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRestore(card.id);
                      }}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {labels.restore}
                    </Button>
                  )}
                </div>

                {/* Context badges */}
                {card.context && (
                  <div className="flex gap-1 mt-2">
                    {card.context.map((ctx) => (
                      <span
                        key={ctx}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                      >
                        {ctx}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button variant="outline" className="w-full" onClick={onClose}>
          {labels.close}
        </Button>
      </div>
    </div>
  );
}
