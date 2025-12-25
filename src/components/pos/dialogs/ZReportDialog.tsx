import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Printer } from "lucide-react";
import { format } from "date-fns";
import type { ZReportData } from "@/hooks/pos/useZReport";

interface ZReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ZReportData | null;
  currency: string;
  isLoading?: boolean;
}

export function ZReportDialog({
  open,
  onOpenChange,
  report,
  currency,
  isLoading,
}: ZReportDialogProps) {
  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!report) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Z Report</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            No report data available
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md print:shadow-none">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Z Report
          </DialogTitle>
          <DialogDescription>
            Shift opened: {format(new Date(report.openedAt), "PPp")}
            {report.closedAt && (
              <>
                <br />
                Shift closed: {format(new Date(report.closedAt), "PPp")}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm">
          {/* Sales Summary */}
          <div>
            <h4 className="font-semibold mb-2">Sales Summary</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Total Orders</span>
                <span>{report.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Net Sales</span>
                <span>{report.netSales.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Discounts</span>
                <span className="text-green-600">-{report.totalDiscounts.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Charge</span>
                <span>{report.totalServiceCharge.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{report.totalTax.toFixed(2)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Total Sales</span>
                <span>{report.totalSales.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div>
            <h4 className="font-semibold mb-2">Payment Breakdown</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Cash</span>
                <span>{report.cashPayments.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Card</span>
                <span>{report.cardPayments.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Mobile</span>
                <span>{report.mobilePayments.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cash Reconciliation */}
          <div>
            <h4 className="font-semibold mb-2">Cash Reconciliation</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Opening Cash</span>
                <span>{report.openingCash.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Cash Sales</span>
                <span>{report.cashPayments.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Cash In</span>
                <span>{report.cashIn.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>- Cash Out</span>
                <span>{report.cashOut.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>- Refunds</span>
                <span>{report.refundsTotal.toFixed(2)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>Expected Cash</span>
                <span>{report.expectedCash.toFixed(2)} {currency}</span>
              </div>
              {report.closingCash !== null && (
                <>
                  <div className="flex justify-between">
                    <span>Actual Cash</span>
                    <span>{report.closingCash.toFixed(2)} {currency}</span>
                  </div>
                  <div className={`flex justify-between font-bold ${report.cashDifference < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    <span>Difference</span>
                    <span>{report.cashDifference >= 0 ? '+' : ''}{report.cashDifference.toFixed(2)} {currency}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Other */}
          <div>
            <h4 className="font-semibold mb-2">Other</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Cancelled Orders</span>
                <span>{report.cancelledOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>Refunds</span>
                <span>{report.refundsTotal.toFixed(2)} {currency}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
