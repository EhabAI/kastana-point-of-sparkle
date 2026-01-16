import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemTransactions, InventoryItem } from "@/hooks/useInventoryItems";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Package } from "lucide-react";
import { getInventoryTxnLabel, getTxnTypeColor } from "@/lib/inventoryTransactionLabels";

interface ItemTransactionsDialogProps {
  item: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ItemTransactionsDialog({ item, open, onOpenChange }: ItemTransactionsDialogProps) {
  const { t, language } = useLanguage();
  const { data: transactions = [], isLoading } = useItemTransactions(item.id);
  const dateLocale = language === "ar" ? ar : enUS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("inv_item_transactions")}</DialogTitle>
          <DialogDescription>
            {t("inv_transactions_for")} <span className="font-semibold">{item.name}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-10 w-10 mb-3 opacity-40" />
              <span className="text-sm">{t("inv_no_transactions")}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-lg border bg-muted/20 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-xs ${getTxnTypeColor(tx.txnType)}`}
                    >
                      {getInventoryTxnLabel(tx.txnType, t)}
                    </Badge>
                    <span className="text-sm font-medium tabular-nums">
                      {tx.qty > 0 ? "+" : ""}
                      {tx.qty} {tx.unitName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{tx.branchName}</span>
                    <span>
                      {format(new Date(tx.createdAt), "PPp", { locale: dateLocale })}
                    </span>
                  </div>
                  {tx.notes && (
                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {tx.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
