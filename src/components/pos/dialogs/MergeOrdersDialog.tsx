import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { FirstTimeCoachCard } from "@/components/pos/FirstTimeCoachCard";
import { useInFlowIntelligence } from "@/hooks/useInFlowIntelligence";

interface MergeOrdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  primaryTableName: string;
  secondaryTableName: string;
  primaryOrderNumber: number;
  secondaryOrderNumber: number;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function MergeOrdersDialog({
  open,
  onOpenChange,
  primaryTableName,
  secondaryTableName,
  primaryOrderNumber,
  secondaryOrderNumber,
  onConfirm,
  isLoading,
}: MergeOrdersDialogProps) {
  const { t } = useLanguage();
  const { isFirstTime, completeAction } = useInFlowIntelligence();
  const [showCoachCard, setShowCoachCard] = useState(false);

  // Check if first time when dialog opens
  useEffect(() => {
    if (open && isFirstTime("merge_orders")) {
      setShowCoachCard(true);
    }
  }, [open, isFirstTime]);

  const handleConfirm = () => {
    completeAction("merge_orders");
    onConfirm();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("merge_orders_question")}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {/* First-Time Coaching Card */}
            {showCoachCard && (
              <FirstTimeCoachCard
                actionKey="merge_orders"
                onDismiss={() => setShowCoachCard(false)}
                className="mb-3"
              />
            )}
            
            <p>
              {t("about_to_merge")}
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>{secondaryTableName}</strong> ({t("order_prefix")} #{secondaryOrderNumber}) {t("will_be_merged_into")}
              </li>
              <li>
                <strong>{primaryTableName}</strong> ({t("order_prefix")} #{primaryOrderNumber}) - {t("the_older_order")}
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              {t("all_items_moved")} {secondaryTableName} → {primaryTableName}. 
              {t("order_will_be_closed")}
            </p>
            {/* Action Impact Warning */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 mt-3">
              <span>⚠️ {t("action_affects_reports_inventory")}</span>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? t("merging") : t("merge_orders")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
