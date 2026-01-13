// Smart Alert Component for AI Assistant
// Displays alerts with reason, next check, and report navigation button

import { AlertTriangle, Info, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type SmartAlert,
  getAlertSeverityColor,
  getAlertIconColor,
} from "@/lib/assistantAlerts";

interface AIAssistantAlertProps {
  alert: SmartAlert;
  language: "ar" | "en";
  onOpenReport: (path: string) => void;
}

export function AIAssistantAlert({
  alert,
  language,
  onOpenReport,
}: AIAssistantAlertProps) {
  const severityColor = getAlertSeverityColor(alert.severity);
  const iconColor = getAlertIconColor(alert.severity);

  const SeverityIcon = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[alert.severity];

  const labels = {
    reason: language === "ar" ? "السبب:" : "Reason:",
    check: language === "ar" ? "تحقق من:" : "Check:",
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 space-y-3",
        severityColor
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <SeverityIcon className={cn("h-5 w-5", iconColor)} />
        <span className="font-semibold text-sm">
          {language === "ar" ? "تنبيه ذكي" : "Smart Alert"}
        </span>
      </div>

      {/* Reason */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{labels.reason}</p>
        <p className="text-sm">{alert.reason[language]}</p>
      </div>

      {/* Next Check */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{labels.check}</p>
        <p className="text-sm">{alert.nextCheck[language]}</p>
      </div>

      {/* Report Button */}
      <Button
        variant="outline"
        size="sm"
        className="w-full mt-2"
        onClick={() => onOpenReport(alert.reportPath)}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        {alert.reportLabel[language]}
      </Button>
    </div>
  );
}
