/**
 * Cash Differences Card Component
 * Shows cash differences per cashier for closed shifts today
 * Owner Dashboard only - read-only
 */

import { useCashDifferencesToday } from "@/hooks/useCashDifferencesToday";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Loader2, Wallet, Info, AlertTriangle, TrendingUp, TrendingDown, Minus } from "lucide-react";
import en from "@/locales/en";
import ar from "@/locales/ar";

const translations = { en, ar } as const;

interface CashDifferencesCardProps {
  restaurantId: string;
  currency?: string;
}

export function CashDifferencesCard({ restaurantId, currency = "JOD" }: CashDifferencesCardProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  
  const { data, isLoading } = useCashDifferencesToday(restaurantId);

  if (isLoading) {
    return (
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 border h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Wallet className="h-4 w-4 text-emerald-600" />
            </div>
            {t.cash_diff_title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const getDifferenceColor = (diff: number) => {
    if (diff > 0) return "text-green-600 dark:text-green-400";
    if (diff < 0) return "text-red-600 dark:text-red-400";
    return "text-muted-foreground";
  };

  const getDifferenceIcon = (diff: number) => {
    if (diff > 0) return <TrendingUp className="h-3.5 w-3.5" />;
    if (diff < 0) return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  const getDifferenceLabel = (diff: number) => {
    if (diff > 0) return t.cash_diff_excess;
    if (diff < 0) return t.cash_diff_shortage;
    return null;
  };

  const extractUsername = (email: string) => {
    if (!email || email === "Unknown") return email;
    return email.split("@")[0];
  };

  return (
    <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Wallet className="h-4 w-4 text-emerald-600" />
              </div>
              {t.cash_diff_title}
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              {t.cash_diff_desc}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Section */}
        {data && data.closedShiftsCount > 0 ? (
          <>
            <div className="flex items-center justify-between p-3 bg-emerald-100/50 dark:bg-emerald-900/20 rounded-lg">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{t.cash_diff_closed_shifts}</p>
                <p className="text-lg font-semibold">{data.closedShiftsCount}</p>
              </div>
              <div className="text-right space-y-0.5">
                <p className="text-xs text-muted-foreground">{t.cash_diff_total}</p>
                <p className={`text-lg font-bold ${getDifferenceColor(data.totalDifference)}`}>
                  {data.totalDifference > 0 ? "+" : ""}
                  {formatJOD(data.totalDifference)} {currency}
                </p>
              </div>
            </div>

            {/* Details Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t.cash_diff_username}</TableHead>
                    <TableHead className="text-xs">{t.cash_diff_shift_id}</TableHead>
                    <TableHead className="text-xs text-right">{t.cash_diff_expected}</TableHead>
                    <TableHead className="text-xs text-right">{t.cash_diff_actual}</TableHead>
                    <TableHead className="text-xs text-right">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 cursor-help">
                              {t.cash_diff_difference}
                              <Info className="h-3 w-3 text-muted-foreground" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p className="text-xs">{t.cash_diff_tooltip}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.map((row) => (
                    <TableRow key={row.shiftId}>
                      <TableCell className="text-sm font-medium">
                        {extractUsername(row.cashierEmail)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {row.shiftId.slice(0, 8)}...
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatJOD(row.expectedCash)} {currency}
                      </TableCell>
                      <TableCell className="text-sm text-right">
                        {formatJOD(row.actualCash)} {currency}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className={`text-sm font-medium ${getDifferenceColor(row.difference)}`}>
                            {row.difference > 0 ? "+" : ""}
                            {formatJOD(row.difference)} {currency}
                          </span>
                          {row.difference !== 0 && (
                            <Badge 
                              variant={row.difference < 0 ? "destructive" : "default"}
                              className={`text-[10px] px-1.5 py-0 ${
                                row.difference > 0 
                                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100" 
                                  : ""
                              }`}
                            >
                              {getDifferenceIcon(row.difference)}
                              <span className="ml-1">{getDifferenceLabel(row.difference)}</span>
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">{t.cash_diff_empty}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
