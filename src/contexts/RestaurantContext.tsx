import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_renewal_reminder_stage: string | null;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurantId: (id: string) => void;
  isLoading: boolean;
  hasMultipleRestaurants: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

const STORAGE_KEY = "kastana:selectedRestaurantId";

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRestaurantId, setSelectedRestaurantIdState] = useState<string | null>(null);

  // Fetch all restaurants owned by the current user
  const { data: restaurants = [], isLoading } = useQuery({
    queryKey: ["owner-restaurants", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Restaurant[];
    },
    enabled: !!user?.id && role === "owner",
  });

  // Get selected restaurant object
  const selectedRestaurant = restaurants.find((r) => r.id === selectedRestaurantId) || null;

  // Load stored restaurant on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = localStorage.getItem(STORAGE_KEY);
      if (storedId) {
        setSelectedRestaurantIdState(storedId);
      }
    }
  }, []);

  // Auto-select first restaurant if none selected (or stored is invalid)
  useEffect(() => {
    if (!isLoading && restaurants.length > 0) {
      const storedId = localStorage.getItem(STORAGE_KEY);
      const storedRestaurant = storedId ? restaurants.find((r) => r.id === storedId) : null;

      if (storedRestaurant) {
        if (selectedRestaurantId !== storedRestaurant.id) {
          setSelectedRestaurantIdState(storedRestaurant.id);
        }
      } else {
        // No valid stored restaurant, select first one
        setSelectedRestaurantIdState(restaurants[0].id);
        localStorage.setItem(STORAGE_KEY, restaurants[0].id);
      }
    }
  }, [restaurants, isLoading, selectedRestaurantId]);

  const setSelectedRestaurantId = (id: string) => {
    setSelectedRestaurantIdState(id);
    localStorage.setItem(STORAGE_KEY, id);
    
    // Invalidate all restaurant-dependent queries to force refetch
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["default-branch"] });
    queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
    queryClient.invalidateQueries({ queryKey: ["menu-items"] });
    queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-tables"] });
    queryClient.invalidateQueries({ queryKey: ["cashiers"] });
    queryClient.invalidateQueries({ queryKey: ["kitchen-staff"] });
    queryClient.invalidateQueries({ queryKey: ["owner-restaurant-settings"] });
    queryClient.invalidateQueries({ queryKey: ["restaurant-subscription"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
    queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
    queryClient.invalidateQueries({ queryKey: ["modifier-groups"] });
    queryClient.invalidateQueries({ queryKey: ["branch-menu-items"] });
    queryClient.invalidateQueries({ queryKey: ["branch-payment-methods"] });
    queryClient.invalidateQueries({ queryKey: ["combo-items"] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
    queryClient.invalidateQueries({ queryKey: ["recipes"] });
  };

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        selectedRestaurant,
        setSelectedRestaurantId,
        isLoading,
        hasMultipleRestaurants: restaurants.length > 1,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurantContext() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error("useRestaurantContext must be used within a RestaurantProvider");
  }
  return context;
}

// Safe version for components that may be used outside the provider
export function useRestaurantContextSafe() {
  const context = useContext(RestaurantContext);
  return (
    context ?? {
      restaurants: [],
      selectedRestaurant: null,
      setSelectedRestaurantId: () => {},
      isLoading: false,
      hasMultipleRestaurants: false,
    }
  );
}
