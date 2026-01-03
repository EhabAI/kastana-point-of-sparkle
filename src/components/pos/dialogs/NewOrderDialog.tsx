import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Phone } from "lucide-react";
import { OrderTypeSelector, type OrderType } from "../OrderTypeSelector";
import { TableSelector } from "../TableSelector";
import type { BranchTable } from "@/hooks/pos/useBranchTables";
import { useLanguage } from "@/contexts/LanguageContext";

interface CustomerInfo {
  name: string;
  phone: string;
}

interface NewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tables: BranchTable[];
  tablesLoading?: boolean;
  onConfirm: (orderType: OrderType, tableId: string | null, customerInfo?: CustomerInfo) => void;
  isLoading?: boolean;
}

export function NewOrderDialog({
  open,
  onOpenChange,
  tables,
  tablesLoading,
  onConfirm,
  isLoading,
}: NewOrderDialogProps) {
  const { t } = useLanguage();
  const [orderType, setOrderType] = useState<OrderType | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const handleConfirm = () => {
    if (orderType) {
      const customerInfo = orderType === "takeaway" && (customerName.trim() || customerPhone.trim())
        ? { name: customerName.trim(), phone: customerPhone.trim() }
        : undefined;
      
      onConfirm(orderType, orderType === "dine-in" ? selectedTableId : null, customerInfo);
      resetState();
    }
  };

  const resetState = () => {
    setOrderType(null);
    setSelectedTableId(null);
    setCustomerName("");
    setCustomerPhone("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetState();
  };

  const canConfirm = orderType === "takeaway" || (orderType === "dine-in" && selectedTableId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("new_order")}</DialogTitle>
          <DialogDescription>
            {t("select_order_type")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          <OrderTypeSelector
            selectedType={orderType}
            onSelectType={setOrderType}
          />

          {orderType === "dine-in" && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">{t("select_table")}</h4>
              <TableSelector
                tables={tables}
                selectedTableId={selectedTableId}
                onSelectTable={setSelectedTableId}
                isLoading={tablesLoading}
              />
            </div>
          )}

          {orderType === "takeaway" && (
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <h4 className="font-medium text-sm">{t("customer_info_optional")}</h4>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="customerName" className="text-xs text-muted-foreground">
                    {t("customer_name")}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerName"
                      placeholder={t("enter_name")}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="customerPhone" className="text-xs text-muted-foreground">
                    {t("phone_number")}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="customerPhone"
                      type="tel"
                      placeholder={t("enter_phone")}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="h-12">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
            className="h-12 min-w-[120px]"
          >
            {isLoading ? t("creating") : t("start_order")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
