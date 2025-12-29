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

const STORAGE_KEY = "kastana_selected_branch";

export function BranchProvider({ children }: { children: ReactNode }) {
  const { data: restaurant } = useOwnerRestaurant();
  const { data: branches = [], isLoading: branchesLoading } = useBranches(restaurant?.id);
  const { data: defaultBranch, isLoading: defaultLoading } = useDefaultBranch(restaurant?.id);
  
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY);
    }
    return null;
  });

  // Get selected branch object
  const selectedBranch = branches.find(b => b.id === selectedBranchId) || null;

  // Auto-select default branch if none selected
  useEffect(() => {
    if (!branchesLoading && !defaultLoading && branches.length > 0 && !selectedBranch) {
      const storedId = localStorage.getItem(STORAGE_KEY);
      const storedBranch = storedId ? branches.find(b => b.id === storedId) : null;
      
      if (storedBranch) {
        setSelectedBranchIdState(storedBranch.id);
      } else if (defaultBranch) {
        setSelectedBranchIdState(defaultBranch.id);
        localStorage.setItem(STORAGE_KEY, defaultBranch.id);
      }
    }
  }, [branches, defaultBranch, branchesLoading, defaultLoading, selectedBranch]);

  const setSelectedBranchId = (id: string) => {
    setSelectedBranchIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
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
