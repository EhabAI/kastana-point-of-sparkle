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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package, Printer } from "lucide-react";
import { format } from "date-fns";
import { useLanguage } from "@/contexts/LanguageContext";
import { getInventoryTxnLabel, getTxnTypeColor } from "@/lib/inventoryTransactionLabels";
import type { ShiftInventoryData } from "@/hooks/useShiftInventoryMovements";

interface InventorySummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryData: ShiftInventoryData | null;
  isLoading?: boolean;
  shiftOpenedAt?: string;
  shiftClosedAt?: string | null;
}

export function InventorySummaryDialog({
  open,
  onOpenChange,
  inventoryData,
  isLoading,
  shiftOpenedAt,
  shiftClosedAt,
}: InventorySummaryDialogProps) {
  const { t } = useLanguage();

  const handlePrint = () => {
    window.print();
  };

  // Separate incoming vs outgoing movements
  const incomingTypes = ["initial", "purchase", "adjustment_in", "transfer_in"];
  const outgoingTypes = ["sale", "waste", "adjustment_out", "transfer_out"];

  const incomingMovements = inventoryData?.movements.filter(m => 
    incomingTypes.includes(m.txnType) || m.totalIn > 0
  ) || [];

  const outgoingMovements = inventoryData?.movements.filter(m => 
    outgoingTypes.includes(m.txnType) || m.totalOut > 0
  ) || [];

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg print:shadow-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("inventory_daily_summary") || "ملخص حركات المخزون اليومية"}
          </DialogTitle>
          {shiftOpenedAt && (
            <DialogDescription>
              {t("shift_opened_at")}: {format(new Date(shiftOpenedAt), "PPp")}
              {shiftClosedAt && (
                <>
                  <br />
                  {t("shift_closed_at")}: {format(new Date(shiftClosedAt), "PPp")}
                </>
              )}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4 text-sm">
          {/* No Data State */}
          {(!inventoryData || inventoryData.movements.length === 0) ? (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg">
              <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{t("z_inv_no_movements") || "لا توجد حركات مخزون خلال هذه الوردية"}</p>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* INCOMING MOVEMENTS */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div>
                <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                  {t("incoming_movements") || "الحركات الواردة"}
                </h4>
                <div className="bg-green-500/5 border border-green-500/20 p-3 rounded-lg">
                  {incomingMovements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t("z_inv_type") || "النوع"}</TableHead>
                          <TableHead className="text-xs text-right">{t("z_inv_count") || "العدد"}</TableHead>
                          <TableHead className="text-xs text-right">{t("quantity") || "الكمية"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomingMovements.map((movement) => (
                          <TableRow key={`in-${movement.txnType}`}>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${getTxnTypeColor(movement.txnType)}`}
                              >
                                {getInventoryTxnLabel(movement.txnType, t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {movement.transactionCount}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-green-600 font-medium">
                              +{movement.totalIn.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground text-xs py-2">
                      {t("no_incoming_movements") || "لا توجد حركات واردة"}
                    </p>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-green-600">
                    <span>{t("total_incoming") || "إجمالي الوارد"}</span>
                    <span>+{inventoryData.totalIn.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* OUTGOING MOVEMENTS */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div>
                <h4 className="font-semibold mb-2 text-red-600 flex items-center gap-2">
                  {t("outgoing_movements") || "الحركات الصادرة"}
                </h4>
                <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg">
                  {outgoingMovements.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">{t("z_inv_type") || "النوع"}</TableHead>
                          <TableHead className="text-xs text-right">{t("z_inv_count") || "العدد"}</TableHead>
                          <TableHead className="text-xs text-right">{t("quantity") || "الكمية"}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {outgoingMovements.map((movement) => (
                          <TableRow key={`out-${movement.txnType}`}>
                            <TableCell className="py-2">
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${getTxnTypeColor(movement.txnType)}`}
                              >
                                {getInventoryTxnLabel(movement.txnType, t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">
                              {movement.transactionCount}
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-red-600 font-medium">
                              -{movement.totalOut.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground text-xs py-2">
                      {t("no_outgoing_movements") || "لا توجد حركات صادرة"}
                    </p>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between font-bold text-red-600">
                    <span>{t("total_outgoing") || "إجمالي الصادر"}</span>
                    <span>-{inventoryData.totalOut.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ═══════════════════════════════════════════════════════════════════ */}
              {/* NET SUMMARY */}
              {/* ═══════════════════════════════════════════════════════════════════ */}
              <div>
                <h4 className="font-semibold mb-2">{t("net_summary") || "الملخص الصافي"}</h4>
                <div className="bg-muted/30 p-3 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>{t("total_incoming") || "إجمالي الوارد"}</span>
                    <span className="text-green-600 font-medium">+{inventoryData.totalIn.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("total_outgoing") || "إجمالي الصادر"}</span>
                    <span className="text-red-600 font-medium">-{inventoryData.totalOut.toFixed(2)}</span>
                  </div>
                  <Separator className="my-2" />
                  <div className={`flex justify-between font-bold text-lg ${
                    inventoryData.netMovement >= 0 ? "text-green-600" : "text-red-600"
                  }`}>
                    <span>{t("net_movement") || "صافي الحركة"}</span>
                    <span>
                      {inventoryData.netMovement > 0 ? "+" : ""}
                      {inventoryData.netMovement.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* All Movements Table */}
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">{t("all_movements") || "جميع الحركات"}</h4>
                <div className="bg-muted/30 p-3 rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">{t("z_inv_type") || "النوع"}</TableHead>
                        <TableHead className="text-xs text-right">{t("z_inv_count") || "العدد"}</TableHead>
                        <TableHead className="text-xs text-right text-green-600">{t("z_inv_in") || "وارد"}</TableHead>
                        <TableHead className="text-xs text-right text-red-600">{t("z_inv_out") || "صادر"}</TableHead>
                        <TableHead className="text-xs text-right">{t("z_inv_net") || "صافي"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventoryData.movements.map((movement) => (
                        <TableRow key={movement.txnType}>
                          <TableCell className="py-2">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 ${getTxnTypeColor(movement.txnType)}`}
                            >
                              {getInventoryTxnLabel(movement.txnType, t)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums">
                            {movement.transactionCount}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-green-600">
                            {movement.totalIn > 0 ? `+${movement.totalIn.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm tabular-nums text-red-600">
                            {movement.totalOut > 0 ? `-${movement.totalOut.toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className={`text-right text-sm tabular-nums font-medium ${
                            movement.netMovement > 0 
                              ? "text-green-600" 
                              : movement.netMovement < 0 
                                ? "text-red-600" 
                                : ""
                          }`}>
                            {movement.netMovement > 0 ? "+" : ""}
                            {movement.netMovement.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
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
