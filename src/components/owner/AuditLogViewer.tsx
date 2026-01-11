import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string;
  created_at: string;
  details: Record<string, unknown> | null;
}

const PAGE_SIZE = 20;

export function AuditLogViewer() {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { logs: data as AuditLog[], total: count || 0 };
    },
  });

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatEntityType = (entityType: string) => {
    return entityType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="shadow-card hover-lift">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="h-5 w-5" />
          {t("audit_logs")}
        </CardTitle>
        <CardDescription>{t("audit_logs_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">{t("no_audit_logs")}</p>
          </div>
        ) : (
          <>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("action")}</TableHead>
                    <TableHead>{t("entity")}</TableHead>
                    <TableHead>{t("timestamp")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">
                        {formatAction(log.action)}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {formatEntityType(log.entity_type)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {format(new Date(log.created_at), "yyyy-MM-dd HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {t("showing")} {page * PAGE_SIZE + 1} {t("to")} {Math.min((page + 1) * PAGE_SIZE, total)} {t("of")} {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {t("page")} {page + 1} {t("of")} {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
