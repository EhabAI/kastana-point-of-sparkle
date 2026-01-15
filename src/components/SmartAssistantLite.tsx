/**
 * Smart Assistant Lite V1
 * Floating contextual assistant with drawer UI
 * Domain-locked to Kastana POS
 */

import { useState, useEffect, useCallback } from "react";
import { Bot, AlertCircle, AlertTriangle, Info, Lightbulb, ChevronRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useSmartAssistant, type SmartAssistantState } from "@/hooks/useSmartAssistant";
import { getSeverityColor, getSeverityIcon, type SmartRule, type RuleSeverity } from "@/lib/smartAssistantRules";

// Badge indicator component for tabs
interface TabBadgeProps {
  show: boolean;
  count?: number;
  variant?: "dot" | "count";
}

function TabBadge({ show, count, variant = "dot" }: TabBadgeProps) {
  if (!show) return null;
  
  if (variant === "count" && count !== undefined && count > 0) {
    return (
      <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium rounded-full bg-muted-foreground/20 text-muted-foreground">
        {count > 9 ? "9+" : count}
      </span>
    );
  }
  
  // Subtle dot badge
  return (
    <span className="ml-1.5 inline-flex h-2 w-2 rounded-full bg-muted-foreground/40" />
  );
}

interface SmartAssistantLiteProps {
  // POS-specific context passed from parent
  activeTab?: string;
  orderItemCount?: number;
  orderStatus?: string | null;
  orderHeldAt?: Date | null;
  paymentMethod?: string | null;
  paymentAmount?: number;
  shiftOpenedAt?: Date | null;
  voidCountThisShift?: number;
  discountApplied?: boolean;
  discountReason?: string | null;
  selectedTableId?: string | null;
  tableHasActiveOrder?: boolean;
  lastAction?: string | null;
  refundAmountThisShift?: number;
  averageRefundAmount?: number;
  trainingMode?: boolean;
}

// Severity icon component
function SeverityIcon({ severity, className }: { severity: RuleSeverity; className?: string }) {
  const iconName = getSeverityIcon(severity);
  const iconClass = cn("h-4 w-4", className);
  
  switch (iconName) {
    case "AlertCircle":
      return <AlertCircle className={iconClass} />;
    case "AlertTriangle":
      return <AlertTriangle className={iconClass} />;
    case "Info":
    default:
      return <Info className={iconClass} />;
  }
}

// Alert card component
function AlertCard({ 
  alert, 
  language 
}: { 
  alert: SmartRule; 
  language: "ar" | "en";
}) {
  const colorClass = getSeverityColor(alert.severity);
  
  return (
    <div className={cn(
      "rounded-lg border p-3 space-y-2",
      colorClass
    )}>
      <div className="flex items-start gap-2">
        <SeverityIcon severity={alert.severity} className="mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm">
            {alert.title[language]}
          </h4>
          <p className="text-sm opacity-90 mt-1">
            {alert.message[language]}
          </p>
        </div>
      </div>
      {alert.suggestion && (
        <div className="flex items-start gap-2 pt-2 border-t border-current/20">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <p className="text-xs opacity-80">
            {alert.suggestion[language]}
          </p>
        </div>
      )}
    </div>
  );
}

// Context hint section
function ContextSection({ 
  hint, 
  language 
}: { 
  hint: SmartAssistantState["contextHint"]; 
  language: "ar" | "en";
}) {
  return (
    <div className="rounded-lg bg-muted/50 border p-3">
      <div className="flex items-center gap-2 mb-2">
        <ChevronRight className="h-4 w-4 text-primary" />
        <h4 className="font-medium text-sm text-foreground">
          {language === "ar" ? "ما تفعله الآن" : "What you're doing now"}
        </h4>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {hint.title[language]}
        </p>
        <p className="text-xs text-muted-foreground">
          {hint.description[language]}
        </p>
      </div>
    </div>
  );
}

