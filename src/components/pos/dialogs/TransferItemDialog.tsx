import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowRightLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OpenOrder {
  id: string;
  order_number: number;
  table_id: string | null;
}

interface TransferItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetOrderId: string) => void;
  isLoading?: boolean;
  itemName: string;
  openOrders: OpenOrder[];
  currentOrderId: string;
}

export function TransferItemDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading,
  itemName,
  openOrders,
  currentOrderId,
}: TransferItemDialogProps) {
  const { t } = useLanguage();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Filter out current order and get other open orders
  const availableOrders = openOrders.filter(
    (order) => order.id !== currentOrderId
  );

  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderId(orderId);
  };

  const handleProceed = () => {
    if (selectedOrderId) {
      setShowConfirmation(true);
    }
  };

  const handleConfirm = () => {
    if (selectedOrderId) {
      onConfirm(selectedOrderId);
    }
  };

  const handleClose = () => {
    setSelectedOrderId(null);
    setShowConfirmation(false);
    onOpenChange(false);
  };

  const selectedOrder = availableOrders.find((o) => o.id === selectedOrderId);

  if (showConfirmation && selectedOrder) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <DialogTitle>{t("confirm_transfer")}</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {t("about_to_transfer")} <strong>{itemName}</strong> {t("to_order")} #{selectedOrder.order_number}.
              {t("transfer_note")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowConfirmation(false)}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {t("back")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading}
              className="min-h-[44px]"
            >
              {isLoading ? t("transferring") : t("confirm_transfer")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-primary" />
            <DialogTitle>{t("transfer_item")}</DialogTitle>
          </div>
          <DialogDescription>
            {t("transfer_item_desc")} <strong>{itemName}</strong>
          </DialogDescription>
        </DialogHeader>

        {availableOrders.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            {t("no_other_open_orders")}
          </div>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {availableOrders.map((order) => {
                const hasTable = !!order.table_id;
                const isSelected = selectedOrderId === order.id;
                
                return (
                  <button
                    key={order.id}
                    onClick={() => handleSelectOrder(order.id)}
                    className={`w-full p-4 rounded-lg border text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">
                        {t("order_prefix")} #{order.order_number}
                      </span>
                      {hasTable && (
                        <span className="text-sm text-muted-foreground">
                          {t("table_assigned")}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="min-h-[44px]"
          >
            {t("cancel")}
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!selectedOrderId || availableOrders.length === 0}
            className="min-h-[44px]"
          >
            {t("next")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
