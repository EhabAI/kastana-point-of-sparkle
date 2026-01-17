import { Separator } from "@/components/ui/separator";
import { formatJOD, getCurrencySymbol } from "@/lib/utils";
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
  roundingAdjustment?: number;
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
  roundingAdjustment = 0,
}: OrderTotalsProps) {
  const { t, language } = useLanguage();
  const hasDiscount = discountValue && discountValue > 0;
  const localizedCurrency = getCurrencySymbol(currency, language);

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
      : formatJOD(discountAmount) + " " + localizedCurrency
    : null;

  const hasRounding = roundingAdjustment > 0.0001;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span>{formatJOD(subtotal)} {localizedCurrency}</span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between text-green-600">
          <span>{t("discount")} ({discountLabel})</span>
          <span>-{formatJOD(discountAmount)} {localizedCurrency}</span>
        </div>
      )}

      {serviceCharge > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">{t("service_charge")}</span>
          <span>{formatJOD(serviceCharge)} {localizedCurrency}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("tax")} ({(taxRate * 100).toFixed(0)}%)</span>
        <span>{formatJOD(taxAmount)} {localizedCurrency}</span>
      </div>

      {hasRounding && (
        <div className="flex justify-between text-muted-foreground text-xs">
          <span>{t("rounding_adjustment")}</span>
          <span>+{formatJOD(roundingAdjustment)} {localizedCurrency}</span>
        </div>
      )}

      <Separator />

      <div className="flex justify-between items-center text-lg font-bold">
        <span>{t("total")}</span>
        <span className="text-primary ltr:ml-2 rtl:mr-2">{formatJOD(total)} {localizedCurrency}</span>
      </div>
    </div>
  );
}
