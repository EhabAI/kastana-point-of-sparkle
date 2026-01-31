// Trainer Coach Tab - Rule-based contextual suggestions
// Shows smart suggestions based on current screen and user actions
// For Owner: Shows dedicated Owner Training Panel with multi-track support

import { Brain, Lightbulb, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTrainer } from "@/contexts/TrainerContext";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { getModulesForContext } from "@/lib/trainerRegistry";
import { OwnerTrainingPanel } from "./OwnerTrainingPanel";
import { 
  ownerNeedsTraining, 
  isOwnerTrainingActive, 
  isOwnerTrainingPaused, 
  isOwnerTrainingCompleted 
} from "@/lib/ownerTrainingFlow";

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
  
  // Check if we're on owner screen and should show owner training
  const isOwnerScreen = getScreenId() === "owner";
  const showOwnerTraining = role === "owner" && isOwnerScreen && (
    ownerNeedsTraining() || isOwnerTrainingActive() || isOwnerTrainingPaused() || isOwnerTrainingCompleted()
  );
  
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
    startTraining: language === "ar" ? "ابدأ" : "Start"
  };
  
  const getIcon = (type: "tip" | "learn" | "action") => {
    switch (type) {
      case "tip": return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case "learn": return <Sparkles className="h-4 w-4 text-primary" />;
      case "action": return <ChevronRight className="h-4 w-4 text-green-500" />;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-primary">{labels.title}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{labels.subtitle}</p>
        
        {/* Progress bar - hide for owner with dedicated training */}
        {stats.totalCount > 0 && !showOwnerTraining && (
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
          
          {/* Regular suggestions for non-owner roles or after owner training */}
          {(!showOwnerTraining || isOwnerTrainingCompleted()) && suggestions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/30" />
              {labels.noSuggestions}
            </div>
          ) : (!showOwnerTraining || isOwnerTrainingCompleted()) && (
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
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
