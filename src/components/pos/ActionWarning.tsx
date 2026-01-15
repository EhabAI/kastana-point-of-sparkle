import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface ActionWarningProps {
  className?: string;
}

export function ActionWarning({ className }: ActionWarningProps) {
  const { t } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50",
        className
      )}
    >
      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
      <span>{t("action_affects_reports_inventory")}</span>
    </div>
  );
}
