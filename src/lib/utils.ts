import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format monetary value for JOD currency (3 decimal places, HALF-UP rounding)
 * @param value - The numeric value to format
 * @returns Formatted string with exactly 3 decimal places
 */
export function formatJOD(value: number): string {
  // Use HALF-UP rounding to 3 decimal places
  const rounded = Math.round(value * 1000) / 1000;
  return rounded.toFixed(3);
}
