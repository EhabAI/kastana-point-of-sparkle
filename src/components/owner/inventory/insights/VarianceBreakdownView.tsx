import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVarianceBreakdown, VarianceByReason } from "@/hooks/useInventoryInsights";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { PieChart as PieIcon, ShoppingCart, Trash2, RotateCcw, ClipboardCheck, Package } from "lucide-react";

interface VarianceBreakdownViewProps {
  restaurantId: string;
  branchId?: string;
}

const REASON_COLORS: Record<VarianceByReason["reason"], string> = {
  USAGE: "hsl(var(--chart-1))",
  WASTE: "hsl(var(--chart-2))",
  REFUND: "hsl(var(--chart-3))",
  ADJUSTMENT: "hsl(var(--chart-4))",
};

const REASON_ICONS: Record<VarianceByReason["reason"], React.ReactNode> = {
  USAGE: <ShoppingCart className="h-4 w-4" />,
  WASTE: <Trash2 className="h-4 w-4" />,
  REFUND: <RotateCcw className="h-4 w-4" />,
  ADJUSTMENT: <ClipboardCheck className="h-4 w-4" />,
};

export function VarianceBreakdownView({ restaurantId, branchId }: VarianceBreakdownViewProps) {
  const { t, language } = useLanguage();
  const [days, setDays] = useState(30);

  const { data: breakdowns = [], isLoading } = useVarianceBreakdown(restaurantId, days, branchId);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === "ar" ? "ar-JO" : "en-JO", {
      style: "currency",
      currency: "JOD",
      minimumFractionDigits: 3,
    }).format(value);
  };

  // Aggregate across all branches for summary
  const aggregated = breakdowns.reduce(
    (acc, branch) => {
      branch.breakdown.forEach((b) => {
        const existing = acc.find((a) => a.reason === b.reason);
        if (existing) {
          existing.totalQty += b.totalQty;
          existing.totalValue += b.totalValue;
          existing.transactionCount += b.transactionCount;
        } else {
          acc.push({ ...b });
        }
      });
      return acc;
    },
    [] as VarianceByReason[]
  );

  const chartData = aggregated.map((a) => ({
    name: t(`inv_reason_${a.reason.toLowerCase()}`),
    value: a.totalQty,
    reason: a.reason,
  }));

  const totalQty = aggregated.reduce((sum, a) => sum + a.totalQty, 0);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex justify-end">
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
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
      ) : aggregated.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Package className="h-12 w-12 mb-4 opacity-40" />
            <span className="text-sm">{t("inv_no_breakdown_data")}</span>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Pie Chart */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PieIcon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t("inv_breakdown_by_reason")}</CardTitle>
                  <CardDescription>{t("inv_breakdown_by_reason_desc")}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartData.map((entry) => (
                      <Cell
                        key={entry.reason}
                        fill={REASON_COLORS[entry.reason as VarianceByReason["reason"]]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => [value.toFixed(2), t("quantity")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Breakdown Cards */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("inv_reason_details")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {aggregated.map((a) => {
                  const percentage = totalQty > 0 ? (a.totalQty / totalQty) * 100 : 0;
                  return (
                    <div
                      key={a.reason}
                      className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded"
                            style={{ backgroundColor: REASON_COLORS[a.reason] + "20" }}
                          >
                            {REASON_ICONS[a.reason]}
                          </div>
                          <span className="font-medium text-sm">
                            {t(`inv_reason_${a.reason.toLowerCase()}`)}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-muted-foreground">{t("inv_qty_label")}</div>
                          <div className="font-mono font-medium">{a.totalQty.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t("inv_value_label")}</div>
                          <div className="font-mono font-medium">
                            {a.totalValue > 0 ? formatCurrency(a.totalValue) : "—"}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">{t("inv_transactions_label")}</div>
                          <div className="font-mono font-medium">{a.transactionCount}</div>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: REASON_COLORS[a.reason],
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Per-Branch Breakdown */}
      {breakdowns.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("inv_breakdown_by_branch")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {breakdowns.map((branch) => (
                <div key={branch.branchId} className="p-4 rounded-lg border bg-card">
                  <div className="font-medium text-sm mb-3">{branch.branchName}</div>
                  <div className="space-y-2">
                    {branch.breakdown.map((b) => (
                      <div key={b.reason} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: REASON_COLORS[b.reason] }}
                          />
                          <span>{t(`inv_reason_${b.reason.toLowerCase()}`)}</span>
                        </div>
                        <span className="font-mono">{b.totalQty.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
