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
 * Format monetary value for JOD currency (3 decimal places, HALF-UP rounding)
 * @param value - The numeric value to format
 * @returns Formatted string with exactly 3 decimal places
 */
export function formatJOD(value: number): string {
  return roundJOD(value).toFixed(3);
}
