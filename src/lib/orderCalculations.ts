/**
 * Shared order calculation utilities for Kastana POS
 * Used across POS, QR Order, Receipt, Payments, Z Report, and Refunds
 * 
 * CALCULATION ORDER (MANDATORY):
 * subtotal → discount → discountedSubtotal → tax → totalBeforeRounding → finalTotal (rounded)
 * 
 * ROUNDING RULE (JOD - ONE DECIMAL):
 * Apply rounding ONLY on final total using: Math.round(value * 10) / 10
 */

/**
 * Round to 3 decimal places (JOD standard for line items)
 */
export function roundJOD(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Round final total to 1 decimal place (Jordan market requirement)
 * Examples: 6.67 → 6.7, 6.64 → 6.6, 6.65 → 6.7
 */
export function roundFinalTotal(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface OrderTotalsInput {
  subtotal: number;
  discountType?: string | null;
  discountValue?: number | null;
  serviceChargeRate: number;
  taxRate: number;
  currency: string;
}

export interface OrderTotalsResult {
  subtotal: number;
  discountAmount: number;
  discountedSubtotal: number;
  serviceCharge: number;
  taxAmount: number;
  totalBeforeRounding: number;
  total: number;
}

/**
 * Calculate all order totals using the correct accounting flow:
 * 1. Discount is applied ONLY on subtotal (before tax)
 * 2. Tax is calculated ONLY after discount
 * 3. Rounding is applied ONLY once, at the very end, on the final total
 * 
 * @param input - Order calculation inputs
 * @returns Calculated totals
 */
export function calculateOrderTotals(input: OrderTotalsInput): OrderTotalsResult {
  const { 
    subtotal, 
    discountType, 
    discountValue, 
    serviceChargeRate, 
    taxRate, 
    currency 
  } = input;

  // Step 1: Calculate discount amount (applied on subtotal only)
  // Support both "percent"/"percentage" for compatibility
  let discountAmount = 0;
  if (discountValue && Number(discountValue) > 0) {
    const numValue = Number(discountValue);
    if (discountType === "percent" || discountType === "percentage") {
      discountAmount = subtotal * (numValue / 100);
    } else {
      discountAmount = numValue;
    }
  }
  
  // Round discount to JOD precision
  discountAmount = roundJOD(discountAmount);

  // Step 2: Calculate discounted subtotal (never below 0)
  const discountedSubtotal = Math.max(0, roundJOD(subtotal - discountAmount));

  // Step 3: Calculate service charge (on discounted subtotal)
  const serviceCharge = roundJOD(discountedSubtotal * serviceChargeRate);

  // Step 4: Calculate tax (on discounted subtotal + service charge)
  const taxAmount = roundJOD((discountedSubtotal + serviceCharge) * taxRate);

  // Step 5: Calculate total before rounding
  const totalBeforeRounding = roundJOD(discountedSubtotal + serviceCharge + taxAmount);

  // Step 6: Apply final rounding ONLY for JOD (one decimal place)
  const total = currency === "JOD" ? roundFinalTotal(totalBeforeRounding) : totalBeforeRounding;

  return {
    subtotal,
    discountAmount,
    discountedSubtotal,
    serviceCharge,
    taxAmount,
    totalBeforeRounding,
    total,
  };
}
