import { Separator } from "@/components/ui/separator";
import { formatJOD, getCurrencySymbol } from "@/lib/utils";
import { calculateOrderTotals } from "@/lib/orderCalculations";
import { useLanguage } from "@/contexts/LanguageContext";
import { ExplainTooltip } from "@/components/ui/explain-tooltip";
interface OrderTotalsProps {
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  taxRate: number;
  taxAmount: number;
  serviceCharge: number;
  total: number;
  currency: string;
  paidAmount?: number;
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
  paidAmount = 0,
}: OrderTotalsProps) {
  const { t, language } = useLanguage();
  const hasDiscount = discountValue && discountValue > 0;
  const localizedCurrency = getCurrencySymbol(currency, language);

  // Use shared calculation utility for consistent discount calculation
  const calculatedTotals = calculateOrderTotals({
    subtotal,
    discountType,
    discountValue,
    serviceChargeRate: 0, // Not used for display, already passed as serviceCharge
    taxRate: 0, // Not used for display, already passed as taxAmount
    currency,
  });
  const discountAmount = calculatedTotals.discountAmount;

  // Display label for discount - support both "percent" and "percentage"
  const isPercentDiscount = discountType === "percent" || discountType === "percentage";
  const discountLabel = hasDiscount
    ? isPercentDiscount
      ? `${discountValue}%`
      : formatJOD(discountAmount) + " " + localizedCurrency
    : null;

  // Calculate remaining amount
  const remaining = Math.max(0, total - paidAmount);
  const hasRemainingAmount = paidAmount > 0 && remaining > 0;

  return (
    <div className="space-y-2 text-sm w-full">
      <div className="flex justify-between">
        <span className="text-muted-foreground">{t("subtotal")}</span>
        <span>{formatJOD(subtotal)} {localizedCurrency}</span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between text-green-600">
          <span className="flex items-center gap-1">
            {t("discount")} ({discountLabel})
            <ExplainTooltip explainKey="discount" language={language} />
          </span>
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
        <span className="text-muted-foreground flex items-center gap-1">
          {t("tax")} ({(taxRate * 100).toFixed(0)}%)
          <ExplainTooltip explainKey="tax" language={language} />
        </span>
        <span>{formatJOD(taxAmount)} {localizedCurrency}</span>
      </div>


      <Separator />

      <div className="flex justify-between items-center text-lg font-bold">
        <span className="flex items-center gap-1">
          {t("total")}
          <ExplainTooltip explainKey="order_total" language={language} />
        </span>
        <span className="text-primary ltr:ml-2 rtl:mr-2">{formatJOD(total)} {localizedCurrency}</span>
      </div>

      {hasRemainingAmount && (
        <div className="flex justify-between items-center text-base font-semibold text-amber-600 dark:text-amber-400">
          <span>{t("remaining")}</span>
          <span>{formatJOD(remaining)} {localizedCurrency}</span>
        </div>
      )}
    </div>
  );
}
