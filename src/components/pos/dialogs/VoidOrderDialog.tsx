import { useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Ban } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface VoidOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber?: number;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function VoidOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
  isLoading,
}: VoidOrderDialogProps) {
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
            <Ban className="h-5 w-5" />
            {t("void_order_title")}
          </DialogTitle>
          <DialogDescription>
            {t("void_order")} #{orderNumber || ""}. {t("void_item_audit_note")}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          {/* Warning Banner */}
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
            <Ban className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">{t("cancel_order_warning")}</p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("void_order_warning_desc")}
              </p>
            </div>
          </div>

          {/* Action Impact Warning */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-md text-xs bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
            <Ban className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{t("action_affects_reports_inventory")}</span>
          </div>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="voidReason">
                {t("reason_for_voiding")} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="voidReason"
                placeholder={t("void_order_input_placeholder")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="min-h-[100px]"
              />
            </div>
          </div>
        </DialogBody>

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
            {isLoading ? t("voiding") : t("void_order")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
