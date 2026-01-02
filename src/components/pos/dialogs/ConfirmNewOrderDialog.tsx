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
import { Pause } from "lucide-react";

interface ConfirmNewOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmHoldAndNew: () => void;
}

export function ConfirmNewOrderDialog({
  open,
  onOpenChange,
  onConfirmHoldAndNew,
}: ConfirmNewOrderDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Active Order Exists</AlertDialogTitle>
          <AlertDialogDescription>
            There is an open order. What would you like to do?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmHoldAndNew}>
            <Pause className="h-4 w-4 mr-2" />
            Hold current order and start new
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
