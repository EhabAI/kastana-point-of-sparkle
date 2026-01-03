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
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";

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
  const { t } = useLanguage();

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
            <DialogTitle>{t("z_report")}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            {t("no_report_data")}
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
            {t("z_report")}
          </DialogTitle>
          <DialogDescription>
            {t("shift_opened_at")}: {format(new Date(report.openedAt), "PPp")}
            {report.closedAt && (
              <>
                <br />
                {t("shift_closed_at")}: {format(new Date(report.closedAt), "PPp")}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm">
          {/* Sales Summary */}
          <div>
            <h4 className="font-semibold mb-2">{t("sales_summary")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("total_orders")}</span>
                <span>{report.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("net_sales")}</span>
                <span>{formatJOD(report.netSales)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("total_discounts")}</span>
                <span className="text-green-600">-{formatJOD(report.totalDiscounts)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("service_charge")}</span>
                <span>{formatJOD(report.totalServiceCharge)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("tax")}</span>
                <span>{formatJOD(report.totalTax)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>{t("total_sales")}</span>
                <span>{formatJOD(report.totalSales)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Breakdown */}
          <div>
            <h4 className="font-semibold mb-2">{t("payment_breakdown")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("cash")}</span>
                <span>{formatJOD(report.cashPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("card")}</span>
                <span>{formatJOD(report.cardPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("mobile")}</span>
                <span>{formatJOD(report.mobilePayments)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Cash Reconciliation */}
          <div>
            <h4 className="font-semibold mb-2">{t("cash_reconciliation")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("opening_cash")}</span>
                <span>{formatJOD(report.openingCash)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ {t("cash_sales")}</span>
                <span>{formatJOD(report.cashPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ {t("cash_in")}</span>
                <span>{formatJOD(report.cashIn)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>- {t("cash_out")}</span>
                <span>{formatJOD(report.cashOut)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>- {t("refunds")}</span>
                <span>{formatJOD(report.refundsTotal)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>{t("expected_cash")}</span>
                <span>{formatJOD(report.expectedCash)} {currency}</span>
              </div>
              {report.closingCash !== null && (
                <>
                  <div className="flex justify-between">
                    <span>{t("actual_cash")}</span>
                    <span>{formatJOD(report.closingCash)} {currency}</span>
                  </div>
                  <div className={`flex justify-between font-bold ${report.cashDifference < 0 ? 'text-destructive' : 'text-green-600'}`}>
                    <span>{t("difference")}</span>
                    <span>{report.cashDifference >= 0 ? '+' : ''}{formatJOD(report.cashDifference)} {currency}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Other */}
          <div>
            <h4 className="font-semibold mb-2">{t("other")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("cancelled_orders")}</span>
                <span>{report.cancelledOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("refunds")}</span>
                <span>{formatJOD(report.refundsTotal)} {currency}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-12">
            {t("close")}
          </Button>
          <Button onClick={handlePrint} className="h-12">
            <Printer className="h-4 w-4 mr-2" />
            {t("print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
