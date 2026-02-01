// Cashier Training Panel - Progressive training for Cashier role
// Screen-aware, State-aware, Explain-only

import { useEffect, useState, useCallback } from "react";
import { 
  ChevronRight, ChevronLeft, CheckCircle2, Sparkles, 
  Play, Pause, RotateCcw, GraduationCap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  type CashierTrainingStep,
  getCashierTrainingProgress,
  getCashierCurrentStep,
  getNextAvailableStep,
  startCashierTraining,
  resumeCashierTraining,
  pauseCashierTraining,
  nextCashierStep,
  previousCashierStep,
  resetCashierTraining,
  getCashierTrainingPercentage,
  isCashierTrainingActive,
  isCashierTrainingCompleted,
  isCashierTrainingPaused,
  cashierNeedsTraining,
  canGoToPreviousCashierStep,
} from "@/lib/cashierTrainingFlow";

interface CashierTrainingPanelProps {
  language: "ar" | "en";
  hasActiveShift: boolean;
  onTrainingStateChange?: (active: boolean) => void;
}

export function CashierTrainingPanel({ 
  language,
  hasActiveShift,
  onTrainingStateChange
}: CashierTrainingPanelProps) {
  const [currentStep, setCurrentStep] = useState<CashierTrainingStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Load initial state
  useEffect(() => {
    refreshState();
  }, [hasActiveShift]);

  const refreshState = useCallback(() => {
    const active = isCashierTrainingActive();
    const paused = isCashierTrainingPaused();
    const completed = isCashierTrainingCompleted();
    
    setIsActive(active);
    setIsPaused(paused);
    setIsCompleted(completed);
    setProgress(getCashierTrainingPercentage());
    setCanGoBack(canGoToPreviousCashierStep());
    
    if (active) {
      const step = getCashierCurrentStep(hasActiveShift);
      setCurrentStep(step);
      
      // If current step is not available due to shift state, auto-advance
      if (!step) {
        const nextStep = getNextAvailableStep(hasActiveShift);
        if (nextStep) {
          setCurrentStep(nextStep);
        }
      }
    } else {
      setCurrentStep(null);
    }
  }, [hasActiveShift]);

  // Notify parent of state changes
  useEffect(() => {
    onTrainingStateChange?.(isActive);
  }, [isActive, onTrainingStateChange]);

  // Handle starting training
  const handleStart = useCallback(() => {
    const step = startCashierTraining(hasActiveShift);
    if (step) {
      refreshState();
    }
  }, [hasActiveShift, refreshState]);

  // Handle resuming training
  const handleResume = useCallback(() => {
    const step = resumeCashierTraining(hasActiveShift);
    if (step) {
      refreshState();
    }
  }, [hasActiveShift, refreshState]);

  // Handle pausing training
  const handlePause = useCallback(() => {
    pauseCashierTraining();
    refreshState();
  }, [refreshState]);

  // Handle next step
  const handleNext = useCallback(() => {
    nextCashierStep(hasActiveShift);
    refreshState();
  }, [hasActiveShift, refreshState]);

  // Handle going back
  const handleGoBack = useCallback(() => {
    previousCashierStep();
    refreshState();
  }, [refreshState]);

  // Handle reset training
  const handleReset = useCallback(() => {
    resetCashierTraining();
    refreshState();
  }, [refreshState]);

  const labels = {
    title: language === "ar" ? "🎓 تدريب الكاشير" : "🎓 Cashier Training",
    startTraining: language === "ar" ? "ابدأ التدريب" : "Start Training",
    resumeTraining: language === "ar" ? "إكمال التدريب" : "Continue Training",
    pauseTraining: language === "ar" ? "إيقاف مؤقت" : "Pause",
    trainingPaused: language === "ar" ? "التدريب متوقف مؤقتاً" : "Training Paused",
    trainingComplete: language === "ar" ? "تم إكمال التدريب ✓" : "Training Complete ✓",
    progress: language === "ar" ? "التقدم" : "Progress",
    needsTraining: language === "ar" 
      ? "تعرّف على كيفية استخدام شاشة الكاشير" 
      : "Learn how to use the cashier screen",
    next: language === "ar" ? "التالي" : "Next",
    goBack: language === "ar" ? "رجوع" : "Back",
    resetTraining: language === "ar" ? "ابدأ التدريب من البداية" : "Restart Training",
    resetConfirmTitle: language === "ar" ? "إعادة التدريب" : "Restart Training",
    resetConfirmDesc: language === "ar" 
      ? "سيتم إعادة تعيين تقدم التدريب. هل تريد المتابعة؟" 
      : "This will reset your training progress. Do you want to continue?",
    resetConfirmYes: language === "ar" ? "نعم، ابدأ من البداية" : "Yes, restart",
    resetConfirmNo: language === "ar" ? "إلغاء" : "Cancel",
    noShiftMessage: language === "ar" 
      ? "افتح وردية للمتابعة في التدريب" 
      : "Open a shift to continue training",
    shiftOpenedMessage: language === "ar" 
      ? "تم فتح الوردية! يمكنك المتابعة" 
      : "Shift opened! You can continue",
  };

  // Show completed state with reset option
  if (isCompleted) {
    return (
      <div className="p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800/50">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="font-medium text-green-700 dark:text-green-300 text-sm">
            {labels.trainingComplete}
          </span>
        </div>
        <Progress value={100} className="h-1.5 mb-3" />
        
        {/* Reset Training Button */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <GraduationCap className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
              {labels.resetTraining}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.resetConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.resetConfirmDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{labels.resetConfirmNo}</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                <RotateCcw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {labels.resetConfirmYes}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // Show paused state
  if (isPaused && !isActive) {
    return (
      <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
        <div className="flex items-center gap-2 mb-3">
          <Pause className="h-5 w-5 text-amber-600 dark:text-amber-400" />
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
  if (!isActive && cashierNeedsTraining() && !isPaused) {
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
  if (!currentStep) {
    // Check if we need shift to continue
    const nextStep = getNextAvailableStep(hasActiveShift);
    if (!nextStep && !hasActiveShift) {
      return (
        <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="font-medium text-amber-700 dark:text-amber-300 text-sm">
              {labels.title}
            </span>
          </div>
          <div className="mb-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>{labels.progress}</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            {labels.noShiftMessage}
          </p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-primary">{labels.title}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          onClick={handlePause}
          title={labels.pauseTraining}
        >
          <Pause className="h-3 w-3" />
        </Button>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{labels.progress}</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-card rounded-md p-3 mb-3 border">
        <p className="text-sm leading-relaxed whitespace-pre-line">
          {currentStep.message[language]}
        </p>
      </div>

      {/* Navigation buttons */}
      <div className="flex gap-2">
        {canGoBack && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleGoBack}
          >
            <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            {labels.goBack}
          </Button>
        )}
        <Button
          variant="default"
          size="sm"
          className={cn("h-8 text-xs", canGoBack ? "flex-1" : "w-full")}
          onClick={handleNext}
        >
          {labels.next}
          <ChevronRight className="h-3.5 w-3.5 ltr:ml-1 rtl:mr-1 rtl:rotate-180" />
        </Button>
      </div>

      {/* Reset option at bottom */}
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/50">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3 ltr:mr-1.5 rtl:ml-1.5" />
              {labels.resetTraining}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{labels.resetConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {labels.resetConfirmDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{labels.resetConfirmNo}</AlertDialogCancel>
              <AlertDialogAction onClick={handleReset}>
                <RotateCcw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {labels.resetConfirmYes}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
