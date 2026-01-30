import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { DateRange } from "../DateRangeFilter";
import { ReportFilters, ReportFilterValues } from "./ReportFilters";
import { ReportSection } from "./ReportSection";
import { exportToCSV } from "./utils/reportUtils";
import { CostingReportsSkeleton } from "./ReportSkeletons";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus, DollarSign, Package, Layers, Building2 } from "lucide-react";

interface CostingReportsProps {
  dateRange: DateRange;
}

interface ItemProfit {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

interface CategoryProfit {
  id: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

interface BranchProfit {
  id: string;
  name: string;
  revenue: number;
  cogs: number;
  profit: number;
  margin: number;
}

export function CostingReports({ dateRange }: CostingReportsProps) {
  const { t, language } = useLanguage();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const currencySymbol = language === "ar" ? "د.أ" : "JOD";

  const [filters, setFilters] = useState<ReportFilterValues>({});

  const { data, isLoading } = useQuery({
    queryKey: ["costing-reports", restaurant?.id, dateRange.from.toISOString(), dateRange.to.toISOString(), filters],
    queryFn: async () => {
      if (!restaurant?.id) return null;

      // Build base query for order items from paid orders
      let ordersQuery = supabase
        .from("orders")
        .select("id, branch_id")
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", dateRange.from.toISOString())
        .lt("created_at", dateRange.to.toISOString())
        .eq("status", "paid");

      if (filters.branchId) {
        ordersQuery = ordersQuery.eq("branch_id", filters.branchId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        return {
          grossSales: 0,
          totalCogs: 0,
          grossProfit: 0,
          profitMargin: 0,
          profitByItem: [],
          profitByCategory: [],
          profitByBranch: [],
        };
      }

      const orderIds = orders.map(o => o.id);
      const orderBranchMap = new Map(orders.map(o => [o.id, o.branch_id]));

      // Get order items with cogs and profit (price is used instead of total_price)
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("id, order_id, menu_item_id, quantity, price, cogs, profit, voided")
        .in("order_id", orderIds)
        .eq("voided", false);

      if (itemsError) throw itemsError;

      // Get menu items with categories
      const menuItemIds = [...new Set((orderItems || []).map(i => i.menu_item_id).filter(Boolean) as string[])];
      let menuItemMap = new Map<string, { name: string; categoryId: string; categoryName: string }>();

      if (menuItemIds.length > 0) {
        const { data: menuItems } = await supabase
          .from("menu_items")
          .select("id, name, category_id, menu_categories(id, name)")
          .in("id", menuItemIds);

        menuItemMap = new Map(
          (menuItems || []).map((m: any) => [
            m.id,
            {
              name: m.name,
              categoryId: m.category_id,
              categoryName: (m.menu_categories as any)?.name || t("uncategorized"),
            },
          ])
        );
      }

      // Get branches
      const branchIds = [...new Set(orders.map(o => o.branch_id).filter(Boolean))];
      let branchMap = new Map<string, string>();

      if (branchIds.length > 0) {
        const { data: branches } = await supabase
          .from("restaurant_branches")
          .select("id, name")
          .in("id", branchIds);

        branchMap = new Map(branches?.map(b => [b.id, b.name]) || []);
      }

      // Calculate totals
      let grossSales = 0;
      let totalCogs = 0;

      // Aggregate by item
      const itemAgg: Record<string, ItemProfit> = {};
      // Aggregate by category
      const categoryAgg: Record<string, CategoryProfit> = {};
      // Aggregate by branch
      const branchAgg: Record<string, BranchProfit> = {};

      for (const item of orderItems || []) {
        // Use price * quantity as revenue (price is per-unit)
        const unitPrice = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        const revenue = unitPrice * quantity;
        const cogs = Number(item.cogs) || 0;
        const profit = Number(item.profit) || 0;

        grossSales += revenue;
        totalCogs += cogs;

        // By Item
        if (item.menu_item_id) {
          const menuInfo = menuItemMap.get(item.menu_item_id);
          const itemName = menuInfo?.name || t("unknown_item");
          
          if (!itemAgg[item.menu_item_id]) {
            itemAgg[item.menu_item_id] = {
              id: item.menu_item_id,
              name: itemName,
              quantity: 0,
              revenue: 0,
              cogs: 0,
              profit: 0,
              margin: 0,
            };
          }
          itemAgg[item.menu_item_id].quantity += quantity;
          itemAgg[item.menu_item_id].revenue += revenue;
          itemAgg[item.menu_item_id].cogs += cogs;
          itemAgg[item.menu_item_id].profit += profit;

          // By Category
          const catId = menuInfo?.categoryId || "uncategorized";
          const catName = menuInfo?.categoryName || t("uncategorized");

          if (!categoryAgg[catId]) {
            categoryAgg[catId] = {
              id: catId,
              name: catName,
              revenue: 0,
              cogs: 0,
              profit: 0,
              margin: 0,
            };
          }
          categoryAgg[catId].revenue += revenue;
          categoryAgg[catId].cogs += cogs;
          categoryAgg[catId].profit += profit;
        }

        // By Branch
        const branchId = orderBranchMap.get(item.order_id);
        if (branchId) {
          const branchName = branchMap.get(branchId) || t("unknown_branch");

          if (!branchAgg[branchId]) {
            branchAgg[branchId] = {
              id: branchId,
              name: branchName,
              revenue: 0,
              cogs: 0,
              profit: 0,
              margin: 0,
            };
          }
          branchAgg[branchId].revenue += revenue;
          branchAgg[branchId].cogs += cogs;
          branchAgg[branchId].profit += profit;
        }
      }

      // Calculate margins
      const calcMargin = (revenue: number, cogs: number) => 
        revenue > 0 ? ((revenue - cogs) / revenue) * 100 : 0;

      const profitByItem = Object.values(itemAgg)
        .map(item => ({ ...item, margin: calcMargin(item.revenue, item.cogs) }))
        .sort((a, b) => b.profit - a.profit);

      const profitByCategory = Object.values(categoryAgg)
        .map(cat => ({ ...cat, margin: calcMargin(cat.revenue, cat.cogs) }))
        .sort((a, b) => b.profit - a.profit);

      const profitByBranch = Object.values(branchAgg)
        .map(branch => ({ ...branch, margin: calcMargin(branch.revenue, branch.cogs) }))
        .sort((a, b) => b.profit - a.profit);

      const grossProfit = grossSales - totalCogs;
      const profitMargin = grossSales > 0 ? (grossProfit / grossSales) * 100 : 0;

      return {
        grossSales,
        totalCogs,
        grossProfit,
        profitMargin,
        profitByItem,
        profitByCategory,
        profitByBranch,
      };
    },
    enabled: !!restaurant?.id,
  });

  const handleExportOverview = () => {
    if (!data) return;
    const exportData = [
      { [t("metric")]: t("gross_sales"), [t("value")]: data.grossSales },
      { [t("metric")]: t("total_cogs"), [t("value")]: data.totalCogs },
      { [t("metric")]: t("gross_profit"), [t("value")]: data.grossProfit },
      { [t("metric")]: t("profit_margin_percent"), [t("value")]: `${data.profitMargin.toFixed(2)}%` },
    ];
    exportToCSV(exportData, "costing_overview");
  };

  const handleExportByItem = () => {
    if (!data?.profitByItem) return;
    const exportData = data.profitByItem.map(item => ({
      [t("item_name")]: item.name,
      [t("quantity_sold")]: item.quantity,
      [t("revenue")]: item.revenue,
      [t("cogs")]: item.cogs,
      [t("profit")]: item.profit,
      [t("margin_percent")]: `${item.margin.toFixed(2)}%`,
    }));
    exportToCSV(exportData, "profit_by_item");
  };

  const handleExportByCategory = () => {
    if (!data?.profitByCategory) return;
    const exportData = data.profitByCategory.map(cat => ({
      [t("category")]: cat.name,
      [t("revenue")]: cat.revenue,
      [t("cogs")]: cat.cogs,
      [t("profit")]: cat.profit,
      [t("margin_percent")]: `${cat.margin.toFixed(2)}%`,
    }));
    exportToCSV(exportData, "profit_by_category");
  };

  const handleExportByBranch = () => {
    if (!data?.profitByBranch) return;
    const exportData = data.profitByBranch.map(branch => ({
      [t("branch")]: branch.name,
      [t("revenue")]: branch.revenue,
      [t("cogs")]: branch.cogs,
      [t("profit")]: branch.profit,
      [t("margin_percent")]: `${branch.margin.toFixed(2)}%`,
    }));
    exportToCSV(exportData, "profit_by_branch");
  };

  const MarginBadge = ({ margin }: { margin: number }) => {
    if (margin > 30) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <TrendingUp className="h-3 w-3" />
          {margin.toFixed(1)}%
        </span>
      );
    }
    if (margin < 10) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
          <TrendingDown className="h-3 w-3" />
          {margin.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
        <Minus className="h-3 w-3" />
        {margin.toFixed(1)}%
      </span>
    );
  };

