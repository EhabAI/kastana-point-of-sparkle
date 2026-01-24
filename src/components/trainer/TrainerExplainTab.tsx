// Trainer Explain Tab - Element explanation mode
// Lets users click elements to get explanations

import { HelpCircle, MousePointerClick, X, BookOpen, AlertTriangle, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTrainer } from "@/contexts/TrainerContext";
import { type UIElement } from "@/lib/trainerRegistry";

interface TrainerExplainTabProps {
  language: "ar" | "en";
}

export function TrainerExplainTab({ language }: TrainerExplainTabProps) {
  const { mode, setMode, explainElement, clearExplanation, getScreenElements } = useTrainer();
  
  const isExplainMode = mode === "explain";
  const screenElements = getScreenElements();
  
  const labels = {
    title: language === "ar" ? "اشرح هذا" : "Explain This",
    subtitle: language === "ar" 
      ? "اضغط على أي عنصر لفهمه" 
      : "Click any element to understand it",
    activateMode: language === "ar" ? "تفعيل وضع الشرح" : "Activate Explain Mode",
    deactivateMode: language === "ar" ? "إيقاف وضع الشرح" : "Deactivate Explain Mode",
    modeActive: language === "ar" 
      ? "وضع الشرح مفعّل - اضغط على أي عنصر" 
      : "Explain mode active - click any element",
    whatIs: language === "ar" ? "ما هذا؟" : "What is this?",
    whenToUse: language === "ar" ? "متى تستخدمه؟" : "When to use it?",
    example: language === "ar" ? "مثال" : "Example",
    commonMistake: language === "ar" ? "خطأ شائع" : "Common Mistake",
    close: language === "ar" ? "إغلاق" : "Close",
    availableElements: language === "ar" ? "العناصر المتاحة للشرح:" : "Elements available for explanation:",
    noElements: language === "ar" 
      ? "لا توجد عناصر قابلة للشرح في هذه الشاشة" 
      : "No explainable elements on this screen"
  };
  
  const toggleExplainMode = () => {
    if (isExplainMode) {
      setMode("off");
      clearExplanation();
    } else {
      setMode("explain");
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <div className="flex items-center gap-2 mb-1">
          <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-blue-700 dark:text-blue-300">{labels.title}</h3>
        </div>
        <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{labels.subtitle}</p>
      </div>
      
      {/* Mode Toggle */}
      <div className="p-4 border-b">
        <Button
          onClick={toggleExplainMode}
          variant={isExplainMode ? "default" : "outline"}
          className={cn(
            "w-full justify-start gap-2",
            isExplainMode && "bg-blue-600 hover:bg-blue-700"
          )}
        >
          <MousePointerClick className="h-4 w-4" />
          {isExplainMode ? labels.deactivateMode : labels.activateMode}
        </Button>
        
        {isExplainMode && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 text-center animate-pulse">
            {labels.modeActive}
          </p>
        )}
      </div>
      
      <ScrollArea className="flex-1">
        {/* Explanation Card */}
        {explainElement ? (
          <div className="p-4">
            <ExplanationCard 
              element={explainElement} 
              language={language} 
              labels={labels}
              onClose={clearExplanation}
            />
          </div>
        ) : (
          /* Available Elements List */
          <div className="p-4">
            <p className="text-xs text-muted-foreground mb-3">{labels.availableElements}</p>
            
            {screenElements.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <HelpCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                {labels.noElements}
              </div>
            ) : (
              <div className="space-y-2">
                {screenElements.map(element => (
                  <ElementPreview 
                    key={element.id} 
                    element={element} 
                    language={language}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface ExplanationCardProps {
  element: UIElement;
  language: "ar" | "en";
  labels: Record<string, string>;
  onClose: () => void;
}

function ExplanationCard({ element, language, labels, onClose }: ExplanationCardProps) {
  return (
    <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 overflow-hidden">
      {/* Header */}
      <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">
              {element.label[language]}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-blue-600 hover:text-blue-800"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4 space-y-4">
        {/* What is this */}
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
            <HelpCircle className="h-3 w-3" />
            {labels.whatIs}
          </p>
          <p className="text-sm">{element.explanation.whatIs[language]}</p>
        </div>
        
        {/* When to use */}
        <div>
          <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
            <MousePointerClick className="h-3 w-3" />
            {labels.whenToUse}
          </p>
          <p className="text-sm">{element.explanation.whenToUse[language]}</p>
        </div>
        
        {/* Example */}
        <div className="bg-white dark:bg-slate-900 rounded-lg p-3">
          <p className="text-xs font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            {labels.example}
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            {element.explanation.example[language]}
          </p>
        </div>
        
        {/* Common Mistake */}
        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {labels.commonMistake}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {element.explanation.commonMistake[language]}
          </p>
        </div>
      </div>
    </div>
  );
}

interface ElementPreviewProps {
  element: UIElement;
  language: "ar" | "en";
}

function ElementPreview({ element, language }: ElementPreviewProps) {
  const { explainElementById } = useTrainer();
  
  return (
    <div
      className="p-3 rounded-lg border bg-card hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer transition-colors"
      onClick={() => explainElementById(element.id)}
    >
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-medium">{element.label[language]}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
        {element.explanation.whatIs[language]}
      </p>
    </div>
  );
}
