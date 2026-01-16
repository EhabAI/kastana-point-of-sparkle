import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { getInventoryTxnLabel, getTxnTypeColor } from "@/lib/inventoryTransactionLabels";
import type { ShiftInventoryData } from "@/hooks/useShiftInventoryMovements";

interface ZReportInventorySectionProps {
  inventoryData: ShiftInventoryData | null;
  isLoading?: boolean;
}

export function ZReportInventorySection({
  inventoryData,
  isLoading,
}: ZReportInventorySectionProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-20 bg-muted rounded" />
      </div>
    );
  }

  if (!inventoryData || inventoryData.movements.length === 0) {
    return (
      <div>
        <h4 className="font-semibold mb-2 flex items-center gap-2">
          <Package className="h-4 w-4" />
          {t("z_inventory_summary")}
        </h4>
        <div className="text-center py-4 text-muted-foreground text-sm bg-muted/30 rounded-lg">
          {t("z_inv_no_movements")}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h4 className="font-semibold mb-2 flex items-center gap-2">
        <Package className="h-4 w-4" />
        {t("z_inventory_summary")}
      </h4>
      <div className="bg-muted/30 p-3 rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">{t("z_inv_type")}</TableHead>
              <TableHead className="text-xs text-right">{t("z_inv_count")}</TableHead>
              <TableHead className="text-xs text-right text-green-600">{t("z_inv_in")}</TableHead>
              <TableHead className="text-xs text-right text-red-600">{t("z_inv_out")}</TableHead>
              <TableHead className="text-xs text-right">{t("z_inv_net")}</TableHead>
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

        <Separator className="my-2" />

        {/* Totals row */}
        <div className="flex justify-between text-sm font-bold pt-1">
          <span>{t("z_inv_total")}</span>
          <div className="flex gap-4">
            <span className="text-green-600">
              +{inventoryData.totalIn.toFixed(2)}
            </span>
            <span className="text-red-600">
              -{inventoryData.totalOut.toFixed(2)}
            </span>
            <span className={inventoryData.netMovement >= 0 ? "text-green-600" : "text-red-600"}>
              {inventoryData.netMovement > 0 ? "+" : ""}
              {inventoryData.netMovement.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
