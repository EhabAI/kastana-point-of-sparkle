// Kitchen Training Panel - Progressive training for Kitchen (KDS) role
// Screen-aware, State-aware, Explain-only
// Now includes real-time operational status based on current order state

import { useEffect, useState, useCallback } from "react";
import { 
  ChevronRight, ChevronLeft, CheckCircle2, Sparkles, 
  Play, Pause, RotateCcw, GraduationCap, ChefHat, Info,
  Clock, ChefHat as CookingIcon, Bell
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
  type KitchenTrainingStep,
  getKitchenCurrentStep,
  startKitchenTraining,
  resumeKitchenTraining,
  pauseKitchenTraining,
  nextKitchenStep,
  previousKitchenStep,
  resetKitchenTraining,
  getKitchenTrainingPercentage,
  isKitchenTrainingActive,
  isKitchenTrainingCompleted,
  isKitchenTrainingPaused,
  kitchenNeedsTraining,
  canGoToPreviousKitchenStep,
} from "@/lib/kitchenTrainingFlow";

interface KitchenTrainingPanelProps {
  language: "ar" | "en";
  onTrainingStateChange?: (active: boolean) => void;
  /** Current kitchen order counts for operational status */
  orderCounts?: {
    newOrders: number;
    inProgressOrders: number;
    readyOrders: number;
  };
}

/**
 * Operational Status Card - Shows real-time guidance based on order state
 * This is separate from training - it's always-on operational guidance
 */
