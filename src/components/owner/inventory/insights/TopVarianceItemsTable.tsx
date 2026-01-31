import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTopVarianceItems } from "@/hooks/useInventoryInsights";
import { BarChart3, ArrowUpDown, DollarSign, Package } from "lucide-react";

interface TopVarianceItemsTableProps {
  restaurantId: string;
  branchId?: string;
}

export function TopVarianceItemsTable({ restaurantId, branchId }: TopVarianceItemsTableProps) {
  const { t, language } = useLanguage();
  const [days, setDays] = useState(30);
  const [sortBy, setSortBy] = useState<"quantity" | "value">("quantity");
  const [limit, setLimit] = useState(10);

  const { data: items = [], isLoading } = useTopVarianceItems(restaurantId, days, limit, sortBy, branchId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-JO" : "en-JO", {
      style: "currency",
      currency: "JOD",
      minimumFractionDigits: 3,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("inv_top_variance_items")}</CardTitle>
              <CardDescription>{t("inv_top_variance_items_desc")}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(days)} onValueChange={(v) => setDays(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">{t("last_7_days")}</SelectItem>
                <SelectItem value="30">{t("last_30_days")}</SelectItem>
                <SelectItem value="60">{t("last_60_days")}</SelectItem>
                <SelectItem value="90">{t("last_90_days")}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "quantity" | "value")}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quantity">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3" />
                    {t("by_quantity")}
                  </div>
                </SelectItem>
                <SelectItem value="value">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    {t("by_value")}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-40" />
            <span className="text-sm">{t("inv_no_variance_items")}</span>
          </div>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>{t("item_name")}</TableHead>
                  <TableHead>{t("branch")}</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <ArrowUpDown className="h-3 w-3" />
                      {t("inv_variance_qty")}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t("inv_variance_value")}</TableHead>
                  <TableHead className="text-center">{t("inv_occurrences")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={item.itemId} className="hover:bg-muted/30">
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.itemName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {item.branchName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono text-sm">
                        {item.totalVarianceQty.toFixed(2)} {item.unitName}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.totalVarianceValue > 0 ? (
                        <span className="font-mono text-sm text-red-600">
                          {formatCurrency(item.totalVarianceValue)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {item.varianceCount}x
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
