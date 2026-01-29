/**
 * Cash Differences Card Component
 * Shows cash differences per cashier for closed shifts
 * Owner Dashboard only - read-only
 * Redesigned with calm green confirmation state when OK
 */

import { useState } from "react";
import { useCashDifferences } from "@/hooks/useCashDifferencesToday";
import { useLanguage } from "@/contexts/LanguageContext";
import { formatJOD, cn } from "@/lib/utils";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, Wallet, Info, CheckCircle, TrendingUp, TrendingDown, Minus, Calendar as CalendarIcon, HelpCircle } from "lucide-react";
import en from "@/locales/en";
import ar from "@/locales/ar";

const translations = { en, ar } as const;

interface CashDifferencesCardProps {
  restaurantId: string;
  currency?: string;
  compact?: boolean;
}

export function CashDifferencesCard({ restaurantId, currency = "JOD", compact = false }: CashDifferencesCardProps) {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const { data, isLoading } = useCashDifferences(restaurantId, selectedDate);

  if (isLoading) {
    return (
      <Card className="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 border">
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

  // Check if there are no differences (all OK)
  const hasNoDifference = data && data.closedShiftsCount > 0 && data.totalDifference === 0;
  const hasDifference = data && data.closedShiftsCount > 0 && data.totalDifference !== 0;

  // Determine card styling based on state
  const getCardStyle = () => {
    if (hasNoDifference) {
      // Calm green confirmation state
      return "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50";
    }
    if (hasDifference && data) {
      const absDiff = Math.abs(data.totalDifference);
      if (absDiff > 10) {
        // Significant difference - orange/amber warning
        return "bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800/50";
      }
      // Minor difference - light yellow
      return "bg-yellow-50/70 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800/50";
    }
    return "bg-muted/30 dark:bg-muted/10 border-border/50";
  };

  const getIconStyle = () => {
    if (hasNoDifference) return "bg-emerald-100 dark:bg-emerald-900/30";
    if (hasDifference && data && Math.abs(data.totalDifference) > 10) {
      return "bg-amber-100 dark:bg-amber-900/30";
    }
    return "bg-emerald-100 dark:bg-emerald-900/30";
  };

  const getIconColor = () => {
    if (hasNoDifference) return "text-emerald-600";
    if (hasDifference && data && Math.abs(data.totalDifference) > 10) {
      return "text-amber-600";
    }
    return "text-emerald-600";
  };

  return (
    <Card className={`border ${getCardStyle()}`}>
      <CardHeader className={compact ? "pb-2 pt-3 px-3" : "pb-3"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${compact ? "p-1" : "p-1.5"} rounded-full ${getIconStyle()}`}>
              {hasNoDifference ? (
                <CheckCircle className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${getIconColor()}`} />
              ) : (
                <Wallet className={`${compact ? "h-3.5 w-3.5" : "h-4 w-4"} ${getIconColor()}`} />
              )}
            </div>
            <div>
              <CardTitle className={`${compact ? "text-sm" : "text-base"}`}>
                {t.cash_diff_title}
              </CardTitle>
              {!compact && (
                <CardDescription className="text-xs mt-0.5">
                  {t.cash_diff_desc}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[220px]">
                  <p className="text-xs">{t.cash_diff_tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs bg-white/80 dark:bg-background border-current/20",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-3 w-3 ltr:mr-1 rtl:ml-1" />
                  {format(selectedDate, language === "ar" ? "d MMM" : "MMM d")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "space-y-2 px-3 pb-3" : "space-y-4"}>
        {/* Summary Section */}
        {data && data.closedShiftsCount > 0 ? (
          <>
            {/* Confirmation state when no difference */}
            {hasNoDifference ? (
              <div className={`flex items-center gap-3 ${compact ? "p-2" : "p-3"} bg-emerald-100/50 dark:bg-emerald-900/20 rounded-lg`}>
                <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                <div className="flex-1">
                  <p className={`${compact ? "text-sm" : "text-base"} font-semibold text-emerald-700 dark:text-emerald-400`}>
                    {language === "ar" ? "الحساب متطابق" : "Cash balanced"}
                  </p>
                  <p className={`${compact ? "text-[10px]" : "text-xs"} text-emerald-600/70`}>
                    {language === "ar" 
                      ? `${data.closedShiftsCount} وردية مغلقة - بدون فروقات`
                      : `${data.closedShiftsCount} closed shift${data.closedShiftsCount > 1 ? 's' : ''} - no differences`
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className={`flex items-center justify-between ${compact ? "p-2" : "p-3"} bg-white/50 dark:bg-background/30 rounded-lg`}>
                <div className="space-y-0.5">
                  <p className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{t.cash_diff_closed_shifts}</p>
                  <p className={`${compact ? "text-base" : "text-lg"} font-semibold`}>{data.closedShiftsCount}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <p className={`${compact ? "text-[10px]" : "text-xs"} text-muted-foreground`}>{t.cash_diff_total}</p>
                  <p className={`${compact ? "text-base" : "text-lg"} font-bold ${getDifferenceColor(data.totalDifference)}`}>
                    {data.totalDifference > 0 ? "+" : ""}
                    {formatJOD(data.totalDifference)} {currency}
                  </p>
                </div>
              </div>
            )}

            {/* Details Table - hide in compact mode if many rows */}
            {!compact && hasDifference && (
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
            )}
          </>
        ) : (
          <div className={`flex flex-col items-center justify-center ${compact ? "py-3" : "py-6"} text-center`}>
            <Wallet className={`${compact ? "h-5 w-5" : "h-6 w-6"} text-muted-foreground/40 mb-1.5`} />
            <p className={`${compact ? "text-xs" : "text-sm"} text-muted-foreground`}>{t.cash_diff_empty}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
