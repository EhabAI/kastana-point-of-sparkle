import { Separator } from "@/components/ui/separator";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface OrderTotalsProps {
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  currency: string;
}

export function OrderTotals({
  subtotal,
  discountType,
  discountValue,
  taxRate,
  taxAmount,
  serviceCharge,
  total,
  currency,
}: OrderTotalsProps) {
  const { t } = useLanguage();
  const hasDiscount = discountValue && discountValue > 0;

  // Calculate actual discount amount
  const discountAmount = hasDiscount
    ? discountType === "percentage"
      ? (subtotal * Number(discountValue)) / 100
      : Number(discountValue)
    : 0;

  // Display label for discount
  const discountLabel = hasDiscount
    ? discountType === "percentage"
      ? `${discountValue}%`
      : formatJOD(discountAmount) + " " + currency
    : null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span>{formatJOD(subtotal)} {currency}</span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between text-green-600">
          <span>{t("discount")} ({discountLabel})</span>
          <span>-{formatJOD(discountAmount)} {currency}</span>
        </div>
      )}

      {serviceCharge > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("service_charge")}</span>
          <span>{formatJOD(serviceCharge)} {currency}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("tax")} ({(taxRate * 100).toFixed(0)}%)</span>
        <span>{formatJOD(taxAmount)} {currency}</span>
      </div>

      <Separator />

      <div className="flex justify-between text-lg font-bold">
        <span>{t("total")}</span>
        <span className="text-primary">{formatJOD(total)} {currency}</span>
      </div>
    </div>
  );
}
