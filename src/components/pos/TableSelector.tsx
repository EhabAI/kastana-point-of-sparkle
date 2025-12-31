import { cn } from "@/lib/utils";
import { Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { BranchTable } from "@/hooks/pos/useBranchTables";

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
        No tables configured for this branch
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px]">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2">
        {tables.map((table) => (
          <button
            key={table.id}
            onClick={() => !table.hasOpenOrder && onSelectTable(table.id)}
            disabled={table.hasOpenOrder}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-lg border transition-all min-h-[80px]",
              selectedTableId === table.id
                ? "border-primary bg-primary/10 ring-2 ring-primary"
                : table.hasOpenOrder
                ? "border-orange-500/50 bg-orange-500/10 cursor-not-allowed"
                : "border-border hover:border-primary hover:bg-primary/5"
            )}
          >
            <span className="font-bold text-lg">{table.table_name}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Users className="h-3 w-3" />
              <span>{table.capacity || 4}</span>
            </div>
            {table.hasOpenOrder && (
              <span className="text-xs text-orange-600 mt-1 font-medium">Busy</span>
            )}
          </button>
        ))}
      </div>
    </ScrollArea>
  );
}
