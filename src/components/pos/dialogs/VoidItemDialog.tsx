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

interface VoidItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  onConfirm: (reason: string) => void;
  isLoading?: boolean;
}

export function VoidItemDialog({
  open,
  onOpenChange,
  itemName,
  onConfirm,
  isLoading,
}: VoidItemDialogProps) {
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            {t("void_item_title")}
          </DialogTitle>
          <DialogDescription>
            {t("void_item_audit_note")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">{t("item_to_void")}:</p>
            <p className="font-medium text-lg">{itemName}</p>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="voidReason">
              {t("reason_for_voiding")} <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="voidReason"
              placeholder={t("void_item_input_placeholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            {reason === "" && (
              <p className="text-xs text-muted-foreground">
                {t("reason_required_to_void")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleClose}
            className="h-12"
            disabled={isLoading}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="h-12"
          >
            {isLoading ? t("voiding") : t("void_item")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
