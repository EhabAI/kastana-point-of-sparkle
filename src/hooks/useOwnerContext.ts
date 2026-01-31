import { useMemo } from "react";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";

export interface OwnerContextState {
  restaurantId: string | null;
  branchId: string | null;
  restaurantName: string | null;
  branchName: string | null;
  isContextReady: boolean;
  isLoading: boolean;
  contextMissing: "restaurant" | "branch" | "both" | null;
}

/**
 * Custom hook that provides unified Owner context validation.
 * 
 * This hook ensures that both restaurant and branch are selected before
 * allowing any Owner operations (create, edit, delete, import, etc.).
 * 
 * Usage:
 * ```tsx
 * const { restaurantId, branchId, isContextReady, contextMissing } = useOwnerContext();
 * 
 * if (!isContextReady) {
 *   return <OwnerContextGuard contextMissing={contextMissing} />;
 * }
 * 
 * // Proceed with operations using restaurantId and branchId
 * ```
 */
export function useOwnerContext(): OwnerContextState {
  const { selectedRestaurant, isLoading: restaurantLoading } = useRestaurantContextSafe();
  const { selectedBranch, isLoading: branchLoading } = useBranchContextSafe();

  return useMemo(() => {
    const restaurantId = selectedRestaurant?.id ?? null;
    const branchId = selectedBranch?.id ?? null;
    const restaurantName = selectedRestaurant?.name ?? null;
    const branchName = selectedBranch?.name ?? null;
    const isLoading = restaurantLoading || branchLoading;

    // Determine what context is missing
    let contextMissing: "restaurant" | "branch" | "both" | null = null;
    if (!restaurantId && !branchId) {
      contextMissing = "both";
    } else if (!restaurantId) {
      contextMissing = "restaurant";
    } else if (!branchId) {
      contextMissing = "branch";
    }

    const isContextReady = Boolean(restaurantId && branchId);

    return {
      restaurantId,
      branchId,
      restaurantName,
      branchName,
      isContextReady,
      isLoading,
      contextMissing,
    };
  }, [selectedRestaurant, selectedBranch, restaurantLoading, branchLoading]);
}

/**
 * Validates that a branch belongs to the selected restaurant.
 * Used for additional security validation before operations.
 */
export function validateBranchOwnership(
  branchRestaurantId: string | null | undefined,
  selectedRestaurantId: string
): boolean {
  return branchRestaurantId === selectedRestaurantId;
}
