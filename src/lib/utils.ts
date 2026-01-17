import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Round monetary value for JOD currency (3 decimal places, HALF-UP rounding)
 * @deprecated Use roundJOD from '@/lib/orderCalculations' instead
 * @param value - The numeric value to round
 * @returns Number rounded to exactly 3 decimal places
 */
export function roundJOD(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Jordan-style final total rounding.
 * Rule: Look at the SECOND digit after decimal point (X.XY):
 * - Y = 1-4: round DOWN to X.X0
 * - Y = 5: keep X.X5
 * - Y = 6-9: round UP to X.(X+1)0
 * 
 * Examples: 6.61→6.60, 6.65→6.65, 6.67→6.70
 * 
 * @param value - The numeric value to round
 * @returns Number rounded per Jordan decimal rule
 */
export function roundJordanFinal(value: number): number {
  // Multiply by 100 to work with the first two decimal places
  const hundredths = Math.round(value * 100);
  const lastDigit = hundredths % 10;
  
  let rounded: number;
  if (lastDigit >= 1 && lastDigit <= 4) {
    // Round down to X.X0
    rounded = Math.floor(hundredths / 10) * 10;
  } else if (lastDigit >= 6 && lastDigit <= 9) {
    // Round up to X.(X+1)0
    rounded = Math.ceil(hundredths / 10) * 10;
  } else {
    // lastDigit === 0 or 5, keep as is
    rounded = hundredths;
  }
  
  return rounded / 100;
}

/**
 * Format monetary value for JOD currency (3 decimal places, HALF-UP rounding)
 * @param value - The numeric value to format
 * @returns Formatted string with exactly 3 decimal places
 */
export function formatJOD(value: number): string {
  return roundJOD(value).toFixed(3);
}

/**
 * Get localized currency symbol based on language
 * @param currency - The currency code (e.g., "JOD")
 * @param language - The language code ("en" or "ar")
 * @returns Localized currency symbol
 */
export function getCurrencySymbol(currency: string, language: string): string {
  if (currency === "JOD") {
    return language === "ar" ? "د.أ" : "JOD";
  }
  return currency;
}
