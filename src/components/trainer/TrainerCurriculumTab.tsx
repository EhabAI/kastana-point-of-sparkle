// Trainer Curriculum Tab - Full training modules list
// Shows all available training organized by category

import { GraduationCap, CheckCircle2, Clock, Play, ChevronRight } from "lucide-react";
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

interface TrainerCurriculumTabProps {
  language: "ar" | "en";
  onStartTraining: (moduleId: string) => void;
}

export function TrainerCurriculumTab({ language, onStartTraining }: TrainerCurriculumTabProps) {
  const { role } = useAuth();
  
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
