import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useVarianceTrends, useVarianceSummary } from "@/hooks/useInventoryInsights";
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ReferenceLine } from "recharts";
import { TrendingUp, TrendingDown, Calendar, BarChart3 } from "lucide-react";
import { format, parseISO, Locale } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface VarianceTrendsChartProps {
  restaurantId: string;
  branchId?: string;
}

export function VarianceTrendsChart({ restaurantId, branchId }: VarianceTrendsChartProps) {
  const { t, language, isRTL } = useLanguage();
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");
  const [days, setDays] = useState(30);

  const { data: trends = [], isLoading } = useVarianceTrends(restaurantId, granularity, days, branchId);
  const { data: summary } = useVarianceSummary(restaurantId, days, branchId);

  const dateLocale = language === "ar" ? ar : enUS;

  // Transform data for chart - aggregate across branches for main chart
  const chartData = trends.reduce((acc, point) => {
    const existing = acc.find((d) => d.period === point.period);
    if (existing) {
      existing.positive += point.positiveVariance;
      existing.negative += point.negativeVariance;
      existing.net += point.netVariance;
    } else {
      acc.push({
        period: point.period,
        positive: point.positiveVariance,
        negative: point.negativeVariance,
        net: point.netVariance,
        label: formatPeriodLabel(point.period, granularity, dateLocale),
      });
    }
    return acc;
  }, [] as { period: string; positive: number; negative: number; net: number; label: string }[]);

  // Get unique branches for filtering
  const branches = [...new Set(trends.map((t) => t.branchName))];

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          title={t("inv_total_overage")}
          value={summary?.totalPositiveVariance || 0}
          icon={<TrendingUp className="h-4 w-4 text-green-500" />}
          variant="positive"
        />
        <SummaryCard
          title={t("inv_total_shortage")}
          value={summary?.totalNegativeVariance || 0}
          icon={<TrendingDown className="h-4 w-4 text-red-500" />}
          variant="negative"
        />
        <SummaryCard
          title={t("inv_net_variance")}
          value={summary?.netVariance || 0}
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          variant="neutral"
        />
        <SummaryCard
          title={t("inv_counts_approved")}
          value={summary?.stockCountsApproved || 0}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          variant="count"
          suffix={t("counts")}
        />
      </div>

      {/* Chart Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <CardTitle className="text-base">{t("inv_variance_over_time")}</CardTitle>
              <CardDescription>{t("inv_variance_over_time_desc")}</CardDescription>
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
              <Select value={granularity} onValueChange={(v) => setGranularity(v as "daily" | "weekly")}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("daily")}</SelectItem>
                  <SelectItem value="weekly">{t("weekly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-40" />
              <span className="text-sm">{t("inv_no_variance_data")}</span>
              <span className="text-xs mt-1">{t("inv_no_variance_data_hint")}</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  reversed={isRTL}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  orientation={isRTL ? "right" : "left"}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar
                  dataKey="positive"
                  name={t("overage")}
                  fill="hsl(var(--chart-2))"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="negative"
                  name={t("shortage")}
                  fill="hsl(var(--chart-1))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Branch Breakdown */}
      {branches.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("inv_variance_by_branch")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => {
                const branchData = trends.filter((t) => t.branchName === branch);
                const totalPositive = branchData.reduce((sum, t) => sum + t.positiveVariance, 0);
                const totalNegative = branchData.reduce((sum, t) => sum + t.negativeVariance, 0);
                return (
                  <div
                    key={branch}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="font-medium text-sm mb-2">{branch}</div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600">+{totalPositive.toFixed(2)}</span>
                      <span className="text-red-600">-{totalNegative.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  variant,
  suffix,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant: "positive" | "negative" | "neutral" | "count";
  suffix?: string;
}) {
  const bgColor = {
    positive: "bg-green-500/10",
    negative: "bg-red-500/10",
    neutral: "bg-primary/10",
    count: "bg-muted",
  }[variant];

  const textColor = {
    positive: "text-green-600",
    negative: "text-red-600",
    neutral: "text-primary",
    count: "text-foreground",
  }[variant];

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bgColor}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground truncate">{title}</div>
            <div className={`text-lg font-semibold ${textColor}`}>
              {variant === "count" ? value : value.toFixed(2)}
              {suffix && <span className="text-xs font-normal ms-1">{suffix}</span>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPeriodLabel(period: string, granularity: "daily" | "weekly", locale: Locale): string {
  if (granularity === "weekly") {
    // Format: "2024-W05" -> "W5"
    const match = period.match(/W(\d+)$/);
    return match ? `W${parseInt(match[1])}` : period;
  }
  try {
    const date = parseISO(period);
    return format(date, "dd/MM", { locale });
  } catch {
    return period;
  }
}
