/**
 * Operational Insights Card
 * Displays non-intrusive operational insights in the Owner Dashboard
 * "Requires Attention" section - calm, neutral, non-accusatory tone
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { useOperationalInsights, INSIGHT_LABELS, InsightType } from "@/hooks/useOperationalInsights";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Eye } from "lucide-react";

interface OperationalInsightsCardProps {
  restaurantId: string;
}

export function OperationalInsightsCard({ restaurantId }: OperationalInsightsCardProps) {
  const { t, language } = useLanguage();
  const { selectedBranch } = useBranchContextSafe();
  const { data: insightsData, isLoading } = useOperationalInsights(restaurantId, selectedBranch?.id);
  
  // Don't show anything during loading or if no data
  if (isLoading || !insightsData) return null;
  
  // Don't show if new restaurant (less than 3 active days)
  if (insightsData.isNewRestaurant) return null;
  
  // Don't show if no insights
  if (insightsData.insights.length === 0) return null;
  
  const headerLabel = insightsData.insights.some(i => i.severity === "repeated")
    ? (language === "ar" ? "⚠️ ملاحظة تشغيلية متكررة" : "⚠️ Repeated operational note")
    : (language === "ar" ? "⚠️ ملاحظة تشغيلية" : "⚠️ Operational note");
  
  return (
    <Card className="border-amber-200/50 dark:border-amber-800/30 bg-amber-50/30 dark:bg-amber-950/10">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100/50 dark:bg-amber-900/20">
            <Eye className="h-4 w-4 text-amber-600/70 dark:text-amber-400/70" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700/80 dark:text-amber-300/80 uppercase tracking-wider font-medium mb-2">
              {headerLabel}
            </p>
            
            <div className="space-y-1.5">
              {insightsData.insights.slice(0, 3).map((insight) => (
                <InsightItem 
                  key={insight.id} 
                  type={insight.type}
                  severity={insight.severity}
                  consecutiveDays={insight.consecutiveDays}
                  language={language}
                />
              ))}
            </div>
            
            <p className="text-[11px] text-amber-600/50 dark:text-amber-400/40 mt-3">
              {language === "ar" 
                ? "هذه ملاحظات للمراجعة فقط، مقارنة بنشاطك الأخير."
                : "These are observations for review, compared to your recent activity."
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InsightItemProps {
  type: InsightType;
  severity: "first" | "repeated";
  consecutiveDays: number;
  language: string;
}

function InsightItem({ type, severity, consecutiveDays, language }: InsightItemProps) {
  const label = INSIGHT_LABELS[type][language as "ar" | "en"];
  
  return (
    <div className="flex items-center gap-2">
      <AlertCircle className="h-3.5 w-3.5 text-amber-500/70 flex-shrink-0" />
      <span className="text-sm text-foreground/80">{label}</span>
      {severity === "repeated" && consecutiveDays >= 3 && (
        <Badge 
          variant="outline" 
          className="text-[10px] px-1.5 py-0 h-4 text-amber-600/70 border-amber-300/50"
        >
          {language === "ar" ? `${consecutiveDays} أيام` : `${consecutiveDays} days`}
        </Badge>
      )}
    </div>
  );
}
