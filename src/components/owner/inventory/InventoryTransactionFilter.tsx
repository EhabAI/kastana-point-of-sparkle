import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Filter } from "lucide-react";

// All known transaction types that can be filtered
export const FILTERABLE_TXN_TYPES = [
  "PURCHASE_RECEIPT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "WASTE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "STOCK_COUNT_ADJUSTMENT",
  "INITIAL_STOCK",
  "SALE_DEDUCTION",
  "REFUND_RESTORATION",
] as const;

export type FilterableTxnType = typeof FILTERABLE_TXN_TYPES[number] | "ALL";

interface InventoryTransactionFilterProps {
  value: FilterableTxnType;
  onChange: (value: FilterableTxnType) => void;
  className?: string;
}

export function InventoryTransactionFilter({
  value,
  onChange,
  className,
}: InventoryTransactionFilterProps) {
  const { t } = useLanguage();

  // Map transaction types to translation keys
  const getLabel = (type: string): string => {
    const key = `inv_txn_${type.toLowerCase()}`;
    const translated = t(key);
    // Fallback if translation not found
    return translated === key ? t("inv_txn_unknown") : translated;
  };

  return (
    <div className={className}>
      <Select value={value} onValueChange={(v) => onChange(v as FilterableTxnType)}>
        <SelectTrigger className="w-[180px] h-9">
          <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder={t("inv_filter_type")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">{t("inv_filter_all")}</SelectItem>
          {FILTERABLE_TXN_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {getLabel(type)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
