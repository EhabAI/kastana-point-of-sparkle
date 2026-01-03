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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface CancelOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber?: number;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading,
}: CancelOrderDialogProps) {
  const { t } = useLanguage();
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (reason.trim()) {
      onConfirm(reason.trim());
      setReason("");
    }
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t("cancel_order_title")}
          </DialogTitle>
          <DialogDescription>
            {t("cancel_order")} #{orderNumber || ""}. {t("void_item_audit_note")}
          </DialogDescription>
        </DialogHeader>

        {/* Warning Banner */}
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive">{t("cancel_order_warning")}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("cancel_order_warning_desc")}
            </p>
          </div>
        </div>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cancelReason">
              {t("reason_for_cancellation")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancelReason"
              placeholder={t("cancel_reason_input_placeholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="min-h-[100px]"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="h-12"
            disabled={isLoading}
          >
            {t("keep_order")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="h-12"
          >
            {isLoading ? t("cancelling") : t("cancel_order")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
