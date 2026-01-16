/**
 * Owner Dashboard Centralized Error Handler
 * Converts raw error.message / Supabase errors into business-friendly bilingual messages.
 */

interface OwnerErrorResult {
  title: string;
  description?: string;
}

/**
 * Maps raw errors to business-friendly, bilingual messages for Owner Dashboard.
 * NEVER shows raw error.message, SQL, RLS/Policy wording, or stack traces.
 */
export function getOwnerErrorMessage(
  error: unknown,
  t: (key: string) => string
): OwnerErrorResult {
  // Default fallback
  const defaultResult: OwnerErrorResult = {
    title: t("error_unexpected_owner_title"),
    description: t("error_unexpected_owner_desc"),
  };

  if (!error) return defaultResult;

  // Extract error message
  let message = "";
  let code = "";

  if (typeof error === "string") {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || "";
  } else if (typeof error === "object" && error !== null) {
    const errorObj = error as Record<string, unknown>;
    message = (errorObj.message as string) || (errorObj.error as string) || "";
    code = (errorObj.code as string) || "";
  }

  const lowerMessage = message.toLowerCase();

  // Specific branch deletion errors
  if (message === "ACTIVE_CASHIERS" || lowerMessage.includes("active_cashiers")) {
    return {
      title: t("error_owner_branch_active_cashiers_title"),
      description: t("error_owner_branch_active_cashiers_desc"),
    };
  }

  if (message === "OPEN_SHIFTS" || lowerMessage.includes("open_shifts")) {
    return {
      title: t("error_owner_branch_open_shifts_title"),
      description: t("error_owner_branch_open_shifts_desc"),
    };
  }

  // Permission / RLS errors
  if (
    code === "42501" ||
    lowerMessage.includes("policy") ||
    lowerMessage.includes("rls") ||
    lowerMessage.includes("denied") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("not allowed") ||
    lowerMessage.includes("unauthorized") ||
    lowerMessage.includes("access denied")
  ) {
    return {
      title: t("error_owner_permission_title"),
      description: t("error_owner_permission_desc"),
    };
  }

  // Duplicate / already exists errors
  if (
    lowerMessage.includes("duplicate key") ||
    lowerMessage.includes("already exists") ||
    lowerMessage.includes("unique constraint") ||
    lowerMessage.includes("already registered")
  ) {
    return {
      title: t("error_owner_duplicate_title"),
      description: t("error_owner_duplicate_desc"),
    };
  }

  // Not found errors
  if (
    lowerMessage.includes("not found") ||
    lowerMessage.includes("no rows") ||
    lowerMessage.includes("does not exist")
  ) {
    return {
      title: t("error_owner_not_found_title"),
      description: t("error_owner_not_found_desc"),
    };
  }

  // Network / connection errors
  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("failed to fetch") ||
    lowerMessage.includes("connection") ||
    lowerMessage.includes("timeout") ||
    lowerMessage.includes("econnrefused") ||
    lowerMessage.includes("offline")
  ) {
    return {
      title: t("error_owner_network_title"),
      description: t("error_owner_network_desc"),
    };
  }

  // Restaurant mismatch
  if (
    lowerMessage.includes("restaurant mismatch") ||
    lowerMessage.includes("wrong restaurant") ||
    lowerMessage.includes("restaurant_id")
  ) {
    return {
      title: t("error_owner_restaurant_mismatch_title"),
      description: t("error_owner_restaurant_mismatch_desc"),
    };
  }

  // Default: unexpected error
  return defaultResult;
}
