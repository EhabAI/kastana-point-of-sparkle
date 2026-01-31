/**
 * Owner Context Guard for Edge Functions
 * 
 * This module provides validation functions for ensuring that all Owner-scoped
 * edge function calls include valid restaurant_id and branch_id context.
 */

export interface OwnerContextValidation {
  isValid: boolean;
  restaurantId: string | null;
  branchId: string | null;
  error?: {
    code: string;
    messageEn: string;
    messageAr: string;
  };
}

/**
 * Validates that both restaurant_id and branch_id are provided in the request body.
 * 
 * @param body - The request body containing restaurant_id and branch_id
 * @returns Validation result with context IDs or error
 */
export function validateOwnerContext(body: Record<string, unknown>): OwnerContextValidation {
  const restaurantId = body?.restaurant_id as string | undefined | null;
  const branchId = body?.branch_id as string | undefined | null;

  // Check for missing restaurant_id
  if (!restaurantId || typeof restaurantId !== "string" || restaurantId.trim() === "") {
    return {
      isValid: false,
      restaurantId: null,
      branchId: branchId || null,
      error: {
        code: "missing_restaurant_context",
        messageEn: "Restaurant context is missing",
        messageAr: "سياق المطعم غير محدد",
      },
    };
  }

  // Check for missing branch_id
  if (!branchId || typeof branchId !== "string" || branchId.trim() === "") {
    return {
      isValid: false,
      restaurantId,
      branchId: null,
      error: {
        code: "missing_branch_context",
        messageEn: "Branch context is missing",
        messageAr: "سياق الفرع غير محدد",
      },
    };
  }

  return {
    isValid: true,
    restaurantId,
    branchId,
  };
}

/**
 * Creates a standardized error response for missing context.
 * 
 * @param validation - The validation result from validateOwnerContext
 * @param corsHeaders - CORS headers to include in the response
 * @returns Response object with 400 status
 */
export function createContextErrorResponse(
  validation: OwnerContextValidation,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: validation.error?.code || "context_missing",
      message_en: validation.error?.messageEn || "Restaurant or branch context is missing",
      message_ar: validation.error?.messageAr || "سياق المطعم أو الفرع غير محدد",
    }),
    {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
}

/**
 * UUID validation helper
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Full validation including UUID format check
 */
export function validateOwnerContextStrict(body: Record<string, unknown>): OwnerContextValidation {
  const basicValidation = validateOwnerContext(body);
  
  if (!basicValidation.isValid) {
    return basicValidation;
  }

  // Validate UUID format for restaurant_id
  if (!isValidUUID(basicValidation.restaurantId!)) {
    return {
      isValid: false,
      restaurantId: basicValidation.restaurantId,
      branchId: basicValidation.branchId,
      error: {
        code: "invalid_restaurant_id",
        messageEn: "Invalid restaurant ID format",
        messageAr: "صيغة معرف المطعم غير صالحة",
      },
    };
  }

  // Validate UUID format for branch_id
  if (!isValidUUID(basicValidation.branchId!)) {
    return {
      isValid: false,
      restaurantId: basicValidation.restaurantId,
      branchId: basicValidation.branchId,
      error: {
        code: "invalid_branch_id",
        messageEn: "Invalid branch ID format",
        messageAr: "صيغة معرف الفرع غير صالحة",
      },
    };
  }

  return basicValidation;
}
