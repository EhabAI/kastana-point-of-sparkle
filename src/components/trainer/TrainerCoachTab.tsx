// Trainer Coach Tab - Rule-based contextual suggestions
// Shows smart suggestions based on current screen and user actions
// For Owner: Shows dedicated Owner Training Panel with multi-track support
// For Cashier: Shows shift-aware training cards
// For Kitchen: Shows state-aware operational guidance with order counts

import { useState, useCallback, useMemo } from "react";
import { Brain, Lightbulb, ChevronRight, Sparkles, GraduationCap, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTrainer } from "@/contexts/TrainerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { getModulesForContext } from "@/lib/trainerRegistry";
import { OwnerTrainingPanel } from "./OwnerTrainingPanel";
import { CashierTrainingPanel } from "./CashierTrainingPanel";
import { KitchenTrainingPanel } from "./KitchenTrainingPanel";
import { useCurrentShift } from "@/hooks/pos/useShift";
import { useKitchenSession } from "@/hooks/kds/useKitchenSession";
import { useKDSOrders } from "@/hooks/kds/useKDSOrders";
import { 
  ownerNeedsTraining, 
  isOwnerTrainingActive, 
  isOwnerTrainingPaused, 
  isOwnerTrainingCompleted,
  resetOwnerTraining,
  startOwnerTraining
} from "@/lib/ownerTrainingFlow";
import {
  startCashierTraining,
  resetCashierTraining,
  getCashierTrainingPercentage,
  isCashierTrainingCompleted,
} from "@/lib/cashierTrainingFlow";
import {
  resetKitchenTraining,
  getKitchenTrainingPercentage,
} from "@/lib/kitchenTrainingFlow";
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
import { toast } from "@/hooks/use-toast";

interface TrainerCoachTabProps {
  language: "ar" | "en";
  onStartTraining: (moduleId: string) => void;
}

interface CoachSuggestion {
  id: string;
  icon: "tip" | "learn" | "action";
  title: { ar: string; en: string };
  description: { ar: string; en: string };
  moduleId?: string;
}

