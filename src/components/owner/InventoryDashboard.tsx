import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useLowStockItems,
  useNearReorderItems,
  useRecentTransactions,
  useWasteSummary,
} from "@/hooks/useInventoryDashboard";
import { InventoryItemsList, OperationsToolbar } from "./inventory";
import { RecipeBuilder } from "./recipes";
import { AlertTriangle, PackageX, RefreshCw, Trash2, Package, LayoutDashboard, List, ChefHat } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface InventoryDashboardProps {
  restaurantId: string;
  isReadOnly?: boolean;
}

const txnTypeColors: Record<string, string> = {
  PURCHASE_RECEIPT: "bg-green-500/10 text-green-600 dark:text-green-400",
  ADJUSTMENT_IN: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ADJUSTMENT_OUT: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  WASTE: "bg-red-500/10 text-red-600 dark:text-red-400",
  TRANSFER_OUT: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  TRANSFER_IN: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  STOCK_COUNT_ADJUSTMENT: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
};

export function InventoryDashboard({ restaurantId, isReadOnly = false }: InventoryDashboardProps) {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              {t("inv_dashboard")}
            </TabsTrigger>
            <TabsTrigger value="items" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              {t("inv_items")}
            </TabsTrigger>
            <TabsTrigger value="recipes" className="flex items-center gap-2">
              <ChefHat className="h-4 w-4" />
              {t("recipes")}
            </TabsTrigger>
          </TabsList>
          <OperationsToolbar restaurantId={restaurantId} isReadOnly={isReadOnly} />
        </div>

        <TabsContent value="dashboard" className="mt-4">
          <DashboardWidgets restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="items" className="mt-4">
          <InventoryItemsList restaurantId={restaurantId} isReadOnly={isReadOnly} />
        </TabsContent>

        <TabsContent value="recipes" className="mt-4">
          <RecipeBuilder restaurantId={restaurantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DashboardWidgets({ restaurantId }: { restaurantId: string }) {
  const { t, language } = useLanguage();
  const { data: lowStockItems = [], isLoading: loadingLow } = useLowStockItems(restaurantId);
  const { data: nearReorderItems = [], isLoading: loadingReorder } = useNearReorderItems(restaurantId);
  const { data: recentTransactions = [], isLoading: loadingTx } = useRecentTransactions(restaurantId);
  const { data: wasteSummary = [], isLoading: loadingWaste } = useWasteSummary(restaurantId);

  const dateLocale = language === "ar" ? ar : enUS;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Low Stock Items */}
      <Card className="shadow-card hover-lift cursor-pointer transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base">{t("inv_low_stock")}</CardTitle>
              <CardDescription className="text-xs">{t("inv_low_stock_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingLow ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <span className="text-sm">{t("inv_no_low_stock")}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {lowStockItems.slice(0, 5).map((item) => (
                <div
                  key={`${item.itemId}-${item.branchId}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground">{item.branchName}</span>
                  </div>
                  <Badge variant="destructive" className="text-xs">
                    {item.onHandBase} {item.unitName}
                  </Badge>
                </div>
              ))}
              {lowStockItems.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{lowStockItems.length - 5} {t("more")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Near Reorder Items */}
      <Card className="shadow-card hover-lift cursor-pointer transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-warning/10">
              <RefreshCw className="h-4 w-4 text-warning" />
            </div>
            <div>
              <CardTitle className="text-base">{t("inv_near_reorder")}</CardTitle>
              <CardDescription className="text-xs">{t("inv_near_reorder_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingReorder ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : nearReorderItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <span className="text-sm">{t("inv_no_reorder_needed")}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {nearReorderItems.slice(0, 5).map((item) => (
                <div
                  key={`${item.itemId}-${item.branchId}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-warning/5 border border-warning/20"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{item.itemName}</span>
                    <span className="text-xs text-muted-foreground">{item.branchName}</span>
                  </div>
                  <Badge className="bg-warning/10 text-warning border-warning/30 text-xs">
                    {item.onHandBase} {item.unitName}
                  </Badge>
                </div>
              ))}
              {nearReorderItems.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{nearReorderItems.length - 5} {t("more")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card className="shadow-card hover-lift cursor-pointer transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <PackageX className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{t("inv_recent_transactions")}</CardTitle>
              <CardDescription className="text-xs">{t("inv_recent_transactions_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Package className="h-8 w-8 mb-2 opacity-40" />
              <span className="text-sm">{t("inv_no_transactions")}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50"
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${txnTypeColors[tx.txnType] || ""}`}
                      >
                        {t(`inv_txn_${tx.txnType.toLowerCase()}`)}
                      </Badge>
                      <span className="text-sm font-medium">{tx.itemName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {tx.branchName} •{" "}
                      {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true, locale: dateLocale })}
                    </span>
                  </div>
                  <span className="text-sm font-medium tabular-nums">
                    {tx.qty > 0 ? "+" : ""}
                    {tx.qty} {tx.unitName}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Waste Summary */}
      <Card className="shadow-card hover-lift cursor-pointer transition-all">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Trash2 className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-base">{t("inv_waste_summary")}</CardTitle>
              <CardDescription className="text-xs">{t("inv_waste_summary_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingWaste ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : wasteSummary.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Trash2 className="h-8 w-8 mb-2 opacity-40" />
              <span className="text-sm">{t("inv_no_waste")}</span>
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {wasteSummary.slice(0, 5).map((item) => (
                <div
                  key={item.itemId}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-500/5 border border-red-500/20"
                >
                  <span className="text-sm font-medium">{item.itemName}</span>
                  <Badge variant="outline" className="text-xs text-red-500 border-red-500/30">
                    -{item.totalWaste} {item.unitName}
                  </Badge>
                </div>
              ))}
              {wasteSummary.length > 5 && (
                <div className="text-xs text-muted-foreground text-center pt-1">
                  +{wasteSummary.length - 5} {t("more")}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
