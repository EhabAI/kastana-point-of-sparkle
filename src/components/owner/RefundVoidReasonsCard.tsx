import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { subDays, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RotateCcw, ChevronRight, CheckCircle, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RefundVoidReasonsCardProps {
  restaurantId: string;
  onViewDetails?: () => void;
}

interface ReasonCount {
  reason: string;
  count: number;
}

export function RefundVoidReasonsCard({ restaurantId, onViewDetails }: RefundVoidReasonsCardProps) {
  const { t, language } = useLanguage();
  const { selectedBranch } = useBranchContextSafe();

  const sevenDaysAgo = startOfDay(subDays(new Date(), 7)).toISOString();

  const { data, isLoading } = useQuery({
    queryKey: ["refund-void-reasons", restaurantId, selectedBranch?.id, sevenDaysAgo],
    queryFn: async () => {
      // Get refunds from last 7 days
      let refundsQuery = supabase
        .from("refunds")
        .select("reason")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", sevenDaysAgo);

      if (selectedBranch?.id) {
        refundsQuery = refundsQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: refunds, error: refundsError } = await refundsQuery;
      if (refundsError) throw refundsError;

      // Get void actions from audit_logs
      let voidQuery = supabase
        .from("audit_logs")
        .select("details")
        .eq("restaurant_id", restaurantId)
        .in("action", ["VOID_ITEM", "ITEM_VOID", "VOID_ORDER"])
        .gte("created_at", sevenDaysAgo);

      const { data: voidLogs, error: voidError } = await voidQuery;
      if (voidError) throw voidError;

      // Aggregate reasons
      const reasonMap: Record<string, number> = {};

      // Process refund reasons
      refunds?.forEach((r) => {
        const reason = r.reason?.trim() || (language === "ar" ? "غير محدد" : "Unspecified");
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      });

      // Process void reasons from audit logs
      voidLogs?.forEach((log) => {
        const details = log.details as Record<string, unknown> | null;
        const reason = (details?.reason as string) || 
                       (details?.void_reason as string) || 
                       (language === "ar" ? "إلغاء" : "Void");
        reasonMap[reason] = (reasonMap[reason] || 0) + 1;
      });

      // Sort and get top 3
      const topReasons: ReasonCount[] = Object.entries(reasonMap)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      const totalCount = Object.values(reasonMap).reduce((sum, c) => sum + c, 0);

      return { topReasons, totalCount };
    },
    enabled: !!restaurantId,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 border h-full">
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  const topReasons = data?.topReasons || [];
  const hasData = topReasons.length > 0;

  return (
    <Card className="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 border h-full">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30">
              <RotateCcw className="h-4 w-4 text-rose-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-foreground">
                {t("refund_void_reasons_title")}
              </CardTitle>
              <p className="text-[10px] text-muted-foreground">
                {t("last_7_days")}
              </p>
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-4 w-4 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[250px]">
                <p className="text-xs">{t("refund_void_reasons_tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {hasData ? (
          <div className="space-y-2">
            {topReasons.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 border-b border-rose-100 dark:border-rose-800/30 last:border-0"
              >
                <span className="text-sm text-foreground/80 truncate max-w-[70%]">
                  {item.reason}
                </span>
                <span className="text-sm font-semibold text-rose-600 tabular-nums">
                  ({item.count})
                </span>
              </div>
            ))}
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 text-rose-600 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                onClick={onViewDetails}
              >
                {t("view_details")}
                <ChevronRight className="h-4 w-4 ltr:ml-1 rtl:mr-1" />
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-emerald-500" />
            <span className="text-sm">{t("no_refunds_or_voids")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
