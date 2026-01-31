/**
 * AssistantBranchGuard - Shows a warning when branch is not selected
 * 
 * Used inside the Smart Assistant to block training/explanations
 * until a branch is selected (Owner context only).
 */

import { AlertTriangle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantBranchGuardProps {
  language: "ar" | "en";
  className?: string;
}

export function AssistantBranchGuard({ language, className }: AssistantBranchGuardProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center p-6 text-center space-y-4",
      className
    )}>
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
        <Building2 className="h-8 w-8 text-amber-600 dark:text-amber-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">
          {language === "ar" 
            ? "يجب اختيار الفرع أولاً" 
            : "Please select a branch first"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {language === "ar"
            ? "لتتمكن من استخدام المساعد الذكي والتدريب، يرجى اختيار فرع من القائمة أعلاه."
            : "To use the Smart Assistant and training, please select a branch from the dropdown above."}
        </p>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <span className="text-xs text-amber-700 dark:text-amber-300">
          {language === "ar"
            ? "جميع الإرشادات والبيانات مرتبطة بالفرع المحدد"
            : "All guidance and data is branch-specific"}
        </span>
      </div>
    </div>
  );
}

/**
 * Inline warning for showing in chat area
 */
export function AssistantBranchInlineWarning({ language }: { language: "ar" | "en" }) {
  return (
    <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 p-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {language === "ar" 
              ? "يجب اختيار المطعم والفرع قبل المتابعة" 
              : "Please select a restaurant and branch before continuing"}
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
            {language === "ar"
              ? "المساعد الذكي يقدم إرشادات خاصة بالفرع المحدد فقط"
              : "Smart Assistant provides branch-specific guidance only"}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Branch context indicator for showing current branch in assistant
 */
export function AssistantBranchIndicator({ 
  branchName, 
  restaurantName,
  language 
}: { 
  branchName: string | null;
  restaurantName: string | null;
  language: "ar" | "en";
}) {
  if (!branchName) return null;
  
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/5 border border-primary/20 text-xs">
      <Building2 className="h-3.5 w-3.5 text-primary" />
      <span className="text-muted-foreground">
        {language === "ar" ? "الفرع:" : "Branch:"}
      </span>
      <span className="font-medium text-foreground">
        {restaurantName && `${restaurantName} / `}{branchName}
      </span>
    </div>
  );
}
