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
            Void Item
          </DialogTitle>
          <DialogDescription>
            This action will be logged for audit purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Item to void:</p>
            <p className="font-medium text-lg">{itemName}</p>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label htmlFor="voidReason">
              Reason for voiding <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="voidReason"
              placeholder="Enter reason for voiding this item..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            {reason === "" && (
              <p className="text-xs text-muted-foreground">
                A reason is required to void an item
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
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !reason.trim()}
            className="h-12"
          >
            {isLoading ? "Voiding..." : "Void Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
