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
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Merge Orders?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You are about to merge two table orders:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>{secondaryTableName}</strong> (Order #{secondaryOrderNumber}) will be merged into
              </li>
              <li>
                <strong>{primaryTableName}</strong> (Order #{primaryOrderNumber}) - the older order
              </li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">
              All items from {secondaryTableName} will be moved to {primaryTableName}. 
              The order on {secondaryTableName} will be closed.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Merging..." : "Merge Orders"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
