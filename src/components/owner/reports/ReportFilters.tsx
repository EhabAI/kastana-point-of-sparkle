import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useCashiers } from "@/hooks/useCashiers";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { Download, Printer, X } from "lucide-react";

export interface ReportFilterValues {
  branchId?: string;
  cashierId?: string;
  paymentMethod?: string;
  orderType?: string;
}

interface ReportFiltersProps {
  filters: ReportFilterValues;
  onFiltersChange: (filters: ReportFilterValues) => void;
  showBranch?: boolean;
  showCashier?: boolean;
  showPaymentMethod?: boolean;
  showOrderType?: boolean;
  onExportCSV?: () => void;
  onPrint?: () => void;
}

export function ReportFilters({
  filters,
  onFiltersChange,
  showBranch = false,
  showCashier = false,
  showPaymentMethod = false,
  showOrderType = false,
  onExportCSV,
  onPrint,
}: ReportFiltersProps) {
  const { t } = useLanguage();
  const { selectedRestaurant: restaurant } = useRestaurantContextSafe();
  const { data: branches = [] } = useBranches(restaurant?.id);
  const { data: cashiers = [] } = useCashiers(restaurant?.id);

  const paymentMethods = [
    { value: "cash", label: t("cash") },
    { value: "visa", label: t("visa") },
    { value: "mastercard", label: t("mastercard") },
    { value: "card", label: t("card") },
    { value: "efawateer", label: t("efawateer") },
    { value: "wallet", label: t("wallet") },
  ];

  const orderTypes = [
    { value: "dine_in", label: t("dine_in") },
    { value: "takeaway", label: t("takeaway") },
  ];

  const hasAnyFilter = filters.branchId || filters.cashierId || filters.paymentMethod || filters.orderType;
  const showMultipleBranches = branches.length > 1;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1 bg-muted/20 rounded-lg border border-border/30">
      {/* Branch Filter */}
      {showBranch && showMultipleBranches && (
        <Select
          value={filters.branchId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, branchId: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[140px] h-8 text-xs bg-background">
            <SelectValue placeholder={t("all_branches")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_branches")}</SelectItem>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Cashier Filter */}
      {showCashier && (
        <Select
          value={filters.cashierId || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, cashierId: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
            <SelectValue placeholder={t("all_cashiers")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_cashiers")}</SelectItem>
            {cashiers.map((cashier) => (
              <SelectItem key={cashier.user_id} value={cashier.user_id}>
                {cashier.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Payment Method Filter */}
      {showPaymentMethod && (
        <Select
          value={filters.paymentMethod || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, paymentMethod: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[130px] h-8 text-xs bg-background">
            <SelectValue placeholder={t("all_methods")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_methods")}</SelectItem>
            {paymentMethods.map((method) => (
              <SelectItem key={method.value} value={method.value}>
                {method.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Order Type Filter */}
      {showOrderType && (
        <Select
          value={filters.orderType || "all"}
          onValueChange={(value) =>
            onFiltersChange({ ...filters, orderType: value === "all" ? undefined : value })
          }
        >
          <SelectTrigger className="w-[120px] h-8 text-xs bg-background">
            <SelectValue placeholder={t("all_types")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("all_types")}</SelectItem>
            {orderTypes.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Clear Filters */}
      {hasAnyFilter && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs gap-1">
          <X className="h-3 w-3" />
          {t("clear_filters")}
        </Button>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Export & Print Actions */}
      {onExportCSV && (
        <Button variant="outline" size="sm" onClick={onExportCSV} className="h-8 px-3 text-xs gap-1.5">
          <Download className="h-3.5 w-3.5" />
          {t("export_csv")}
        </Button>
      )}
      {onPrint && (
        <Button variant="outline" size="sm" onClick={onPrint} className="h-8 px-3 text-xs gap-1.5">
          <Printer className="h-3.5 w-3.5" />
          {t("print")}
        </Button>
      )}
    </div>
  );
}
