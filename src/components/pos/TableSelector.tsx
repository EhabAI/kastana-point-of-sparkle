import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BranchTable } from "@/hooks/pos/useBranchTables";
import { useLanguage } from "@/contexts/LanguageContext";

interface TableSelectorProps {
  tables: BranchTable[];
  selectedTableId: string | null;
  onSelectTable: (tableId: string) => void;
  isLoading?: boolean;
}

export function TableSelector({
  tables,
  selectedTableId,
  onSelectTable,
  isLoading,
}: TableSelectorProps) {
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        {t("no_tables_configured")}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[240px]">
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5 p-1.5">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => !table.hasOpenOrder && onSelectTable(table.id)}
            disabled={table.hasOpenOrder}
            className={cn(
              "flex flex-col items-center justify-center px-2 py-2.5 rounded-md border transition-all min-h-[56px]",
              selectedTableId === table.id
                ? "border-primary bg-primary/10 ring-2 ring-primary"
                : table.hasOpenOrder
                ? "border-orange-400/40 bg-orange-500/10 cursor-not-allowed opacity-60"
                : "border-border hover:border-primary hover:bg-primary/5"
            )}
          >
            <span className="font-bold text-sm leading-tight">{table.table_name}</span>
            <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground/70 mt-0.5">
              <Users className="h-2.5 w-2.5" />
              <span>{table.capacity || 4}</span>
            </div>
            {table.hasOpenOrder && (
              <span className="text-[9px] text-orange-600 font-medium leading-tight">{t("busy")}</span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
