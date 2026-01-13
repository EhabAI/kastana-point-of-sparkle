// Kastana POS Assistant - Inventory Module Guard
// Provides inventory-disabled messaging for the AI assistant

/**
 * Keywords that indicate inventory-related questions
 */
const INVENTORY_KEYWORDS = {
  ar: [
    "مخزون", "مخازن", "جرد", "هدر", "فروقات", "variance", "stock", "استلام بضاعة",
    "نقل مخزون", "تسوية", "وحدة قياس", "كمية", "إعادة الطلب", "نقص", "فائض",
    "وصفة", "مكونات الصنف", "تكلفة الصنف", "recipe", "ingredients",
  ],
  en: [
    "inventory", "stock", "count", "waste", "variance", "transfer", "receive",
    "adjustment", "unit", "quantity", "reorder", "shortage", "surplus",
    "recipe", "ingredients", "item cost", "cogs",
  ],
};

/**
 * Check if a message is about inventory
 */
export function isInventoryRelatedQuery(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  
  const allKeywords = [...INVENTORY_KEYWORDS.ar, ...INVENTORY_KEYWORDS.en];
  return allKeywords.some((keyword) => lowerMessage.includes(keyword.toLowerCase()));
}

/**
 * Get the inventory disabled response message
 */
export function getInventoryDisabledMessage(language: "ar" | "en"): string {
  if (language === "ar") {
    return "إدارة المخزون غير مفعّلة لهذا المطعم. يمكن طلب تفعيلها من إدارة النظام.";
  }
  return "Inventory Management is not enabled for this restaurant. Please contact System Administration to enable it.";
}
