import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useLanguage } from "@/contexts/LanguageContext";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useState } from "react";
import { exportToCSV, getPaginatedData, getTotalPages } from "./utils/reportUtils";

export interface DrillDownColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}

interface DrillDownDialogProps<T> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  data: T[];
  columns: DrillDownColumn<T>[];
  pageSize?: number;
  exportFilename?: string;
}

export function DrillDownDialog<T extends object>({
  open,
  onOpenChange,
  title,
  data,
  columns,
  pageSize = 10,
  exportFilename,
}: DrillDownDialogProps<T>) {
  const { t } = useLanguage();
  const [page, setPage] = useState(1);

  const totalPages = getTotalPages(data.length, pageSize);
  const paginatedData = getPaginatedData(data, { page, pageSize });

  const handleExport = () => {
    if (!exportFilename) return;
    const exportData = data.map((item) => {
      const row: Record<string, unknown> = {};
      columns.forEach((col) => {
        const key = col.key as string;
        row[col.header] = (item as Record<string, unknown>)[key];
      });
      return row;
    });
    exportToCSV(exportData, exportFilename);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title}</DialogTitle>
            {exportFilename && (
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
                <Download className="h-3.5 w-3.5" />
                {t("export_csv")}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto min-h-0">
          {data.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              {t("no_data_available")}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col, idx) => (
                    <TableHead
                      key={idx}
                      className={col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""}
                    >
                      {col.header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedData.map((item, rowIdx) => (
                  <TableRow key={rowIdx}>
                    {columns.map((col, colIdx) => {
                      const value = col.render
                        ? col.render(item)
                        : (item[col.key as keyof T] as React.ReactNode);
                      return (
                        <TableCell
                          key={colIdx}
                          className={`${col.className || ""} ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : ""
                          }`}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
            <p className="text-sm text-muted-foreground">
              {t("showing")} {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, data.length)} {t("of")} {data.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {t("page")} {page} {t("of")} {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