export function TrainerCoachTab({ language, onStartTraining }: TrainerCoachTabProps) {
  const { role } = useAuth();
  const location = useLocation();
  const { getStats } = useTrainer();
  const [restartKey, setRestartKey] = useState(0);
  const { data: currentShift } = useCurrentShift();
  const hasActiveShift = currentShift?.status === "open";
  
  // Kitchen session and orders (for KDS operational status)
  const { 
    restaurantId: kitchenRestaurantId, 
    branchId: kitchenBranchId,
    isFetched: kitchenSessionFetched,
  } = useKitchenSession();
  
  const isKitchenRole = role === "kitchen";
  const isKDSScreen = location.pathname.includes("/kds");
  
  // Fetch KDS orders only for kitchen users on KDS screen
  const { data: kdsOrders = [] } = useKDSOrders(
    isKitchenRole && isKDSScreen ? kitchenRestaurantId : null,
    isKitchenRole && isKDSScreen ? kitchenBranchId : null
  );
  
  // Calculate order counts for kitchen operational status
  const kitchenOrderCounts = useMemo(() => {
    if (!isKitchenRole || !isKDSScreen) return undefined;
    
    // Filter orders similar to KDSLayout logic
    const newOrders = kdsOrders.filter((o) => 
      o.status === "new" || o.status === "open" || o.status === "paid"
    ).length;
    const inProgressOrders = kdsOrders.filter((o) => o.status === "in_progress").length;
    const readyOrders = kdsOrders.filter((o) => o.status === "ready").length;
    
    return { newOrders, inProgressOrders, readyOrders };
  }, [kdsOrders, isKitchenRole, isKDSScreen]);

  const stats = getStats();
  
  // Get screen-specific suggestions
  const getScreenId = () => {
    const path = location.pathname;
    if (path.includes("/pos")) return "pos";
    if (path.includes("/admin")) return "owner";
    if (path.includes("/kds")) return "kds";
    return "";
  };
  
  const contextModules = role ? getModulesForContext(role, getScreenId()) : [];
  
  // Check screen and role conditions
  const screenId = getScreenId();
  const isOwnerScreen = screenId === "owner";
  const isPOSScreen = screenId === "pos";
  // Note: isKDSScreen is already defined above for order fetching
  
  // Show dedicated training for each role
  const showOwnerTraining = role === "owner" && isOwnerScreen && (
    ownerNeedsTraining() || isOwnerTrainingActive() || isOwnerTrainingPaused() || isOwnerTrainingCompleted()
  );
  const showCashierTraining = role === "cashier" && isPOSScreen;
  const showKitchenTraining = isKitchenRole && isKDSScreen;
  
  // Handle reset for cashier
  const handleCashierReset = useCallback(() => {
    resetCashierTraining();
    setRestartKey(prev => prev + 1);
    toast({
      title: language === "ar" ? "🎓 بدأ تدريب الكاشير من البداية" : "🎓 Cashier training restarted",
    });
  }, [language]);
  
  // Handle reset for kitchen
  const handleKitchenReset = useCallback(() => {
    resetKitchenTraining();
    setRestartKey(prev => prev + 1);
    toast({
      title: language === "ar" ? "🎓 بدأ تدريب المطبخ من البداية" : "🎓 Kitchen training restarted",
    });
  }, [language]);
  
  // Handle navigation from owner training
  const handleNavigateToSettings = () => {
    const event = new CustomEvent("owner-training-navigate", { detail: { tab: "settings" } });
    window.dispatchEvent(event);
    // Close the assistant panel after navigation
    window.dispatchEvent(new CustomEvent("close-assistant-panel"));
  };
  
  const handleNavigateToTab = (tab: string) => {
    const event = new CustomEvent("owner-training-navigate", { detail: { tab } });
    window.dispatchEvent(event);
    // Close the assistant panel after navigation
    window.dispatchEvent(new CustomEvent("close-assistant-panel"));
  };
  
  // Build smart suggestions based on context (for non-owner roles)
  const getSuggestions = (): CoachSuggestion[] => {
    const suggestions: CoachSuggestion[] = [];
    
    // Skip first-shift suggestion for owners (they use dedicated training)
    if (!stats.firstShiftDone && role !== "owner") {
      suggestions.push({
        id: "first_shift",
        icon: "learn",
        title: {
          ar: "🎯 ابدأ تدريبك الأول",
          en: "🎯 Start Your First Training"
        },
        description: {
          ar: "جولة سريعة في 3 دقائق لتعلم الأساسيات",
          en: "Quick 3-minute tour to learn the basics"
        },
        moduleId: role === "cashier" ? "first_shift_cashier" : 
                  role === "kitchen" ? "kitchen_basics" : undefined
      });
    }
    
    // Screen-specific tips
    if (getScreenId() === "pos") {
      suggestions.push({
        id: "pos_tip_1",
        icon: "tip",
        title: {
          ar: "💡 نصيحة سريعة",
          en: "💡 Quick Tip"
        },
        description: {
          ar: "استخدم 'تعليق' بدلاً من 'إلغاء' للطلبات المؤجلة",
          en: "Use 'Hold' instead of 'Cancel' for deferred orders"
        }
      });
    }
    
    // Owner tips only if not showing dedicated training panel
    if (getScreenId() === "owner" && !showOwnerTraining) {
      suggestions.push({
        id: "owner_tip_1",
        icon: "tip",
        title: {
          ar: "💡 نصيحة سريعة",
          en: "💡 Quick Tip"
        },
        description: {
          ar: "راجع نقاط الثقة يومياً للتأكد من صحة الإعدادات",
          en: "Check confidence score daily to verify settings"
        }
      });
    }
    
    // Add relevant training modules
    contextModules.slice(0, 2).forEach(module => {
      if (!suggestions.some(s => s.moduleId === module.id)) {
        suggestions.push({
          id: `module_${module.id}`,
          icon: "learn",
          title: module.title,
          description: module.description,
          moduleId: module.id
        });
      }
    });
    
    return suggestions;
  };
  
  const suggestions = getSuggestions();
  
  // Handle restart training
  const handleRestartTraining = () => {
    // Reset owner training progress
    resetOwnerTraining();
    // Start training from beginning
    startOwnerTraining();
    // Force re-render
    setRestartKey(prev => prev + 1);
    // Show toast
    toast({
      title: language === "ar" ? "🎓 بدأ تدريب كاستنا من البداية" : "🎓 Kastana training started from beginning",
    });
    // Open assistant panel (trigger refresh)
    window.dispatchEvent(new CustomEvent("open-assistant-panel"));
  };
  
  const labels = {
    title: language === "ar" ? "المدرب الذكي" : "Smart Coach",
    subtitle: language === "ar" 
      ? "اقتراحات مخصصة لك الآن" 
      : "Personalized suggestions for you",
    progress: language === "ar" ? "تقدمك" : "Your Progress",
    completed: language === "ar" ? "مكتمل" : "completed",
    noSuggestions: language === "ar" 
      ? "رائع! لا توجد اقتراحات جديدة حالياً" 
      : "Great! No new suggestions right now",
    startTraining: language === "ar" ? "ابدأ" : "Start",
    restartTraining: language === "ar" ? "بدء التدريب من البداية" : "Restart Training",
    restartConfirmTitle: language === "ar" ? "هل تريد بدء التدريب من البداية؟" : "Restart training from beginning?",
    restartConfirmDescription: language === "ar" 
      ? "سيتم إعادة شرح النظام خطوة بخطوة\nلن يتم حذف أي بيانات أو إعدادات" 
      : "The system will be explained step by step\nNo data or settings will be deleted",
    startTrainingBtn: language === "ar" ? "ابدأ التدريب" : "Start Training",
    cancelBtn: language === "ar" ? "إلغاء" : "Cancel",
  };
  
  const getIcon = (type: "tip" | "learn" | "action") => {
    switch (type) {
      case "tip": return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case "learn": return <Sparkles className="h-4 w-4 text-primary" />;
      case "action": return <ChevronRight className="h-4 w-4 text-green-500" />;
    }
  };
  
  return (
    <div className="flex flex-col h-full" key={restartKey}>
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">{labels.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
        
        {/* Restart Training Button - Role-specific */}
        {role === "owner" && isOwnerScreen && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full text-xs gap-2"
              >
                <GraduationCap className="h-4 w-4" />
                {labels.restartTraining}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.restartConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-line">
                  {labels.restartConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.cancelBtn}</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestartTraining}>
                  {labels.startTrainingBtn}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {/* Cashier Reset Button */}
        {showCashierTraining && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full text-xs gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {labels.restartTraining}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.restartConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-line">
                  {labels.restartConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.cancelBtn}</AlertDialogCancel>
                <AlertDialogAction onClick={handleCashierReset}>
                  {labels.startTrainingBtn}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {/* Kitchen Reset Button */}
        {showKitchenTraining && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full text-xs gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {labels.restartTraining}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{labels.restartConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription className="whitespace-pre-line">
                  {labels.restartConfirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{labels.cancelBtn}</AlertDialogCancel>
                <AlertDialogAction onClick={handleKitchenReset}>
                  {labels.startTrainingBtn}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        
        {/* Progress bar - hide for roles with dedicated training */}
        {stats.totalCount > 0 && !showOwnerTraining && !showCashierTraining && !showKitchenTraining && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{labels.progress}</span>
              <span className="font-medium">{stats.percentage}% {labels.completed}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${stats.percentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Cashier progress bar */}
        {showCashierTraining && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{labels.progress}</span>
              <span className="font-medium">{getCashierTrainingPercentage()}% {labels.completed}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${getCashierTrainingPercentage()}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Kitchen progress bar */}
        {showKitchenTraining && (
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">{labels.progress}</span>
              <span className="font-medium">{getKitchenTrainingPercentage()}% {labels.completed}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${getKitchenTrainingPercentage()}%` }}
              />
            </div>
          </div>
        )}
      </div>
      
      {/* Content area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {/* Owner Training Panel - shown prominently for owners */}
          {showOwnerTraining && (
            <OwnerTrainingPanel 
              language={language}
              onNavigateToSettings={handleNavigateToSettings}
              onNavigateToTab={handleNavigateToTab}
            />
          )}
          
          {/* Cashier Training Panel - shown for cashiers on POS screen */}
          {showCashierTraining && (
            <CashierTrainingPanel 
              key={`cashier-coach-${restartKey}`}
              language={language}
              hasActiveShift={hasActiveShift}
            />
          )}
          
          {/* Kitchen Training Panel - shown for kitchen on KDS screen */}
          {showKitchenTraining && (
            <KitchenTrainingPanel 
              key={`kitchen-coach-${restartKey}`}
              language={language}
              orderCounts={kitchenOrderCounts}
            />
          )}
          
          {/* Regular suggestions for roles without dedicated training */}
          {!showOwnerTraining && !showCashierTraining && !showKitchenTraining && (
            suggestions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/30" />
                {labels.noSuggestions}
              </div>
            ) : (
              suggestions.map(suggestion => (
                <div
                  key={suggestion.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    suggestion.moduleId 
                      ? "bg-card hover:border-primary/50 cursor-pointer" 
                      : "bg-muted/30 border-muted"
                  )}
                  onClick={() => suggestion.moduleId && onStartTraining(suggestion.moduleId)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getIcon(suggestion.icon)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{suggestion.title[language]}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {suggestion.description[language]}
                      </p>
                    </div>
                    {suggestion.moduleId && (
                      <Button variant="ghost" size="sm" className="shrink-0 h-7 text-xs">
                        {labels.startTraining}
                        <ChevronRight className="h-3 w-3 ms-1" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
