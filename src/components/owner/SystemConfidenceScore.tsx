/**
 * System Confidence Score Component
 * Displays a daily operational score based on errors, alerts, and flow compliance
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gauge, CheckCircle, AlertCircle, AlertTriangle, HelpCircle } from "lucide-react";

interface SystemConfidenceScoreProps {
  restaurantId: string;
}

type ConfidenceLevel = "excellent" | "good" | "needs_attention";

export function SystemConfidenceScore({ restaurantId }: SystemConfidenceScoreProps) {
  const { t, language } = useLanguage();
  
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  
  const { data: score } = useQuery({
    queryKey: ["system-confidence", restaurantId, todayStart],
    queryFn: async () => {
      // Get today's orders
      const { data: orders } = await supabase
        .from("orders")
        .select("id, status, cancelled_reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Get voided items today
      const { data: voidedItems } = await supabase
        .from("order_items")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .eq("voided", true)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Get refunds today
      const { data: refunds } = await supabase
        .from("refunds")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);
      
      // Get long open shifts
      const { data: openShifts } = await supabase
        .from("shifts")
        .select("id, opened_at")
        .eq("restaurant_id", restaurantId)
        .eq("status", "open");
      
      const totalOrders = orders?.length || 0;
      const cancelledOrders = orders?.filter(o => o.status === "cancelled")?.length || 0;
      const voidCount = voidedItems?.length || 0;
      const refundCount = refunds?.length || 0;
      
      // Check for long shifts (> 10 hours)
      const longShifts = openShifts?.filter(s => {
        const hoursOpen = (Date.now() - new Date(s.opened_at).getTime()) / (1000 * 60 * 60);
        return hoursOpen > 10;
      })?.length || 0;
      
      // Calculate score (0-100)
      let scoreValue = 100;
      
      // Deductions
      if (totalOrders > 0) {
        const cancellationRate = (cancelledOrders / totalOrders) * 100;
        if (cancellationRate > 10) scoreValue -= 15;
        else if (cancellationRate > 5) scoreValue -= 8;
      }
      
      if (voidCount > 10) scoreValue -= 15;
      else if (voidCount > 5) scoreValue -= 8;
      else if (voidCount > 2) scoreValue -= 3;
      
      if (refundCount > 5) scoreValue -= 10;
      else if (refundCount > 2) scoreValue -= 5;
      
      if (longShifts > 0) scoreValue -= 10;
      
      // No activity penalty (if it's past noon and no orders)
      const currentHour = new Date().getHours();
      if (totalOrders === 0 && currentHour >= 12) {
        scoreValue -= 20;
      }
      
      scoreValue = Math.max(0, Math.min(100, scoreValue));
      
      let level: ConfidenceLevel;
      if (scoreValue >= 80) level = "excellent";
      else if (scoreValue >= 60) level = "good";
      else level = "needs_attention";
      
      return {
        score: scoreValue,
        level,
        factors: {
          totalOrders,
          cancelledOrders,
          voidCount,
          refundCount,
          longShifts,
        }
      };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000,
  });
  
  if (!score) return null;
  
  const levelConfig: Record<ConfidenceLevel, {
    icon: typeof CheckCircle;
    color: string;
    bgColor: string;
    borderColor: string;
  }> = {
    excellent: {
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/20",
      borderColor: "border-green-200 dark:border-green-800/50",
    },
    good: {
      icon: AlertCircle,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/20",
      borderColor: "border-blue-200 dark:border-blue-800/50",
    },
    needs_attention: {
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/20",
      borderColor: "border-amber-200 dark:border-amber-800/50",
    },
  };
  
  const config = levelConfig[score.level];
  const Icon = config.icon;
  
  const levelLabels: Record<ConfidenceLevel, { ar: string; en: string }> = {
    excellent: { ar: "ممتاز", en: "Excellent" },
    good: { ar: "جيد", en: "Good" },
    needs_attention: { ar: "يحتاج انتباه", en: "Needs Attention" },
  };
  
  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${config.bgColor}`}>
              <Gauge className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {t("operational_score")}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className={`${config.color} border-current`}>
                  <Icon className="h-3 w-3 mr-1" />
                  {levelLabels[score.level][language]}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {score.score}%
                </span>
              </div>
            </div>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[200px]">
                <p className="text-xs">{t("based_on_today")}</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  <li>• {t("orders")}: {score.factors.totalOrders}</li>
                  <li>• {language === "ar" ? "ملغي" : "Cancelled"}: {score.factors.cancelledOrders}</li>
                  <li>• {language === "ar" ? "إلغاءات" : "Voids"}: {score.factors.voidCount}</li>
                  <li>• {language === "ar" ? "استردادات" : "Refunds"}: {score.factors.refundCount}</li>
                </ul>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
