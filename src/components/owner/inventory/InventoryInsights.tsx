import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";
import { TrendingUp, BarChart3, PieChart, AlertTriangle, Lightbulb, Calculator } from "lucide-react";
import { VarianceTrendsChart } from "./insights/VarianceTrendsChart";
import { TopVarianceItemsTable } from "./insights/TopVarianceItemsTable";
import { VarianceBreakdownView } from "./insights/VarianceBreakdownView";
import { InventoryAlertsPanel } from "./insights/InventoryAlertsPanel";
import { ConsumptionVarianceAnalysis } from "./insights/ConsumptionVarianceAnalysis";

interface InventoryInsightsProps {
  restaurantId: string;
  branchId?: string;
}

export function InventoryInsights({ restaurantId, branchId }: InventoryInsightsProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("consumption");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Lightbulb className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{t("inv_insights")}</h2>
          <p className="text-sm text-muted-foreground">{t("inv_insights_desc")}</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-3xl grid-cols-5">
          <TabsTrigger value="consumption" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">{t("inv_consumption")}</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t("trends")}</span>
          </TabsTrigger>
          <TabsTrigger value="top-items" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">{t("top")}</span>
          </TabsTrigger>
          <TabsTrigger value="breakdown" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">{t("breakdown")}</span>
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="hidden sm:inline">{t("alerts")}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="consumption" className="mt-4">
          <ConsumptionVarianceAnalysis restaurantId={restaurantId} branchId={branchId} />
        </TabsContent>

        <TabsContent value="trends" className="mt-4">
          <VarianceTrendsChart restaurantId={restaurantId} branchId={branchId} />
        </TabsContent>

        <TabsContent value="top-items" className="mt-4">
          <TopVarianceItemsTable restaurantId={restaurantId} branchId={branchId} />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-4">
          <VarianceBreakdownView restaurantId={restaurantId} branchId={branchId} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <InventoryAlertsPanel restaurantId={restaurantId} branchId={branchId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
