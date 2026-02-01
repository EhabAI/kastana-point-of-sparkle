// Trainer Curriculum Tab - Full training modules list
// Shows all available training organized by category
// Integrates with CashierTrainingPanel for Cashier role

import { useState, useCallback } from "react";
import { GraduationCap, CheckCircle2, Clock, Play, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getModulesForRole, 
  getFirstShiftModules,
  type TrainingModule 
} from "@/lib/trainerRegistry";
import { isModuleCompleted, getTrainingStats } from "@/lib/trainerEngine";
import { CashierTrainingPanel } from "./CashierTrainingPanel";
import { KitchenTrainingPanel } from "./KitchenTrainingPanel";
import { OwnerTrainingPanel } from "./OwnerTrainingPanel";
import { useCurrentShift } from "@/hooks/pos/useShift";
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
  resetCashierTraining,
  getCashierTrainingPercentage,
} from "@/lib/cashierTrainingFlow";
import {
  resetKitchenTraining,
  getKitchenTrainingPercentage,
  isKitchenTrainingCompleted,
} from "@/lib/kitchenTrainingFlow";

interface TrainerCurriculumTabProps {
  language: "ar" | "en";
  onStartTraining: (moduleId: string) => void;
}

export function TrainerCurriculumTab({ language, onStartTraining }: TrainerCurriculumTabProps) {
  const { role } = useAuth();
  const { data: currentShift } = useCurrentShift();
  const hasActiveShift = currentShift?.status === "open";
  
  // Key to force re-render after reset
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Handle reset for cashier
  const handleCashierReset = useCallback(() => {
    resetCashierTraining();
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // Handle reset for kitchen
  const handleKitchenReset = useCallback(() => {
    resetKitchenTraining();
    setRefreshKey(prev => prev + 1);
  }, []);
  
  // For Cashier role, use the new Smart Trainer Panel
  if (role === "cashier") {
    const cashierProgress = getCashierTrainingPercentage();
    
    const labels = {
      title: language === "ar" ? "منهج التدريب" : "Training Curriculum",
      subtitle: language === "ar" 
        ? "تعلم كل شيء خطوة بخطوة" 
        : "Learn everything step by step",
      resetTraining: language === "ar" ? "ابدأ التدريب من البداية" : "Restart Training",
      resetConfirmTitle: language === "ar" ? "إعادة التدريب" : "Restart Training",
      resetConfirmDesc: language === "ar" 
        ? "سيتم إعادة تعيين تقدم التدريب. هل تريد المتابعة؟" 
        : "This will reset your training progress. Do you want to continue?",
      resetConfirmYes: language === "ar" ? "نعم، ابدأ من البداية" : "Yes, restart",
      resetConfirmNo: language === "ar" ? "إلغاء" : "Cancel",
      progress: language === "ar" 
        ? `${cashierProgress}% مكتمل`
        : `${cashierProgress}% completed`,
    };
    
    return (
      <div className="flex flex-col h-full" key={`cashier-${refreshKey}`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-primary">{labels.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
          <p className="text-xs text-primary mt-1 font-medium">{labels.progress}</p>
        </div>
        
        {/* Cashier Smart Trainer Panel */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Reset Training Button at Top */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
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
                  <AlertDialogAction onClick={handleCashierReset}>
                    <RotateCcw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {labels.resetConfirmYes}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* Cashier Training Panel */}
            <CashierTrainingPanel 
              language={language}
              hasActiveShift={hasActiveShift}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }
  
  // For Kitchen role, use the Kitchen Smart Trainer Panel
  if (role === "kitchen") {
    const kitchenProgress = getKitchenTrainingPercentage();
    
    const labels = {
      title: language === "ar" ? "منهج التدريب" : "Training Curriculum",
      subtitle: language === "ar" 
        ? "تعلم كل شيء خطوة بخطوة" 
        : "Learn everything step by step",
      resetTraining: language === "ar" ? "ابدأ التدريب من البداية" : "Restart Training",
      resetConfirmTitle: language === "ar" ? "إعادة التدريب" : "Restart Training",
      resetConfirmDesc: language === "ar" 
        ? "سيتم إعادة تعيين تقدم التدريب. هل تريد المتابعة؟" 
        : "This will reset your training progress. Do you want to continue?",
      resetConfirmYes: language === "ar" ? "نعم، ابدأ من البداية" : "Yes, restart",
      resetConfirmNo: language === "ar" ? "إلغاء" : "Cancel",
      progress: language === "ar" 
        ? `${kitchenProgress}% مكتمل`
        : `${kitchenProgress}% completed`,
    };
    
    return (
      <div className="flex flex-col h-full" key={`kitchen-${refreshKey}`}>
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-primary">{labels.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
          <p className="text-xs text-primary mt-1 font-medium">{labels.progress}</p>
        </div>
        
        {/* Kitchen Smart Trainer Panel */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Reset Training Button at Top */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 text-xs gap-2"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
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
                  <AlertDialogAction onClick={handleKitchenReset}>
                    <RotateCcw className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {labels.resetConfirmYes}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            
            {/* Kitchen Training Panel */}
            <KitchenTrainingPanel language={language} />
          </div>
        </ScrollArea>
      </div>
    );
  }
  
  // For Owner role, use the Owner Training Panel (existing)
  if (role === "owner") {
    return (
      <div className="flex flex-col h-full">
        <ScrollArea className="flex-1">
          <div className="p-4">
            <OwnerTrainingPanel 
              language={language}
            />
          </div>
        </ScrollArea>
      </div>
    );
  }
  
  // Fallback for other roles - use old module-based system
  const allModules = role ? getModulesForRole(role) : [];
  const firstShiftModules = role ? getFirstShiftModules(role) : [];
  const regularModules = allModules.filter(m => !m.isFirstShift);
  const stats = role ? getTrainingStats(role) : { completedCount: 0, totalCount: 0, percentage: 0, firstShiftDone: false };
  
  const labels = {
    title: language === "ar" ? "منهج التدريب" : "Training Curriculum",
    subtitle: language === "ar" 
      ? "تعلم كل شيء خطوة بخطوة" 
      : "Learn everything step by step",
    firstShift: language === "ar" ? "🚀 البداية السريعة" : "🚀 Quick Start",
    allTraining: language === "ar" ? "📚 جميع الدروس" : "📚 All Lessons",
    minutes: language === "ar" ? "دقائق" : "min",
    steps: language === "ar" ? "خطوات" : "steps",
    completed: language === "ar" ? "مكتمل" : "Completed",
    start: language === "ar" ? "ابدأ" : "Start",
    review: language === "ar" ? "مراجعة" : "Review",
    progress: language === "ar" 
      ? `${stats.completedCount} من ${stats.totalCount} مكتمل`
      : `${stats.completedCount} of ${stats.totalCount} completed`
  };
  
  const renderModule = (module: TrainingModule) => {
    const completed = isModuleCompleted(module.id);
    
    return (
      <div
        key={module.id}
        className={cn(
          "p-3 rounded-lg border transition-all",
          completed 
            ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" 
            : "bg-card border-border hover:border-primary/50"
        )}
      >
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
            completed 
              ? "bg-green-100 dark:bg-green-900" 
              : "bg-primary/10"
          )}>
            {completed ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <Play className="h-4 w-4 text-primary" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={cn(
                "font-medium text-sm",
                completed && "text-green-700 dark:text-green-300"
              )}>
                {module.title[language]}
              </p>
              {completed && (
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-100 dark:bg-green-900 border-green-200 text-green-700">
                  {labels.completed}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {module.description[language]}
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {module.estimatedTime} {labels.minutes}
              </span>
              <span>{module.steps.length} {labels.steps}</span>
            </div>
          </div>
          
          <Button 
            variant={completed ? "outline" : "default"}
            size="sm" 
            className="shrink-0 h-8"
            onClick={() => onStartTraining(module.id)}
          >
            {completed ? labels.review : labels.start}
            <ChevronRight className="h-3 w-3 ms-1" />
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">{labels.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
        <p className="text-xs text-primary mt-1 font-medium">{labels.progress}</p>
      </div>
      
      {/* Modules list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* First Shift Section */}
          {firstShiftModules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {labels.firstShift}
              </h4>
              <div className="space-y-2">
                {firstShiftModules.map(renderModule)}
              </div>
            </div>
          )}
          
          {/* All Training Section */}
          {regularModules.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                {labels.allTraining}
              </h4>
              <div className="space-y-2">
                {regularModules.map(renderModule)}
              </div>
            </div>
          )}
          
          {allModules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              {language === "ar" 
                ? "لا توجد دروس متاحة حالياً" 
                : "No lessons available yet"}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
