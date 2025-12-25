import { Separator } from "@/components/ui/separator";

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
  const hasDiscount = discountValue && discountValue > 0;
  const discountDisplay = hasDiscount
    ? discountType === "percentage"
      ? `${discountValue}%`
      : `${Number(discountValue).toFixed(2)} ${currency}`
    : null;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between">
        <span className="text-muted-foreground">Subtotal</span>
        <span>{subtotal.toFixed(2)} {currency}</span>
      </div>

      {hasDiscount && (
        <div className="flex justify-between text-green-600">
          <span>Discount ({discountDisplay})</span>
          <span>-{Number(discountValue).toFixed(2)} {currency}</span>
        </div>
      )}

      {serviceCharge > 0 && (
        <div className="flex justify-between">
          <span className="text-muted-foreground">Service Charge</span>
          <span>{serviceCharge.toFixed(2)} {currency}</span>
        </div>
      )}

      <div className="flex justify-between">
        <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
        <span>{taxAmount.toFixed(2)} {currency}</span>
      </div>

      <Separator />

      <div className="flex justify-between text-lg font-bold">
        <span>Total</span>
        <span className="text-primary">{total.toFixed(2)} {currency}</span>
      </div>
    </div>
  );
}
