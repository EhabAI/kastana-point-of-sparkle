import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";
import { FinancialReports } from "./reports/FinancialReports";
import { OrdersReports } from "./reports/OrdersReports";
import { MenuReports } from "./reports/MenuReports";
import { StaffReports } from "./reports/StaffReports";
import { OperationsReports } from "./reports/OperationsReports";
import { BranchReports } from "./reports/BranchReports";
import { CostingReports } from "./reports/CostingReports";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { DollarSign, ShoppingCart, UtensilsCrossed, Users, Settings2, Building2, Calculator } from "lucide-react";

export function ReportsModule() {
  const { selectedBranch } = useBranchContextSafe();
  const { t } = useLanguage();
  const [preset, setPreset] = useState<DateRangePreset>("today");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("today"));

  return (
    <div className="space-y-4">
      {/* Module description */}
      <p className="text-sm text-muted-foreground">
        {t("module_desc_reports")}
      </p>
      {/* Date Filter */}
      <DateRangeFilter
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        preset={preset}
        onPresetChange={setPreset}
      />

      {/* Report Sub-tabs */}
      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="financial" className="flex items-center gap-1.5 text-xs">
            <DollarSign className="h-3.5 w-3.5" />
            {t("financial") || "Financial"}
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex items-center gap-1.5 text-xs">
            <ShoppingCart className="h-3.5 w-3.5" />
            {t("orders") || "Orders"}
          </TabsTrigger>
          <TabsTrigger value="menu" className="flex items-center gap-1.5 text-xs">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            {t("menu") || "Menu"}
          </TabsTrigger>
          <TabsTrigger value="staff" className="flex items-center gap-1.5 text-xs">
            <Users className="h-3.5 w-3.5" />
            {t("staff") || "Staff"}
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-1.5 text-xs">
            <Settings2 className="h-3.5 w-3.5" />
            {t("operations") || "Operations"}
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-1.5 text-xs">
            <Building2 className="h-3.5 w-3.5" />
            {t("branches") || "Branches"}
          </TabsTrigger>
          <TabsTrigger value="costing" className="flex items-center gap-1.5 text-xs">
            <Calculator className="h-3.5 w-3.5" />
            {t("costing_profit") || "Costing & Profit"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="mt-4">
          <FinancialReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrdersReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
        <TabsContent value="menu" className="mt-4">
          <MenuReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
        <TabsContent value="staff" className="mt-4">
          <StaffReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
        <TabsContent value="operations" className="mt-4">
          <OperationsReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
        <TabsContent value="branches" className="mt-4">
          <BranchReports dateRange={dateRange} />
        </TabsContent>
        <TabsContent value="costing" className="mt-4">
          <CostingReports dateRange={dateRange} branchId={selectedBranch?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
