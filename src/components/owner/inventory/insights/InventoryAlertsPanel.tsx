import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryAlerts, AlertType, AlertSeverity } from "@/hooks/useInventoryAlerts";
import {
  AlertTriangle,
  TrendingUp,
  Zap,
  ChevronDown,
  CheckCircle2,
  Lightbulb,
  PackageSearch,
} from "lucide-react";
import { useState } from "react";

interface InventoryAlertsPanelProps {
  restaurantId: string;
}

const ALERT_ICONS: Record<AlertType, React.ReactNode> = {
  REPEATED_HIGH_VARIANCE: <AlertTriangle className="h-4 w-4" />,
  VARIANCE_SPIKE: <Zap className="h-4 w-4" />,
  WORSENING_TREND: <TrendingUp className="h-4 w-4" />,
};

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; border: string; text: string; badge: string }> = {
  critical: {
    bg: "bg-destructive/5",
    border: "border-destructive/30",
    text: "text-destructive",
    badge: "bg-destructive text-destructive-foreground",
  },
  warning: {
    bg: "bg-warning/5",
    border: "border-warning/30",
    text: "text-warning",
    badge: "bg-warning text-warning-foreground",
  },
};

export function InventoryAlertsPanel({ restaurantId }: InventoryAlertsPanelProps) {
  const { t } = useLanguage();
  const { data: alerts = [], isLoading } = useInventoryAlerts(restaurantId);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  const toggleAlert = (id: string) => {
    setExpandedAlerts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const warningCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <AlertTriangle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{t("inv_smart_alerts")}</h3>
            <p className="text-sm text-muted-foreground">{t("inv_smart_alerts_desc")}</p>
          </div>
        </div>
        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalCount} {t("critical")}
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge className="bg-warning text-warning-foreground text-xs">
                {warningCount} {t("warnings")}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-4 text-green-500 opacity-60" />
            <span className="text-sm font-medium text-green-600">{t("inv_no_alerts")}</span>
            <span className="text-xs mt-1">{t("inv_no_alerts_desc")}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = SEVERITY_STYLES[alert.severity];
            const isExpanded = expandedAlerts.has(alert.id);

            return (
              <Collapsible key={alert.id} open={isExpanded} onOpenChange={() => toggleAlert(alert.id)}>
                <Card className={`${styles.bg} ${styles.border} border transition-all`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-2 cursor-pointer hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${styles.bg} ${styles.text}`}>
                            {ALERT_ICONS[alert.type]}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CardTitle className="text-sm">{alert.title}</CardTitle>
                              <Badge className={`text-[10px] ${styles.badge}`}>
                                {t(alert.severity)}
                              </Badge>
                            </div>
                            <CardDescription className="text-xs mt-1">
                              {alert.branchName} • {alert.itemName}
                            </CardDescription>
                          </div>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      {/* Explanation */}
                      <div className="p-3 rounded-lg bg-background border">
                        <div className="flex items-start gap-2">
                          <PackageSearch className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              {t("inv_why_triggered")}
                            </div>
                            <p className="text-sm leading-relaxed">{alert.explanation}</p>
                          </div>
                        </div>
                      </div>

                      {/* Data Points */}
                      {alert.data && (
                        <div className="flex items-center gap-4 text-xs">
                          {alert.data.currentVariance !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t("current")}:</span>
                              <span className="font-mono font-medium">
                                {alert.data.currentVariance.toFixed(2)} {alert.data.unitName || ""}
                              </span>
                            </div>
                          )}
                          {alert.data.previousVariance !== undefined && alert.data.previousVariance > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t("previous")}:</span>
                              <span className="font-mono">
                                {alert.data.previousVariance.toFixed(2)} {alert.data.unitName || ""}
                              </span>
                            </div>
                          )}
                          {alert.data.percentageChange !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t("change")}:</span>
                              <span className={`font-mono ${alert.data.percentageChange > 0 ? "text-red-600" : "text-green-600"}`}>
                                {alert.data.percentageChange > 0 ? "+" : ""}
                                {alert.data.percentageChange}%
                              </span>
                            </div>
                          )}
                          {alert.data.occurrences !== undefined && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">{t("occurrences")}:</span>
                              <span className="font-mono font-medium">{alert.data.occurrences}x</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Suggestion */}
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium text-primary mb-1">
                              {t("inv_what_to_review")}
                            </div>
                            <p className="text-sm leading-relaxed">{alert.suggestion}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
}
