// Owner Training Panel - Inline training guidance for owners
// Non-blocking, lightweight step-by-step guidance
// Shows inside the Smart Trainer panel

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, Settings, SkipForward, CheckCircle2, Sparkles, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  type OwnerTrainingStep,
  type OwnerTrainingAction,
  getCurrentOwnerStep,
  startOwnerTraining,
  resumeOwnerTraining,
  nextOwnerStep,
  pauseOwnerTraining,
  completeOwnerTraining,
  goToSettingsStep,
  getOwnerProgressPercent,
  isOwnerTrainingActive,
  isOwnerTrainingPaused,
  isOwnerTrainingCompleted,
  ownerNeedsTraining,
} from "@/lib/ownerTrainingFlow";

interface OwnerTrainingPanelProps {
  language: "ar" | "en";
  onNavigateToSettings?: () => void;
  onTrainingStateChange?: (active: boolean) => void;
}

export function OwnerTrainingPanel({ 
  language, 
  onNavigateToSettings,
  onTrainingStateChange 
}: OwnerTrainingPanelProps) {
  const [currentStep, setCurrentStep] = useState<OwnerTrainingStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Load initial state
  useEffect(() => {
    const active = isOwnerTrainingActive();
    const paused = isOwnerTrainingPaused();
    const completed = isOwnerTrainingCompleted();
    
    setIsActive(active);
    setIsPaused(paused);
    setIsCompleted(completed);
    setProgress(getOwnerProgressPercent());
    
    if (active) {
      setCurrentStep(getCurrentOwnerStep());
    }
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onTrainingStateChange?.(isActive);
  }, [isActive, onTrainingStateChange]);

  // Handle starting training
  const handleStart = useCallback(() => {
    const step = startOwnerTraining();
    setCurrentStep(step);
    setProgress(step.progressEnd);
    setIsActive(true);
    setIsPaused(false);
  }, []);

  // Handle resuming training
  const handleResume = useCallback(() => {
    const step = resumeOwnerTraining();
    if (step) {
      setCurrentStep(step);
      setProgress(getOwnerProgressPercent());
      setIsActive(true);
      setIsPaused(false);
    }
  }, []);

  // Handle action button clicks
  const handleAction = useCallback((action: OwnerTrainingAction) => {
    switch (action.type) {
      case "next": {
        const nextStep = nextOwnerStep();
        if (nextStep) {
          setCurrentStep(nextStep);
          setProgress(nextStep.progressEnd);
        } else {
          // Training completed
          setIsActive(false);
          setIsCompleted(true);
        }
        break;
      }
      
      case "navigate": {
        // Navigate to settings and update step
        const settingsStep = goToSettingsStep();
        setCurrentStep(settingsStep);
        setProgress(settingsStep.progressEnd);
        onNavigateToSettings?.();
        break;
      }
      
      case "skip": {
        pauseOwnerTraining();
        setCurrentStep(null);
        setIsActive(false);
        setIsPaused(true);
        break;
      }
      
      case "finish": {
        completeOwnerTraining();
        setCurrentStep(null);
        setIsActive(false);
        setIsCompleted(true);
        setProgress(20);
        break;
      }
    }
  }, [onNavigateToSettings]);

  const labels = {
    title: language === "ar" ? "🎓 تدريب المالك" : "🎓 Owner Training",
    startTraining: language === "ar" ? "ابدأ" : "Start",
    resumeTraining: language === "ar" ? "استأنف التدريب" : "Resume Training",
    trainingPaused: language === "ar" ? "التدريب متوقف مؤقتاً" : "Training Paused",
    trainingComplete: language === "ar" ? "تم إكمال التدريب ✓" : "Training Complete ✓",
    progress: language === "ar" ? "التقدم" : "Progress",
    needsTraining: language === "ar" 
      ? "ابدأ جولة سريعة للتعرف على لوحة التحكم" 
      : "Start a quick tour to learn the dashboard"
  };

  // Get action button variant and icon
  const getActionButton = (action: OwnerTrainingAction) => {
    switch (action.type) {
      case "navigate":
        return {
          variant: "default" as const,
          icon: <Settings className="h-3.5 w-3.5" />
        };
      case "skip":
        return {
          variant: "ghost" as const,
          icon: <SkipForward className="h-3.5 w-3.5" />
        };
      case "finish":
        return {
          variant: "default" as const,
          icon: <CheckCircle2 className="h-3.5 w-3.5" />
        };
      case "next":
      default:
        return {
          variant: "default" as const,
          icon: <ChevronRight className="h-3.5 w-3.5" />
        };
    }
  };

  // Show completed state
  if (isCompleted) {
    return (
      <div className="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/50">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-300 text-sm">
            {labels.trainingComplete}
          </span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>
    );
  }

  // Show paused state with resume option
  if (isPaused && !isActive) {
    return (
      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-700 dark:text-amber-300 text-sm">
            {labels.trainingPaused}
          </span>
        </div>
        <div className="mb-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{labels.progress}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleResume}
        >
          <Play className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
          {labels.resumeTraining}
        </Button>
      </div>
    );
  }

  // Show start option if training not started
  if (!isActive && ownerNeedsTraining() && !isPaused) {
    return (
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <span className="font-medium text-primary text-sm">{labels.title}</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{labels.needsTraining}</p>
        <Button
          variant="default"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={handleStart}
        >
          <Play className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
          {labels.startTraining}
        </Button>
      </div>
    );
  }

  // Show active training step
  if (!currentStep) return null;

  return (
    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
      {/* Header with progress */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-700 dark:text-blue-300 text-sm">
            {labels.title}
          </span>
        </div>
        <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
          {progress}%
        </span>
      </div>
      
      {/* Progress bar */}
      <Progress value={progress} className="h-1.5 mb-4" />
      
      {/* Message content */}
      <div className="mb-4">
        <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">
          {currentStep.message[language]}
        </p>
      </div>
      
      {/* Action buttons */}
      {currentStep.actions && currentStep.actions.length > 0 && (
        <div className={cn(
          "flex gap-2",
          currentStep.actions.length === 1 ? "justify-end" : "justify-between"
        )}>
          {currentStep.actions.map((action) => {
            const { variant, icon } = getActionButton(action);
            return (
              <Button
                key={action.id}
                variant={variant}
                size="sm"
                className={cn(
                  "h-8 text-xs gap-1.5",
                  currentStep.actions!.length === 1 && "flex-1"
                )}
                onClick={() => handleAction(action)}
              >
                {action.type === "skip" ? (
                  <>
                    {action.label[language]}
                    {icon}
                  </>
                ) : (
                  <>
                    {icon}
                    {action.label[language]}
                  </>
                )}
              </Button>
            );
          })}
        </div>
      )}
    </div>
  );
}
