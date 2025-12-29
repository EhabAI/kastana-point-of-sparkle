import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRestaurants } from "@/hooks/useRestaurants";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock } from "lucide-react";

interface ShiftWithCashier {
  id: string;
  cashier_id: string;
  opened_at: string;
  closed_at: string | null;
  status: string;
  opening_cash: number;
  cashier_email: string | null;
}

export function ShiftsView() {
  const { data: restaurants } = useRestaurants();
  const restaurantId = restaurants?.[0]?.id;

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["owner-shifts", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from("shifts")
        .select(`
          id,
          cashier_id,
          opened_at,
          closed_at,
          status,
          opening_cash
        `)
        .eq("restaurant_id", restaurantId)
        .order("opened_at", { ascending: false });

      if (error) throw error;

      // Fetch cashier emails separately
      const cashierIds = [...new Set(data.map((s) => s.cashier_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email")
        .in("id", cashierIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p.email]) || []);

      return data.map((shift) => ({
        ...shift,
        cashier_email: profileMap.get(shift.cashier_id) || null,
      })) as ShiftWithCashier[];
    },
    enabled: !!restaurantId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Shifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Shifts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {shifts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No shifts yet.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cashier</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Ended</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Opening Cash</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
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
                      {Number(shift.opening_cash).toFixed(2)} JOD
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
