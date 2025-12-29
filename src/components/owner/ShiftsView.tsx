import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, ChevronDown, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { DateRangeFilter, DateRange, DateRangePreset, getDateRangeForPreset } from "./DateRangeFilter";

interface ShiftWithCashier {
  id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  opening_cash: number;
  closing_cash: number | null;
  cashier_email: string | null;
}

const ITEMS_PER_PAGE = 10;

export function ShiftsView() {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: settings } = useOwnerRestaurantSettings();
  const currency = settings?.currency || "JOD";
  const restaurantId = restaurant?.id;

  const [isOpen, setIsOpen] = useState(true);
  const [preset, setPreset] = useState<DateRangePreset>("this_month");
  const [dateRange, setDateRange] = useState<DateRange>(getDateRangeForPreset("this_month"));
  const [currentPage, setCurrentPage] = useState(1);

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ["owner-shifts", restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      if (!restaurantId) return { shifts: [], total: 0 };

      const { data, error, count } = await supabase
        .from("shifts")
        .select(`
          id,
          cashier_id,
          opened_at,
          closed_at,
          status,
          opening_cash,
          closing_cash
        `, { count: "exact" })
        .eq("restaurant_id", restaurantId)
        .gte("opened_at", dateRange.from.toISOString())
        .lt("opened_at", dateRange.to.toISOString())
        .order("opened_at", { ascending: false });

      if (error) throw error;

      // Fetch cashier emails separately
      const cashierIds = [...new Set(data.map((s) => s.cashier_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds.length > 0 ? cashierIds : ["00000000-0000-0000-0000-000000000000"]);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      const shifts = data.map((shift) => ({
        ...shift,
        cashier_email: profileMap.get(shift.cashier_id) || null,
      })) as ShiftWithCashier[];

      return { shifts, total: count || 0 };
    },
    enabled: !!restaurantId,
  });

  const shifts = shiftsData?.shifts || [];
  const totalShifts = shiftsData?.total || 0;
  const totalPages = Math.ceil(totalShifts / ITEMS_PER_PAGE);
  const paginatedShifts = shifts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDateRangeChange = (range: DateRange) => {
    setDateRange(range);
    setCurrentPage(1);
  };

  const exportToCSV = () => {
    const headers = ["Cashier", "Started", "Ended", "Status", "Opening Cash", "Closing Cash"];
    const rows = shifts.map(shift => [
      shift.cashier_email || "Unknown",
      format(new Date(shift.opened_at), "PPp"),
      shift.closed_at ? format(new Date(shift.closed_at), "PPp") : "—",
      shift.status,
      `${Number(shift.opening_cash).toFixed(2)} ${currency}`,
      shift.closing_cash ? `${Number(shift.closing_cash).toFixed(2)} ${currency}` : "—",
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shifts_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDateRangeLabel = () => {
    if (preset === "today") return "Today";
    if (preset === "yesterday") return "Yesterday";
    if (preset === "this_week") return "This Week";
    if (preset === "this_month") return "This Month";
    if (preset === "last_7_days") return "Last 7 Days";
    if (preset === "last_30_days") return "Last 30 Days";
    return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d, yyyy")}`;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Shifts
                    <span className="text-muted-foreground font-normal">({totalShifts})</span>
                  </CardTitle>
                  <CardDescription>{getDateRangeLabel()}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Button variant="outline" size="sm" onClick={exportToCSV} disabled={isLoading || shifts.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Date Range Filter */}
            <DateRangeFilter
              dateRange={dateRange}
              onDateRangeChange={handleDateRangeChange}
              preset={preset}
              onPresetChange={setPreset}
            />

            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : shifts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No shifts found for this period.
              </div>
            ) : (
              <>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cashier</TableHead>
                        <TableHead>Started</TableHead>
                        <TableHead>Ended</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Opening Cash</TableHead>
                        <TableHead className="text-right">Closing Cash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium">
                            {shift.cashier_email || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {format(new Date(shift.opened_at), "PPp")}
                          </TableCell>
                          <TableCell>
                            {shift.closed_at
                              ? format(new Date(shift.closed_at), "PPp")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={shift.status === "open" ? "default" : "secondary"}
                            >
                              {shift.status === "open" ? "Open" : "Closed"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {Number(shift.opening_cash).toFixed(2)} {currency}
                          </TableCell>
                          <TableCell className="text-right">
                            {shift.closing_cash 
                              ? `${Number(shift.closing_cash).toFixed(2)} ${currency}`
                              : "—"
                            }
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalShifts)} of {totalShifts} shifts
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm">
                        Page {currentPage} of {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
