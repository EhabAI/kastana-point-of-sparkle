import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock } from "lucide-react";
import { startOfToday, subDays, startOfDay, endOfDay } from "date-fns";

interface WhatChangedCardProps {
  restaurantId: string;
}

interface ChangeItem {
  key: string;
  textAr: string;
  textEn: string;
}

export function WhatChangedCard({ restaurantId }: WhatChangedCardProps) {
  const { language } = useLanguage();
  const { selectedBranch } = useBranchContextSafe();

  const { data, isLoading } = useQuery({
    queryKey: ["what-changed-yesterday", restaurantId, selectedBranch?.id],
    queryFn: async () => {
      const today = startOfToday();
      const yesterday = subDays(today, 1);
      const yesterdayStart = startOfDay(yesterday).toISOString();
      const yesterdayEnd = endOfDay(yesterday).toISOString();

      const changes: ChangeItem[] = [];

      // Check for new menu items added yesterday
      let menuQuery = supabase
        .from("menu_items")
        .select("id, category_id, menu_categories!inner(restaurant_id)")
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd);

      const { data: newMenuItems } = await menuQuery;
      const restaurantMenuItems = newMenuItems?.filter(
        (item: any) => item.menu_categories?.restaurant_id === restaurantId
      );
      
      if (restaurantMenuItems && restaurantMenuItems.length > 0) {
        changes.push({
          key: "new_menu_items",
          textAr: "تمت إضافة أصناف جديدة للقائمة",
          textEn: "New menu items were added",
        });
      }

      // Check for inventory adjustments yesterday
      let invQuery = supabase
        .from("inventory_transactions")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd)
        .in("txn_type", ["adjustment", "waste", "count"]);

      if (selectedBranch?.id) {
        invQuery = invQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: invAdjustments } = await invQuery;
      if (invAdjustments && invAdjustments.length > 0) {
        changes.push({
          key: "inv_adjustments",
          textAr: "تمت تسويات على المخزون",
          textEn: "Inventory adjustments were made",
        });
      }

      // Check for new staff added yesterday
      const { data: newStaff } = await supabase
        .from("user_roles")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .in("role", ["cashier", "kitchen"])
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd);

      if (newStaff && newStaff.length > 0) {
        changes.push({
          key: "new_staff",
          textAr: "تمت إضافة موظفين جدد",
          textEn: "New staff members were added",
        });
      }

      // Check for refunds yesterday
      let refundQuery = supabase
        .from("refunds")
        .select("id")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", yesterdayStart)
        .lte("created_at", yesterdayEnd);

      if (selectedBranch?.id) {
        refundQuery = refundQuery.eq("branch_id", selectedBranch.id);
      }

      const { data: refunds } = await refundQuery;
      if (refunds && refunds.length > 0) {
        changes.push({
          key: "refunds",
          textAr: "تم تسجيل مرتجعات",
          textEn: "Refunds were recorded",
        });
      }

      // Return max 2 changes
      return changes.slice(0, 2);
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (isLoading) {
    return (
      <Card className="bg-muted/30 border-border/50">
        <CardContent className="p-3">
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    );
  }

  const changes = data || [];
  const noChanges = changes.length === 0;

  return (
    <Card className="bg-muted/30 border-border/50">
      <CardHeader className="pb-1.5 pt-3 px-3">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <CardTitle className="text-xs font-medium text-muted-foreground">
            {language === "ar" ? "ما الذي تغيّر منذ أمس؟" : "What changed since yesterday?"}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        {noChanges ? (
          <p className="text-xs text-muted-foreground/80">
            {language === "ar"
              ? "لم تُسجَّل تغييرات مهمة منذ أمس."
              : "No significant changes were recorded since yesterday."}
          </p>
        ) : (
          <ul className="space-y-1">
            {changes.map((change) => (
              <li
                key={change.key}
                className="text-xs text-foreground/70 flex items-start gap-1.5"
              >
                <span className="text-muted-foreground mt-0.5">•</span>
                <span>{language === "ar" ? change.textAr : change.textEn}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