function OperationalStatusCard({ 
  language, 
  orderCounts 
}: { 
  language: "ar" | "en"; 
  orderCounts: { newOrders: number; inProgressOrders: number; readyOrders: number } 
}) {
  const { newOrders, inProgressOrders, readyOrders } = orderCounts;
  const totalOrders = newOrders + inProgressOrders + readyOrders;
  
  // Determine the primary state to show guidance for
  const getOperationalState = () => {
    if (totalOrders === 0) return "no_orders";
    if (newOrders > 0) return "new_orders";
    if (inProgressOrders > 0) return "in_progress";
    if (readyOrders > 0) return "ready";
    return "no_orders";
  };
  
  const state = getOperationalState();
  
  const stateMessages = {
    no_orders: {
      icon: <Clock className="h-4 w-4" />,
      color: "text-muted-foreground",
      bgColor: "bg-muted/30",
      borderColor: "border-muted",
      title: {
        ar: "لا توجد طلبات حالياً",
        en: "No orders right now"
      },
      description: {
        ar: "ستظهر الطلبات الجديدة هنا فور إرسالها من الكاشير",
        en: "New orders will appear here when sent from the cashier"
      }
    },
    new_orders: {
      icon: <Bell className="h-4 w-4" />,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50/50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800/50",
      title: {
        ar: `🔔 ${newOrders} طلب جديد بانتظار التحضير`,
        en: `🔔 ${newOrders} new order${newOrders > 1 ? 's' : ''} waiting`
      },
      description: {
        ar: "انقر على الطلب لبدء التحضير وتغيير حالته إلى 'قيد التحضير'",
        en: "Click an order to start preparing and change its status to 'In Progress'"
      }
    },
    in_progress: {
      icon: <CookingIcon className="h-4 w-4" />,
      color: "text-orange-600 dark:text-orange-400",
      bgColor: "bg-orange-50/50 dark:bg-orange-950/20",
      borderColor: "border-orange-200 dark:border-orange-800/50",
      title: {
        ar: `👨‍🍳 ${inProgressOrders} طلب قيد التحضير`,
        en: `👨‍🍳 ${inProgressOrders} order${inProgressOrders > 1 ? 's' : ''} being prepared`
      },
      description: {
        ar: "عند الانتهاء من التحضير، غيّر حالة الطلب إلى 'جاهز'",
        en: "When done preparing, change the order status to 'Ready'"
      }
    },
    ready: {
      icon: <CheckCircle2 className="h-4 w-4" />,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50/50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800/50",
      title: {
        ar: `✅ ${readyOrders} طلب جاهز للتسليم`,
        en: `✅ ${readyOrders} order${readyOrders > 1 ? 's' : ''} ready for pickup`
      },
      description: {
        ar: "تم إشعار الكاشير تلقائياً. سيختفي الطلب بعد التسليم",
        en: "Cashier has been notified. Order will disappear after pickup"
      }
    }
  };
  
  const currentState = stateMessages[state];
  
  return (
    <div className={cn(
      "p-3 rounded-lg border mb-3",
      currentState.bgColor,
      currentState.borderColor
    )}>
      <div className="flex items-start gap-2">
        <div className={cn("mt-0.5", currentState.color)}>
          {currentState.icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", currentState.color)}>
            {currentState.title[language]}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentState.description[language]}
          </p>
        </div>
      </div>
      
      {/* Show order breakdown if there are multiple states */}
      {totalOrders > 0 && (newOrders + inProgressOrders + readyOrders) > 1 && (
        <div className="flex gap-3 mt-2 pt-2 border-t border-current/10">
          {newOrders > 0 && (
            <span className="text-xs text-blue-600 dark:text-blue-400">
              {language === "ar" ? `جديد: ${newOrders}` : `New: ${newOrders}`}
            </span>
          )}
          {inProgressOrders > 0 && (
            <span className="text-xs text-orange-600 dark:text-orange-400">
              {language === "ar" ? `قيد التحضير: ${inProgressOrders}` : `In Progress: ${inProgressOrders}`}
            </span>
          )}
          {readyOrders > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400">
              {language === "ar" ? `جاهز: ${readyOrders}` : `Ready: ${readyOrders}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function KitchenTrainingPanel({ 
  language,
  onTrainingStateChange,
  orderCounts
}: KitchenTrainingPanelProps) {
  const [currentStep, setCurrentStep] = useState<KitchenTrainingStep | null>(null);
  const [progress, setProgress] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Load initial state
  useEffect(() => {
    refreshState();
  }, []);

  const refreshState = useCallback(() => {
    const active = isKitchenTrainingActive();
    const paused = isKitchenTrainingPaused();
    const completed = isKitchenTrainingCompleted();
    
    setIsActive(active);
    setIsPaused(paused);
    setIsCompleted(completed);
    setProgress(getKitchenTrainingPercentage());
    setCanGoBack(canGoToPreviousKitchenStep());
    
    if (active) {
      const step = getKitchenCurrentStep();
      setCurrentStep(step);
    } else {
      setCurrentStep(null);
    }
  }, []);

  // Notify parent of state changes
  useEffect(() => {
    onTrainingStateChange?.(isActive);
  }, [isActive, onTrainingStateChange]);

  // Handle starting training
  const handleStart = useCallback(() => {
    const step = startKitchenTraining();
    if (step) {
      refreshState();
    }
  }, [refreshState]);

  // Handle resuming training
  const handleResume = useCallback(() => {
    const step = resumeKitchenTraining();
    if (step) {
      refreshState();
    }
  }, [refreshState]);

  // Handle pausing training
  const handlePause = useCallback(() => {
    pauseKitchenTraining();
    refreshState();
  }, [refreshState]);

  // Handle next step
  const handleNext = useCallback(() => {
    nextKitchenStep();
    refreshState();
  }, [refreshState]);

  // Handle going back
  const handleGoBack = useCallback(() => {
    previousKitchenStep();
    refreshState();
  }, [refreshState]);

  // Handle reset training
  const handleReset = useCallback(() => {
    resetKitchenTraining();
    refreshState();
  }, [refreshState]);

  const labels = {
    title: language === "ar" ? "👨‍🍳 تدريب المطبخ" : "👨‍🍳 Kitchen Training",
    operationalStatus: language === "ar" ? "حالة المطبخ الآن" : "Current Kitchen Status",
    startTraining: language === "ar" ? "ابدأ التدريب" : "Start Training",
    resumeTraining: language === "ar" ? "إكمال التدريب" : "Continue Training",
    pauseTraining: language === "ar" ? "إيقاف مؤقت" : "Pause",
    trainingPaused: language === "ar" ? "التدريب متوقف مؤقتاً" : "Training Paused",
    trainingComplete: language === "ar" ? "تم إكمال التدريب ✓" : "Training Complete ✓",
    progress: language === "ar" ? "التقدم" : "Progress",
    needsTraining: language === "ar" 
      ? "تعرّف على كيفية استخدام شاشة المطبخ" 
      : "Learn how to use the kitchen display",
    next: language === "ar" ? "التالي" : "Next",
    goBack: language === "ar" ? "رجوع" : "Back",
    resetTraining: language === "ar" ? "ابدأ التدريب من البداية" : "Restart Training",
    resetConfirmTitle: language === "ar" ? "إعادة التدريب" : "Restart Training",
    resetConfirmDesc: language === "ar" 
      ? "سيتم إعادة تعيين تقدم التدريب. هل تريد المتابعة؟" 
      : "This will reset your training progress. Do you want to continue?",
    resetConfirmYes: language === "ar" ? "نعم، ابدأ من البداية" : "Yes, restart",
    resetConfirmNo: language === "ar" ? "إلغاء" : "Cancel",
  };

  // Always show operational status if we have order counts (even when training is complete/inactive)
  const showOperationalStatus = orderCounts !== undefined;
  
  // Show completed state with reset option
  if (isCompleted) {
    return (
      <div className="space-y-3">
        {/* Operational Status - Always shown when available */}
        {showOperationalStatus && (
          <OperationalStatusCard language={language} orderCounts={orderCounts} />
        )}
        
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
      </div>
    );
  }

  // Show paused state
  if (isPaused && !isActive) {
    return (
      <div className="space-y-3">
        {/* Operational Status - Always shown when available */}
        {showOperationalStatus && (
          <OperationalStatusCard language={language} orderCounts={orderCounts} />
        )}
        
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
      </div>
    );
  }

  // Show start option if training not started
  if (!isActive && kitchenNeedsTraining() && !isPaused) {
    return (
      <div className="space-y-3">
        {/* Operational Status - Always shown when available */}
        {showOperationalStatus && (
          <OperationalStatusCard language={language} orderCounts={orderCounts} />
        )}
        
        <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
          <div className="flex items-center gap-2 mb-2">
            <ChefHat className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">{labels.title}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{labels.needsTraining}</p>
          <Button
            variant="default"
            size="sm"
            className="w-full h-8 text-xs bg-orange-600 hover:bg-orange-700"
            onClick={handleStart}
          >
            <Play className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
            {labels.startTraining}
          </Button>
        </div>
      </div>
    );
  }

  // Show active training step
  if (!currentStep) {
    // No active step but show operational status if available
    if (showOperationalStatus) {
      return <OperationalStatusCard language={language} orderCounts={orderCounts} />;
    }
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Operational Status - Always shown when available */}
      {showOperationalStatus && (
        <OperationalStatusCard language={language} orderCounts={orderCounts} />
      )}
      
      <div className="p-4 bg-orange-50/50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800/50">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ChefHat className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">{labels.title}</span>
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
            className={cn("h-8 text-xs bg-orange-600 hover:bg-orange-700", canGoBack ? "flex-1" : "w-full")}
            onClick={handleNext}
          >
            {labels.next}
            <ChevronRight className="h-3.5 w-3.5 ltr:ml-1 rtl:mr-1 rtl:rotate-180" />
          </Button>
        </div>

        {/* Reset option at bottom */}
        <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-800/50">
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
    </div>
  );
}