  if (isLoading) {
    return <CostingReportsSkeleton />;
  }

  const hasNoData = !data || (data.grossSales === 0 && data.profitByItem.length === 0);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ReportFilters
        filters={filters}
        onFiltersChange={setFilters}
        showBranch
        onExportCSV={handleExportOverview}
      />

      <div id="costing-report-content" className="space-y-8">
        {/* Costing Overview */}
        <ReportSection title={t("costing_overview")} icon={<DollarSign className="h-4 w-4" />}>
          {hasNoData ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("no_costing_data")}</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("gross_sales")}</p>
                <p className="text-xl font-bold text-foreground tabular-nums mt-1">
                  {formatJOD(data?.grossSales || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span>
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("total_cogs")}</p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tabular-nums mt-1">
                  {formatJOD(data?.totalCogs || 0)} <span className="text-sm font-normal">{currencySymbol}</span>
                </p>
              </div>
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs text-primary uppercase tracking-wide font-medium">{t("gross_profit")}</p>
                <p className={`text-xl font-bold tabular-nums mt-1 ${(data?.grossProfit || 0) >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                  {formatJOD(data?.grossProfit || 0)} <span className="text-sm font-normal text-muted-foreground">{currencySymbol}</span>
                </p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("profit_margin")}</p>
                <div className="mt-1">
                  <MarginBadge margin={data?.profitMargin || 0} />
                </div>
              </div>
            </div>
          )}
        </ReportSection>

        {/* Profit by Item */}
        <ReportSection 
          title={t("profit_by_item")} 
          icon={<Package className="h-4 w-4" />}
          onExport={handleExportByItem}
        >
          {!data?.profitByItem || data.profitByItem.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("no_item_profit_data")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("item_name")}</TableHead>
                    <TableHead className="text-right">{t("quantity_sold")}</TableHead>
                    <TableHead className="text-right">{t("revenue")}</TableHead>
                    <TableHead className="text-right">{t("cogs")}</TableHead>
                    <TableHead className="text-right">{t("profit")}</TableHead>
                    <TableHead className="text-right">{t("margin")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.profitByItem.slice(0, 20).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatJOD(item.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">{formatJOD(item.cogs)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${item.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatJOD(item.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <MarginBadge margin={item.margin} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {data.profitByItem.length > 20 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {t("showing_top_20_of")} {data.profitByItem.length} {t("items")}
                </p>
              )}
            </div>
          )}
        </ReportSection>

        {/* Profit by Category */}
        <ReportSection 
          title={t("profit_by_category")} 
          icon={<Layers className="h-4 w-4" />}
          onExport={handleExportByCategory}
        >
          {!data?.profitByCategory || data.profitByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("no_category_profit_data")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead className="text-right">{t("revenue")}</TableHead>
                    <TableHead className="text-right">{t("cogs")}</TableHead>
                    <TableHead className="text-right">{t("profit")}</TableHead>
                    <TableHead className="text-right">{t("margin")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.profitByCategory.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell className="font-medium">{cat.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatJOD(cat.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">{formatJOD(cat.cogs)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${cat.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatJOD(cat.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <MarginBadge margin={cat.margin} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportSection>

        {/* Profit by Branch */}
        <ReportSection 
          title={t("profit_by_branch")} 
          icon={<Building2 className="h-4 w-4" />}
          onExport={handleExportByBranch}
        >
          {!data?.profitByBranch || data.profitByBranch.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t("no_branch_profit_data")}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("branch")}</TableHead>
                    <TableHead className="text-right">{t("revenue")}</TableHead>
                    <TableHead className="text-right">{t("cogs")}</TableHead>
                    <TableHead className="text-right">{t("profit")}</TableHead>
                    <TableHead className="text-right">{t("margin")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.profitByBranch.map((branch) => (
                    <TableRow key={branch.id}>
                      <TableCell className="font-medium">{branch.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatJOD(branch.revenue)}</TableCell>
                      <TableCell className="text-right tabular-nums text-amber-600 dark:text-amber-400">{formatJOD(branch.cogs)}</TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${branch.profit >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                        {formatJOD(branch.profit)}
                      </TableCell>
                      <TableCell className="text-right">
                        <MarginBadge margin={branch.margin} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ReportSection>
      </div>
    </div>
  );
}
