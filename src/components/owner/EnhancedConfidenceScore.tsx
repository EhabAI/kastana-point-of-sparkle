/**
 * Enhanced System Confidence Score Component
 * Uses insight-based deductions for a more accurate operational health score
 */

import { useLanguage } from "@/contexts/LanguageContext";
import { useOperationalInsights } from "@/hooks/useOperationalInsights";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gauge, CheckCircle, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface EnhancedConfidenceScoreProps {
  restaurantId: string;
}

type ConfidenceLevel = "stable" | "needs_attention" | "requires_review";

export function EnhancedConfidenceScore({ restaurantId }: EnhancedConfidenceScoreProps) {
  const { t, language } = useLanguage();
  const { data: insightsData, isLoading } = useOperationalInsights(restaurantId);
  
  if (isLoading || !insightsData) return null;
  
  const score = insightsData.confidenceScore;
  
  // Determine level based on score
  let level: ConfidenceLevel;
  if (score >= 80) level = "stable";
  else if (score >= 60) level = "needs_attention";
  else level = "requires_review";
  
  const levelConfig: Record<ConfidenceLevel, { 
    icon: typeof CheckCircle; 
    color: string;
    bgColor: string;
  }> = {
    stable: { 
      icon: CheckCircle, 
      color: "text-green-600 dark:text-green-500",
      bgColor: "bg-green-100/50 dark:bg-green-900/20"
    },
    needs_attention: { 
      icon: AlertCircle, 
      color: "text-blue-600 dark:text-blue-500",
      bgColor: "bg-blue-100/50 dark:bg-blue-900/20"
    },
    requires_review: { 
      icon: AlertTriangle, 
      color: "text-amber-600 dark:text-amber-500",
      bgColor: "bg-amber-100/50 dark:bg-amber-900/20"
    },
  };
  
  const levelLabels: Record<ConfidenceLevel, { ar: string; en: string }> = {
    stable: { ar: "مستقر", en: "Stable" },
    needs_attention: { ar: "يحتاج انتباه", en: "Needs Attention" },
    requires_review: { ar: "يحتاج مراجعة", en: "Requires Review" },
  };
  
  const config = levelConfig[level];
  const Icon = config.icon;
  
  // Short explanatory text based on insights
  const getExplanatoryText = (): string => {
    if (insightsData.isNewRestaurant) {
      return language === "ar" 
        ? "جارِ جمع البيانات لحساب درجة التشغيل"
        : "Gathering data to calculate operational score";
    }
    
    if (insightsData.insights.length === 0) {
      return language === "ar"
        ? "لا توجد ملاحظات تشغيلية اليوم"
        : "No operational notes today";
    }
    
    const insightCount = insightsData.insights.length;
    return language === "ar"
      ? `${insightCount} ${insightCount === 1 ? "ملاحظة تشغيلية" : "ملاحظات تشغيلية"} نشطة`
      : `${insightCount} active operational ${insightCount === 1 ? "note" : "notes"}`;
  };
  
  return (
    <div className="flex items-center">
      <div className="flex flex-col px-4 min-h-[52px]">
        <span className="text-[9px] uppercase tracking-widest text-foreground/50 font-medium mb-1">
          {t("operational_score")}
        </span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Gauge className={`h-4 w-4 ${config.color}`} />
            <span className={`text-xl font-bold tabular-nums tracking-tight leading-none ${config.color}`}>
              {score}%
            </span>
          </div>
          <Badge variant="outline" className={`${config.color} border-current text-xs px-2 py-0.5`}>
            <Icon className="h-3 w-3 mr-1" />
            {levelLabels[level][language]}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[220px]">
                <p className="text-xs whitespace-pre-line">
                  {language === "ar" 
                    ? "يعكس استقرار العمليات\nبناءً على النشاط الأخير." 
                    : "Reflects overall operational stability\nbased on recent activity."}
                </p>
                {insightsData.insights.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {getExplanatoryText()}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
