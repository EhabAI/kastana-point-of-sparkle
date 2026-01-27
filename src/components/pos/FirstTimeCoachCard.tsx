/**
 * First-Time Action Coach Card
 * Displays step-by-step guidance for first-time sensitive actions
 * Appears once, then never again for that action
 */

import { GraduationCap, X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { type SensitiveActionKey, markActionCompleted } from "@/lib/assistantInFlowIntelligence";
import { useInFlowIntelligence } from "@/hooks/useInFlowIntelligence";

interface FirstTimeCoachCardProps {
  actionKey: SensitiveActionKey;
  onDismiss?: () => void;
  className?: string;
}

export function FirstTimeCoachCard({
  actionKey,
  onDismiss,
  className,
}: FirstTimeCoachCardProps) {
  const { language } = useLanguage();
  const { showCoaching, completeAction } = useInFlowIntelligence();
  
  const coaching = showCoaching(actionKey);
  
  // If no coaching needed (not first time), don't render
  if (!coaching) {
    return null;
  }
  
  const handleDismiss = () => {
    completeAction(actionKey);
    onDismiss?.();
  };
  
  return (
    <Card
      className={cn(
        "border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20",
        className
      )}
    >
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {coaching.title}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            onClick={handleDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3">
        <ol className="space-y-1.5">
          {coaching.steps.map((step, index) => (
            <li
              key={index}
              className="flex items-start gap-2 text-xs text-blue-600 dark:text-blue-300"
            >
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40 text-[10px] font-medium">
                {index + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 pt-2 border-t border-blue-200/50 dark:border-blue-800/30">
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-7 text-xs text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            onClick={handleDismiss}
          >
            <CheckCircle2 className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
            {language === "ar" ? "فهمت، لا تعرض مرة أخرى" : "Got it, don't show again"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
