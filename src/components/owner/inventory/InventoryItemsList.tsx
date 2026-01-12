import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useInventoryItems, InventoryItem } from "@/hooks/useInventoryItems";
import { Search, Package, Download, Upload, Edit2, History, AlertTriangle } from "lucide-react";
import { EditItemDialog } from "./EditItemDialog";
import { ItemTransactionsDialog } from "./ItemTransactionsDialog";
import { InventoryCSVImport } from "./InventoryCSVImport";

interface InventoryItemsListProps {
  restaurantId: string;
  isReadOnly?: boolean;
}

export function InventoryItemsList({ restaurantId, isReadOnly = false }: InventoryItemsListProps) {
  const { t } = useLanguage();
  const { data: items = [], isLoading } = useInventoryItems(restaurantId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [viewingTransactions, setViewingTransactions] = useState<InventoryItem | null>(null);
  const [showImport, setShowImport] = useState(false);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Status filter
      if (statusFilter === "active" && !item.isActive) return false;
      if (statusFilter === "inactive" && item.isActive) return false;
      // Low stock filter
      if (lowStockOnly && item.onHandBase >= item.minLevel) return false;
      return true;
    });
  }, [items, search, statusFilter, lowStockOnly]);

  const handleExportCSV = () => {
    const headers = ["Name", "Branch", "Unit", "On Hand", "Min Level", "Reorder Point", "Status"];
    const rows = filteredItems.map((item) => [
      item.name,
      item.branchName,
      item.baseUnitName,
      item.onHandBase.toString(),
      item.minLevel.toString(),
      item.reorderPoint.toString(),
      item.isActive ? "Active" : "Inactive",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inventory_items_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("inv_items_list")}
              </CardTitle>
              <CardDescription>{t("inv_items_list_desc")}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isReadOnly && (
                <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
                  <Upload className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("inv_import_csv")}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("inv_export_csv")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("inv_search_items")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ltr:pl-9 rtl:pr-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("inv_all_items")}</SelectItem>
                <SelectItem value="active">{t("active")}</SelectItem>
                <SelectItem value="inactive">{t("inactive")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-background">
              <Switch
                id="low-stock-filter"
                checked={lowStockOnly}
                onCheckedChange={setLowStockOnly}
              />
              <label htmlFor="low-stock-filter" className="text-sm cursor-pointer whitespace-nowrap">
                {t("inv_low_stock_only")}
              </label>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-40" />
              <span className="text-sm">{t("inv_no_items")}</span>
              {!isReadOnly && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowImport(true)}>
                  <Upload className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("inv_import_csv")}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">{t("inv_item_name")}</TableHead>
                    <TableHead className="font-semibold">{t("branch")}</TableHead>
                    <TableHead className="font-semibold text-center">{t("inv_on_hand")}</TableHead>
                    <TableHead className="font-semibold text-center">{t("inv_min_level")}</TableHead>
                    <TableHead className="font-semibold text-center">{t("inv_reorder_point")}</TableHead>
                    <TableHead className="font-semibold text-center">{t("status")}</TableHead>
                    <TableHead className="font-semibold text-center">{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const isLowStock = item.onHandBase < item.minLevel;
                    const isNearReorder = item.onHandBase < item.reorderPoint && !isLowStock;

                    return (
                      <TableRow
                        key={item.id}
                        className={`
                          ${isLowStock ? "bg-destructive/5" : ""}
                          ${isNearReorder ? "bg-warning/5" : ""}
                        `}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isLowStock && (
                              <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                            )}
                            <span className="font-medium">{item.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{item.branchName}</TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={isLowStock ? "destructive" : isNearReorder ? "secondary" : "outline"}
                            className="tabular-nums"
                          >
                            {item.onHandBase} {item.baseUnitName}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {item.minLevel}
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground tabular-nums">
                          {item.reorderPoint}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={item.isActive ? "default" : "secondary"}>
                            {item.isActive ? t("active") : t("inactive")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {!isReadOnly && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditingItem(item)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setViewingTransactions(item)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Footer count */}
          {filteredItems.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              {t("showing")} {filteredItems.length} {t("of")} {items.length} {t("items")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingItem && (
        <EditItemDialog
          item={editingItem}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
        />
      )}

      {/* Transactions Dialog */}
      {viewingTransactions && (
        <ItemTransactionsDialog
          item={viewingTransactions}
          open={!!viewingTransactions}
          onOpenChange={(open) => !open && setViewingTransactions(null)}
        />
      )}

      {/* Import Dialog */}
      {showImport && (
        <InventoryCSVImport
          restaurantId={restaurantId}
          open={showImport}
          onOpenChange={setShowImport}
        />
      )}
    </>
  );
}
