import { useBranchContext } from "@/contexts/BranchContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BranchSelectorProps {
  showWarning?: boolean;
}

export function BranchSelector({ showWarning = true }: BranchSelectorProps) {
  const { branches, selectedBranch, setSelectedBranchId, isLoading, isBranchSelected } = useBranchContext();

  if (isLoading) {
    return (
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (branches.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">الفرع:</span>
      </div>
      
      <Select
        value={selectedBranch?.id || ""}
        onValueChange={setSelectedBranchId}
      >
        <SelectTrigger className="w-56 bg-background">
          <SelectValue placeholder="اختر الفرع" />
        </SelectTrigger>
        <SelectContent>
          {branches.map((branch) => (
            <SelectItem key={branch.id} value={branch.id}>
              <div className="flex items-center gap-2">
                <span>{branch.name}</span>
                {branch.is_default && (
                  <Badge variant="secondary" className="text-xs">افتراضي</Badge>
                )}
                {!branch.is_active && (
                  <Badge variant="destructive" className="text-xs">معطل</Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showWarning && !isBranchSelected && (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">اختر الفرع أولاً</span>
        </div>
      )}
    </div>
  );
}
