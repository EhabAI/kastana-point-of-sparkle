import { AlertTriangle, Building2, Store } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { BranchSelector } from "@/components/owner/BranchSelector";

interface OwnerContextGuardProps {
  contextMissing: "restaurant" | "branch" | "both" | null;
  showBranchSelector?: boolean;
}

/**
 * Component that displays a warning when restaurant or branch context is missing.
 * 
 * This should be rendered when `isContextReady` from `useOwnerContext()` is false,
 * blocking all Owner operations until proper context is selected.
 */
export function OwnerContextGuard({ 
  contextMissing, 
  showBranchSelector = true 
}: OwnerContextGuardProps) {
  const { t, language } = useLanguage();

  if (!contextMissing) return null;

  const getMessage = () => {
    if (language === "ar") {
      return "يجب اختيار المطعم والفرع قبل المتابعة";
    }
    return "Please select a restaurant and branch before continuing";
  };

  const getTitle = () => {
    if (language === "ar") {
      return "اختيار السياق مطلوب";
    }
    return "Context Selection Required";
  };

  const getIcon = () => {
    switch (contextMissing) {
      case "restaurant":
        return <Store className="h-5 w-5" />;
      case "branch":
        return <Building2 className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <div className="space-y-4">
      <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <div className="flex items-start gap-3">
          <div className="text-amber-600 dark:text-amber-500 mt-0.5">
            {getIcon()}
          </div>
          <div className="flex-1">
            <AlertTitle className="text-amber-800 dark:text-amber-400 mb-1">
              {getTitle()}
            </AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              {getMessage()}
            </AlertDescription>
          </div>
        </div>
      </Alert>
      
      {showBranchSelector && contextMissing !== "restaurant" && (
        <div className="flex items-center gap-4">
          <BranchSelector />
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline warning for use within cards/dialogs.
 */
export function OwnerContextInlineWarning() {
  const { language } = useLanguage();

  const getMessage = () => {
    if (language === "ar") {
      return "يجب اختيار الفرع أولاً";
    }
    return "Please select a branch first";
  };

  return (
    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-sm p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>{getMessage()}</span>
    </div>
  );
}

/**
 * Context indicator showing which restaurant and branch is currently selected.
 * Used in CSV upload and other bulk operations to confirm the target.
 */
interface ContextIndicatorProps {
  restaurantName: string | null;
  branchName: string | null;
}

export function OwnerContextIndicator({ restaurantName, branchName }: ContextIndicatorProps) {
  const { language } = useLanguage();

  if (!restaurantName || !branchName) return null;

  const getLabel = () => {
    if (language === "ar") {
      return "سيتم تطبيق هذا الإجراء على:";
    }
    return "This action will apply to:";
  };

  return (
    <div className="flex items-center gap-2 text-sm p-3 rounded-lg bg-muted/50 border border-border">
      <Building2 className="h-4 w-4 text-primary shrink-0" />
      <span className="text-muted-foreground">{getLabel()}</span>
      <span className="font-medium text-foreground">
        {restaurantName} / {branchName}
      </span>
    </div>
  );
}
