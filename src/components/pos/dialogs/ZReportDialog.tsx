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
            <DialogTitle>{t("z_financial_report") || "تقرير Z المالي"}</DialogTitle>
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
      <DialogContent className="sm:max-w-lg print:shadow-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t("z_financial_report") || "تقرير Z المالي"}
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
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* GROSS SALES (Before Refunds) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <h4 className="font-semibold mb-2 text-primary">{t("gross_sales")} ({t("before_refunds")})</h4>
            <div className="space-y-1 bg-muted/30 p-3 rounded-lg">
              <div className="flex justify-between">
                <span>{t("total_orders")}</span>
                <span>{report.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("net_sales")} ({t("subtotal")})</span>
                <span>{formatJOD(report.grossNetSales)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("total_discounts")}</span>
                <span className="text-green-600">-{formatJOD(report.totalDiscounts)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("service_charge")}</span>
                <span>{formatJOD(report.grossServiceCharge)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("tax")}</span>
                <span>{formatJOD(report.grossTax)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>{t("gross_total")}</span>
                <span>{formatJOD(report.grossSales)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* REFUNDS SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <h4 className="font-semibold mb-2 text-destructive">{t("refunds")}</h4>
            <div className="space-y-1 bg-destructive/5 p-3 rounded-lg border border-destructive/20">
              <div className="flex justify-between">
                <span>{t("refund_count")}</span>
                <span>{report.refundCount}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("refund_subtotal")}</span>
                <span className="text-destructive">-{formatJOD(report.refundSubtotal)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("refund_tax")}</span>
                <span className="text-destructive">-{formatJOD(report.refundTax)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("refund_service_charge")}</span>
                <span className="text-destructive">-{formatJOD(report.refundServiceCharge)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold">
                <span>{t("total_refunded")}</span>
                <span className="text-destructive">-{formatJOD(report.refundsTotal)} {currency}</span>
              </div>
              
              {/* Refund allocation by payment method */}
              <div className="mt-2 pt-2 border-t border-destructive/20 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t("cash_refunds")}</span>
                  <span>-{formatJOD(report.cashRefunds)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("card_refunds")}</span>
                  <span>-{formatJOD(report.cardRefunds)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t("mobile_refunds")}</span>
                  <span>-{formatJOD(report.mobileRefunds)} {currency}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* ADJUSTED TOTALS (After Refunds) - What business keeps */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <h4 className={`font-semibold mb-2 ${report.adjustedSales < 0 ? 'text-destructive' : 'text-green-600'}`}>
              {t("adjusted_totals")} ({t("after_refunds")})
            </h4>
            <div className={`space-y-1 p-3 rounded-lg border ${report.adjustedSales < 0 ? 'bg-destructive/5 border-destructive/20' : 'bg-green-500/5 border-green-500/20'}`}>
              <div className="flex justify-between">
                <span>{t("net_sales")}</span>
                <span className={report.adjustedNetSales < 0 ? 'text-destructive' : ''}>{formatJOD(report.adjustedNetSales)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("service_charge")}</span>
                <span className={report.adjustedServiceCharge < 0 ? 'text-destructive' : ''}>{formatJOD(report.adjustedServiceCharge)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("tax")}</span>
                <span className={report.adjustedTax < 0 ? 'text-destructive' : ''}>{formatJOD(report.adjustedTax)} {currency}</span>
              </div>
              <Separator className="my-2" />
              <div className={`flex justify-between font-bold ${report.adjustedSales < 0 ? 'text-destructive' : 'text-green-600'}`}>
                <span>{t("adjusted_total_sales")}</span>
                <span>{formatJOD(report.adjustedSales)} {currency}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* PAYMENT BREAKDOWN (Net - After Refunds) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <h4 className="font-semibold mb-2">{t("payment_breakdown")} ({t("net")})</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("cash")}</span>
                <span className={report.netCashPayments < 0 ? 'text-destructive' : ''}>{formatJOD(report.netCashPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("card")}</span>
                <span className={report.netCardPayments < 0 ? 'text-destructive' : ''}>{formatJOD(report.netCardPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("mobile")}</span>
                <span className={report.netMobilePayments < 0 ? 'text-destructive' : ''}>{formatJOD(report.netMobilePayments)} {currency}</span>
              </div>
              <Separator className="my-2" />
              {(() => {
                const netTotal = report.netCashPayments + report.netCardPayments + report.netMobilePayments;
                return (
                  <div className={`flex justify-between font-bold ${netTotal < 0 ? 'text-destructive' : ''}`}>
                    <span>{t("total_collected")}</span>
                    <span>{formatJOD(netTotal)} {currency}</span>
                  </div>
                );
              })()}
            </div>
          </div>

          <Separator />

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* CASH DRAWER RECONCILIATION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div>
            <h4 className="font-semibold mb-2">{t("cash_reconciliation")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("opening_cash")}</span>
                <span>{formatJOD(report.openingCash)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ {t("net_cash_sales")}</span>
                <span>{formatJOD(report.netCashPayments)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>+ {t("cash_in")}</span>
                <span>{formatJOD(report.cashIn)} {currency}</span>
              </div>
              <div className="flex justify-between">
                <span>- {t("cash_out")}</span>
                <span>{formatJOD(report.cashOut)} {currency}</span>
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

          {/* Other (Cancelled) */}
          <div>
            <h4 className="font-semibold mb-2">{t("other")}</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>{t("cancelled_orders")}</span>
                <span>{report.cancelledOrders}</span>
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
