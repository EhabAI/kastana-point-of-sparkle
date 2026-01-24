// First Shift Prompt - Non-blocking prompt for first-time users
// Shows once per role when they first visit their screen

import { Sparkles, X, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTrainer } from "@/contexts/TrainerContext";

interface FirstShiftPromptProps {
  language: "ar" | "en";
}

export function FirstShiftPrompt({ language }: FirstShiftPromptProps) {
  const { showFirstShiftPrompt, beginFirstShift, dismissFirstShiftPrompt } = useTrainer();
  
  if (!showFirstShiftPrompt) return null;
  
  const labels = {
    title: language === "ar" ? "🎯 مرحباً! أول يوم لك؟" : "🎯 Welcome! First day?",
    description: language === "ar" 
      ? "دعني أريك الأساسيات في 3 دقائق فقط" 
      : "Let me show you the basics in just 3 minutes",
    start: language === "ar" ? "ابدأ الجولة" : "Start Tour",
    skip: language === "ar" ? "لاحقاً" : "Later"
  };
  
  return (
    <div
      className={cn(
        "fixed bottom-24 z-50 w-[320px] p-4 rounded-xl",
        "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground",
        "shadow-lg border border-primary-foreground/10",
        "animate-in fade-in slide-in-from-bottom-4 duration-500",
        language === "ar" ? "right-6" : "left-6"
      )}
    >
      {/* Close button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
        onClick={dismissFirstShiftPrompt}
      >
        <X className="h-4 w-4" />
      </Button>
      
      {/* Content */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="flex-1 pr-4">
          <p className="font-semibold text-sm mb-1">{labels.title}</p>
          <p className="text-xs text-primary-foreground/80">{labels.description}</p>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="secondary"
          size="sm"
          className="flex-1 h-8 text-xs bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          onClick={beginFirstShift}
        >
          <Play className="h-3 w-3 me-1" />
          {labels.start}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
          onClick={dismissFirstShiftPrompt}
        >
          {labels.skip}
        </Button>
      </div>
    </div>
  );
}
