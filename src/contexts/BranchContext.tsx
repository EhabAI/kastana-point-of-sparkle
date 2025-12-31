import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useBranches, useDefaultBranch, Branch } from "@/hooks/useBranches";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";

interface BranchContextType {
  branches: Branch[];
  selectedBranch: Branch | null;
  setSelectedBranchId: (id: string) => void;
  isLoading: boolean;
  isBranchSelected: boolean;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

// Storage key is scoped by restaurant_id per spec
const getStorageKey = (restaurantId: string) => `kastana:${restaurantId}:selectedBranchId`;

export function BranchProvider({ children }: { children: ReactNode }) {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(restaurant?.id);
  const { data: defaultBranch, isLoading: defaultLoading } = useDefaultBranch(restaurant?.id);
  
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(null);

  // Get selected branch object
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  // Load stored branch when restaurant changes
  useEffect(() => {
    if (restaurant?.id && typeof window !== 'undefined') {
      const storedId = localStorage.getItem(getStorageKey(restaurant.id));
      if (storedId) {
        setSelectedBranchIdState(storedId);
      }
    }
  }, [restaurant?.id]);

  // Auto-select default branch if none selected (or stored branch is invalid)
  useEffect(() => {
    if (!branchesLoading && !defaultLoading && branches.length > 0 && restaurant?.id) {
      const storedId = localStorage.getItem(getStorageKey(restaurant.id));
      const storedBranch = storedId ? branches.find(b => b.id === storedId) : null;
      
      if (storedBranch) {
        // Stored branch is valid, use it
        if (selectedBranchId !== storedBranch.id) {
          setSelectedBranchIdState(storedBranch.id);
        }
      } else if (defaultBranch && !selectedBranch) {
        // No valid stored branch, use default
        setSelectedBranchIdState(defaultBranch.id);
        localStorage.setItem(getStorageKey(restaurant.id), defaultBranch.id);
      } else if (!selectedBranch && branches.length > 0) {
        // Fallback to first branch
        setSelectedBranchIdState(branches[0].id);
        localStorage.setItem(getStorageKey(restaurant.id), branches[0].id);
      }
    }
  }, [branches, defaultBranch, branchesLoading, defaultLoading, selectedBranch, restaurant?.id, selectedBranchId]);

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
    if (restaurant?.id) {
      localStorage.setItem(getStorageKey(restaurant.id), id);
    }
  };

  const isLoading = branchesLoading || defaultLoading;

  return (
    <BranchContext.Provider 
      value={{ 
        branches, 
        selectedBranch, 
        setSelectedBranchId, 
        isLoading,
        isBranchSelected: !!selectedBranch,
      }}
    >
      {children}
    </BranchContext.Provider>
  );
}

export function useBranchContext() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error("useBranchContext must be used within a BranchProvider");
  }
  return context;
}