export function SmartAssistantLite(props: SmartAssistantLiteProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("alerts");
  const [alertsViewed, setAlertsViewed] = useState(false);
  const [suggestionsViewed, setSuggestionsViewed] = useState(false);
  const [lastAlertCount, setLastAlertCount] = useState(0);
  
  const state = useSmartAssistant({
    activeTab: props.activeTab,
    orderItemCount: props.orderItemCount,
    orderStatus: props.orderStatus,
    orderHeldAt: props.orderHeldAt,
    paymentMethod: props.paymentMethod,
    paymentAmount: props.paymentAmount,
    shiftOpenedAt: props.shiftOpenedAt,
    voidCountThisShift: props.voidCountThisShift,
    discountApplied: props.discountApplied,
    discountReason: props.discountReason,
    selectedTableId: props.selectedTableId,
    tableHasActiveOrder: props.tableHasActiveOrder,
    lastAction: props.lastAction,
    refundAmountThisShift: props.refundAmountThisShift,
    averageRefundAmount: props.averageRefundAmount,
    trainingMode: props.trainingMode,
  });

  const { language, contextHint, alerts, hasAlerts } = state;
  
  // Track when alerts change to show badge
  useEffect(() => {
    if (alerts.length !== lastAlertCount) {
      // New alerts appeared, mark as unviewed
      if (alerts.length > lastAlertCount) {
        setAlertsViewed(false);
      }
      setLastAlertCount(alerts.length);
    }
  }, [alerts.length, lastAlertCount]);

  // Mark alerts as viewed when tab is opened
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    if (value === "alerts") {
      setAlertsViewed(true);
    } else if (value === "suggestions") {
      setSuggestionsViewed(true);
    }
  }, []);

  // Reset viewed state when drawer closes and new content appears
  useEffect(() => {
    if (!open) {
      // Mark alerts as viewed if there are no alerts
      if (!hasAlerts) {
        setAlertsViewed(true);
      }
    }
  }, [open, hasAlerts]);

  // Badge visibility logic
  const showAlertsBadge = hasAlerts && !alertsViewed;
  const showSuggestionsBadge = !suggestionsViewed; // Show dot for unread suggestions

  // Don't render if not visible on current route
  if (!state.isVisible) {
    return null;
  }

  const isRTL = language === "ar";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            "fixed bottom-6 z-50 h-14 w-14 rounded-full shadow-lg",
            "bg-secondary hover:bg-secondary/90 text-secondary-foreground",
            "transition-all duration-200 hover:scale-105",
            isRTL ? "left-6" : "right-6"
          )}
        >
          <div className="relative">
            <Bot className="h-6 w-6" />
            {hasAlerts && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
            )}
          </div>
        </Button>
      </SheetTrigger>
      
      <SheetContent
        side={isRTL ? "left" : "right"}
        className="w-full sm:w-[380px] flex flex-col p-0"
      >
        <SheetHeader className="p-4 border-b bg-secondary text-secondary-foreground">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-secondary-foreground flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {language === "ar" ? "المساعد الذكي" : "Smart Assistant"}
            </SheetTitle>
            {hasAlerts && (
              <Badge variant="destructive" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Context Hint Section - Always visible */}
        <div className="p-4 border-b">
          <ContextSection hint={contextHint} language={language} />
        </div>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 grid w-auto grid-cols-3">
            <TabsTrigger value="alerts" className="flex items-center justify-center">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              {language === "ar" ? "تنبيهات" : "Alerts"}
              <TabBadge show={showAlertsBadge} count={alerts.length} variant="count" />
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="flex items-center justify-center">
              <Lightbulb className="h-3.5 w-3.5 mr-1.5" />
              {language === "ar" ? "اقتراحات" : "Tips"}
              <TabBadge show={showSuggestionsBadge} variant="dot" />
            </TabsTrigger>
            <TabsTrigger value="help" className="flex items-center justify-center">
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              {language === "ar" ? "مساعدة" : "Help"}
              {/* No badge for Help tab */}
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* Alerts Tab */}
            <TabsContent value="alerts" className="p-4 space-y-3 mt-0">
              {hasAlerts ? (
                <div className="space-y-2">
                  {alerts.map((alert, index) => (
                    <AlertCard 
                      key={`${alert.id}-${index}`} 
                      alert={alert} 
                      language={language} 
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-4 text-center">
                  <div className="mx-auto w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-2">
                    <Info className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {language === "ar" 
                      ? "لا توجد تنبيهات حالياً. كل شيء يعمل بشكل طبيعي."
                      : "No alerts at the moment. Everything is running smoothly."
                    }
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="p-4 space-y-3 mt-0">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/50 p-3">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {language === "ar" 
                    ? "استخدم اختصارات لوحة المفاتيح: Enter للدفع، H للتعليق، Esc للإلغاء."
                    : "Use keyboard shortcuts: Enter to pay, H to hold, Esc to cancel."
                  }
                </p>
              </div>
              <div className="rounded-lg bg-muted/50 border p-3">
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "تحقق من الطلبات المعلقة بانتظام لتجنب تأخير الخدمة."
                    : "Check held orders regularly to avoid service delays."
                  }
                </p>
              </div>
            </TabsContent>

            {/* Help Tab */}
            <TabsContent value="help" className="p-4 space-y-3 mt-0">
              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-medium mb-2">
                  {language === "ar" ? "عن المساعد الذكي" : "About Smart Assistant"}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" 
                    ? "المساعد الذكي يراقب عملياتك ويقدم تنبيهات واقتراحات في الوقت المناسب لمساعدتك على العمل بكفاءة أكبر."
                    : "Smart Assistant monitors your operations and provides timely alerts and suggestions to help you work more efficiently."
                  }
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <h4 className="text-sm font-medium mb-2">
                  {language === "ar" ? "أنواع التنبيهات" : "Alert Types"}
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-muted-foreground">
                      {language === "ar" ? "خطأ - يتطلب اهتمام فوري" : "Error - Requires immediate attention"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-muted-foreground">
                      {language === "ar" ? "تحذير - ينبغي مراجعته" : "Warning - Should be reviewed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-muted-foreground">
                      {language === "ar" ? "معلومات - للعلم فقط" : "Info - For your awareness"}
                    </span>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
        
        {/* Footer */}
        <div className="p-3 border-t bg-muted/30">
          <p className="text-xs text-center text-muted-foreground">
            {language === "ar" 
              ? "المساعد الذكي - Kastana POS"
              : "Smart Assistant - Kastana POS"
            }
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
