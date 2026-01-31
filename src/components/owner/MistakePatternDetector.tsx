/**
 * Mistake Pattern Detector Component
 * Detects repeated operational patterns without accusations
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, TrendingUp } from "lucide-react";

interface MistakePatternDetectorProps {
  restaurantId: string;
}

interface PatternInfo {
  type: "excessive_voids" | "repeated_refunds" | "frequent_merges";
  count: number;
  threshold: number;
}

export function MistakePatternDetector({ restaurantId }: MistakePatternDetectorProps) {
  const { t, language } = useLanguage();
  const { selectedBranch } = useBranchContextSafe();
  
  const today = new Date();
  const todayStart = startOfDay(today).toISOString();
  const todayEnd = endOfDay(today).toISOString();
  
  const { data: patterns } = useQuery({
    queryKey: ["mistake-patterns", restaurantId, selectedBranch?.id, todayStart],
    queryFn: async () => {
      const detectedPatterns: PatternInfo[] = [];
      
      // Check for excessive voids by cashier
      let voidedQuery = supabase
        .from("order_items")
        .select(`
          id,
          order_id,
          orders!inner(shift_id, branch_id)
        `)
        .eq("restaurant_id", restaurantId)
        .eq("voided", true)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      if (selectedBranch?.id) {
        voidedQuery = voidedQuery.eq("orders.branch_id", selectedBranch.id);
      }

      const { data: voidedItems } = await voidedQuery;
      
      // Group by shift to check for patterns
      const voidsByShift: Record<string, number> = {};
      voidedItems?.forEach(item => {
        const shiftId = (item.orders as any)?.shift_id;
        if (shiftId) {
          voidsByShift[shiftId] = (voidsByShift[shiftId] || 0) + 1;
        }
      });
      
      // Check if any shift has excessive voids (threshold: 8)
      const maxVoidsInShift = Math.max(...Object.values(voidsByShift), 0);
      if (maxVoidsInShift >= 8) {
        detectedPatterns.push({
          type: "excessive_voids",
          count: maxVoidsInShift,
          threshold: 8,
        });
      }
      
      // Check for repeated refunds on same items
      let refundsQuery = supabase
        .from("refunds")
        .select("id, order_id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", todayStart)
        .lt("created_at", todayEnd);

      if (selectedBranch?.id) {
        refundsQuery = refundsQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: refunds } = await refundsQuery;
      
      // If more than 5 refunds today, flag it
      if (refunds && refunds.length >= 5) {
        detectedPatterns.push({
          type: "repeated_refunds",
          count: refunds.length,
          threshold: 5,
        });
      }
      
      // Check for frequent merges (would need audit log for this)
      // For now, we'll skip this as it requires audit log query
      
      return detectedPatterns;
    },
    enabled: !!restaurantId,
    refetchInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
  
  if (!patterns || patterns.length === 0) return null;
  
  const patternLabels: Record<PatternInfo["type"], { ar: string; en: string }> = {
    excessive_voids: { 
      ar: "إلغاءات متعددة في وردية واحدة", 
      en: "Multiple voids in one shift" 
    },
    repeated_refunds: { 
      ar: "استردادات متكررة اليوم", 
      en: "Repeated refunds today" 
    },
    frequent_merges: { 
      ar: "دمج طلبات متكرر", 
      en: "Frequent order merges" 
    },
  };
  
  return (
    <Card className="border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="p-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-amber-700 dark:text-amber-300 uppercase tracking-wider font-medium">
              {t("mistake_pattern_detected")}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {patterns.map((pattern, idx) => (
                <Badge 
                  key={idx} 
                  variant="outline" 
                  className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {patternLabels[pattern.type][language]} ({pattern.count})
                </Badge>
              ))}
            </div>
            <p className="text-xs text-amber-600/70 dark:text-amber-400/70 mt-2">
              {language === "ar" 
                ? "هذا مجرد ملاحظة للمراجعة، وليس اتهاماً."
                : "This is just an observation for review, not an accusation."
              }
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
