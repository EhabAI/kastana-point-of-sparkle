import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Round monetary value for JOD currency (3 decimal places, HALF-UP rounding)
 * @param value - The numeric value to round
 * @returns Number rounded to exactly 3 decimal places
 */
export function roundJOD(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Round to nearest 5 fils (0.005) for JOD cash handling using INTEGER math
 * to avoid floating-point precision bugs.
 * @param value - The numeric value to round
 * @returns Number rounded to nearest 0.005
 */
export function roundTo5Fils(value: number): number {
  // Step 1: Convert to fils (integer)
  const totalFils = Math.round(value * 1000);
  // Step 2: Round to nearest 5 fils
  const roundedFils = Math.round(totalFils / 5) * 5;
  // Step 3: Convert back to JOD
  return roundedFils / 1000;
}

/**
 * Round UP to nearest 50 fils (0.05 JOD) for CASH payments only.
 * Jordan market requirement: cash payable amounts round UP.
 * Example: 6.670 -> 6.700
 * @param value - The numeric value to round
 * @returns Number rounded UP to nearest 0.05
 */
export function roundUpTo50Fils(value: number): number {
  // Step 1: Convert to fils (integer)
  const totalFils = Math.round(value * 1000);
  // Step 2: Round UP to nearest 50 fils
  const payableFils = Math.ceil(totalFils / 50) * 50;
  // Step 3: Convert back to JOD
  return payableFils / 1000;
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
