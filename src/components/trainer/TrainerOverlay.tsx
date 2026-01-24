// Trainer Overlay - Visual highlight and tooltip for training steps
// Shows minimal, non-blocking UI during active training

import { useEffect, useState } from "react";
import { ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainer } from "@/contexts/TrainerContext";

interface TrainerOverlayProps {
  language: "ar" | "en";
}

interface TooltipPosition {
  top: number;
  left: number;
  placement: "top" | "bottom" | "left" | "right";
}

export function TrainerOverlay({ language }: TrainerOverlayProps) {
  const { mode, currentStep, activeTraining, goNextStep, endTraining } = useTrainer();
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  
  // Calculate position and highlight target element
  useEffect(() => {
    if (mode !== "training" || !currentStep) {
      setTooltipPosition(null);
      setTargetRect(null);
      return;
    }
    
    const findAndPositionTarget = () => {
      const target = document.querySelector(currentStep.target);
      
      if (!target) {
        // Target not found - use center screen
        setTooltipPosition({
          top: window.innerHeight / 2 - 80,
          left: window.innerWidth / 2 - 150,
          placement: "bottom"
        });
        setTargetRect(null);
        return;
      }
      
      const rect = target.getBoundingClientRect();
      setTargetRect(rect);
      
      // Add highlight class to target
      target.classList.add("trainer-highlight");
      
      // Calculate tooltip position
      const tooltipWidth = 280;
      const tooltipHeight = 120;
      const padding = 12;
      
      let top = rect.bottom + padding;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      let placement: "top" | "bottom" | "left" | "right" = "bottom";
      
      // Check if tooltip goes off screen
      if (top + tooltipHeight > window.innerHeight) {
        top = rect.top - tooltipHeight - padding;
        placement = "top";
      }
      
      if (left < padding) {
        left = padding;
      } else if (left + tooltipWidth > window.innerWidth - padding) {
        left = window.innerWidth - tooltipWidth - padding;
      }
      
      setTooltipPosition({ top, left, placement });
      
      // Scroll element into view if needed
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    
    // Small delay to ensure DOM is ready
    const timer = setTimeout(findAndPositionTarget, 100);
    
    return () => {
      clearTimeout(timer);
      // Remove highlight from all elements
      document.querySelectorAll(".trainer-highlight").forEach(el => {
        el.classList.remove("trainer-highlight");
      });
    };
  }, [mode, currentStep]);
  
  if (mode !== "training" || !currentStep || !activeTraining) {
    return null;
  }
  
  const stepIndex = activeTraining.currentStep;
  const totalSteps = activeTraining.module.steps.length;
  const isLastStep = stepIndex >= totalSteps - 1;
  
  const labels = {
    next: language === "ar" ? "التالي" : "Next",
    finish: language === "ar" ? "إنهاء" : "Finish",
    skip: language === "ar" ? "تخطي" : "Skip",
    stepOf: language === "ar" 
      ? `${stepIndex + 1} من ${totalSteps}` 
      : `${stepIndex + 1} of ${totalSteps}`
  };
  
  return (
    <>
      {/* Soft overlay */}
      <div className="fixed inset-0 bg-black/20 z-[9998] pointer-events-none" />
      
      {/* Highlight cutout */}
      {targetRect && (
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: "0 0 0 4000px rgba(0,0,0,0.3), 0 0 0 4px hsl(var(--primary))",
          }}
        />
      )}
      
      {/* Tooltip */}
      {tooltipPosition && (
        <div
          className={cn(
            "fixed z-[10000] w-[280px] bg-card border-2 border-primary rounded-xl shadow-xl p-4",
            "animate-in fade-in slide-in-from-bottom-2 duration-300"
          )}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={endTraining}
          >
            <X className="h-4 w-4" />
          </Button>
          
          {/* Content */}
          <div className="pr-6">
            <p className="font-semibold text-sm text-primary mb-1">
              {currentStep.title[language]}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentStep.description[language]}
            </p>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <span className="text-xs text-muted-foreground">
              {labels.stepOf}
            </span>
            <Button
              size="sm"
              onClick={goNextStep}
              className="h-7 text-xs gap-1"
            >
              {isLastStep ? labels.finish : labels.next}
              {!isLastStep && <ChevronRight className="h-3 w-3" />}
            </Button>
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1.5 h-1.5 rounded-full transition-colors",
                  i === stepIndex ? "bg-primary" : "bg-muted"
                )}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
