/**
 * AssistantBranchSync - Synchronizes branch context to AssistantContext
 * 
 * This component should be rendered inside the Owner admin page
 * to keep the Smart Assistant aware of the selected branch.
 */

import { useEffect } from "react";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { useAssistantContext } from "@/contexts/AssistantContext";

export function AssistantBranchSync() {
  const { selectedRestaurant } = useRestaurantContextSafe();
  const { selectedBranch } = useBranchContextSafe();
  const { setBranchContext } = useAssistantContext();

  useEffect(() => {
    setBranchContext({
      restaurantId: selectedRestaurant?.id ?? null,
      restaurantName: selectedRestaurant?.name ?? null,
      branchId: selectedBranch?.id ?? null,
      branchName: selectedBranch?.name ?? null,
    });
  }, [selectedRestaurant, selectedBranch, setBranchContext]);

  // This component doesn't render anything
  return null;
}
