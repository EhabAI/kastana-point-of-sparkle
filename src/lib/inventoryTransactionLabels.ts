/**
 * Inventory Transaction Label Utility
 * Provides human-readable labels for inventory transaction types
 * with fallback for unknown types.
 */

// Known transaction types for type safety
export const KNOWN_TXN_TYPES = [
  "PURCHASE_RECEIPT",
  "ADJUSTMENT_IN",
  "ADJUSTMENT_OUT",
  "ADJUSTMENT",
  "WASTE",
  "TRANSFER_OUT",
  "TRANSFER_IN",
  "TRANSFER",
  "STOCK_COUNT_ADJUSTMENT",
  "INITIAL_STOCK",
  "INITIAL_STOCK_IMPORT",
  "SALE",
  "SALE_DEDUCTION",
  "REFUND_RESTORATION",
] as const;

export type KnownTxnType = typeof KNOWN_TXN_TYPES[number];

// Color coding for transaction types
export const TXN_TYPE_COLORS: Record<string, string> = {
  PURCHASE_RECEIPT: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  ADJUSTMENT_IN: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ADJUSTMENT_OUT: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  ADJUSTMENT: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  WASTE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  TRANSFER_OUT: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  TRANSFER_IN: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  TRANSFER: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  STOCK_COUNT_ADJUSTMENT: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  INITIAL_STOCK: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  INITIAL_STOCK_IMPORT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  SALE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  SALE_DEDUCTION: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REFUND_RESTORATION: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
};

/**
 * Get the translation key for a transaction type
 * Returns fallback key if type is unknown
 */
export function getTxnTypeTranslationKey(txnType: string): string {
  const normalizedType = txnType.toLowerCase();
  const key = `inv_txn_${normalizedType}`;
  return key;
}

/**
 * Get human-readable label for a transaction type
 * Uses the translation function with fallback to unknown type
 */
export function getInventoryTxnLabel(
  txnType: string,
  t: (key: string) => string
): string {
  const key = getTxnTypeTranslationKey(txnType);
  const translated = t(key);
  
  // If translation returns the key itself (not found), use fallback
  if (translated === key || translated.startsWith("inv_txn_")) {
    return t("inv_txn_unknown");
  }
  
  return translated;
}

/**
 * Get color class for a transaction type
 * Returns empty string for unknown types
 */
export function getTxnTypeColor(txnType: string): string {
  return TXN_TYPE_COLORS[txnType.toUpperCase()] || "";
}
