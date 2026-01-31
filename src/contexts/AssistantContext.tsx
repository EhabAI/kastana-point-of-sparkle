import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "cashier" | "owner" | "kitchen" | "system_admin" | null;
type ShiftStatus = "open" | "closed" | null;
type OrderStatus = "open" | "held" | "paid" | "cancelled" | "voided" | null;
type PaymentMethod = "cash" | "visa" | "mastercard" | "wallet" | "efawateer" | null;
type SystemLanguage = "ar" | "en";

interface BranchContext {
  branchId: string | null;
  branchName: string | null;
  restaurantId: string | null;
  restaurantName: string | null;
}

interface AssistantContextState {
  user_role: UserRole;
  current_screen_id: string;
  order_status: OrderStatus;
  shift_status: ShiftStatus;
  selected_table_id: string | null;
  payment_method: PaymentMethod;
  system_language: SystemLanguage;
  // Branch awareness (Owner only)
  branch_context: BranchContext;
  is_branch_ready: boolean; // True when branch is selected (Owner context)
}

interface AssistantContextActions {
  setOrderStatus: (status: OrderStatus) => void;
  setShiftStatus: (status: ShiftStatus) => void;
  setSelectedTableId: (tableId: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setBranchContext: (ctx: BranchContext) => void;
}

type AssistantContextType = AssistantContextState & AssistantContextActions;

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

// Map routes to screen IDs
const getScreenId = (pathname: string): string => {
  if (pathname === "/login") return "login";
  if (pathname === "/system-admin") return "system_admin_dashboard";
  if (pathname === "/admin") return "owner_dashboard";
  if (pathname === "/pos") return "pos_main";
  if (pathname === "/kds") return "kds";
  if (pathname.startsWith("/menu/")) return "customer_menu";
  return "unknown";
};

// Get language from localStorage directly to avoid context dependency issues
const getStoredLanguage = (): SystemLanguage => {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("kastana_language");
    if (stored === "ar" || stored === "en") return stored;
  }
  return "en";
};

export function AssistantContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { role } = useAuth();

  // Get language from localStorage to avoid circular context dependencies
  const [systemLanguage, setSystemLanguage] = useState<SystemLanguage>(getStoredLanguage);
  
  // Listen for language changes in localStorage
  React.useEffect(() => {
    const handleStorageChange = () => {
      setSystemLanguage(getStoredLanguage());
    };
    
    // Check periodically for language changes (since storage events don't fire in same tab)
    const interval = setInterval(handleStorageChange, 1000);
    window.addEventListener("storage", handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Local state for dynamic values
  const [orderStatus, setOrderStatusState] = useState<OrderStatus>(null);
  const [shiftStatus, setShiftStatusState] = useState<ShiftStatus>(null);
  const [selectedTableId, setSelectedTableIdState] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod>(null);
  const [branchContext, setBranchContextState] = useState<BranchContext>({
    branchId: null,
    branchName: null,
    restaurantId: null,
    restaurantName: null,
  });

  // Setters
  const setOrderStatus = useCallback((status: OrderStatus) => {
    setOrderStatusState(status);
  }, []);

  const setShiftStatus = useCallback((status: ShiftStatus) => {
    setShiftStatusState(status);
  }, []);

  const setSelectedTableId = useCallback((tableId: string | null) => {
    setSelectedTableIdState(tableId);
  }, []);

  const setPaymentMethod = useCallback((method: PaymentMethod) => {
    setPaymentMethodState(method);
  }, []);

  const setBranchContext = useCallback((ctx: BranchContext) => {
    setBranchContextState(ctx);
  }, []);

  // Derive values
  const current_screen_id = getScreenId(location.pathname);
  const user_role: UserRole = role as UserRole;
  
  // Branch is ready for Owner when both restaurantId and branchId are set
  const is_branch_ready = user_role === "owner" 
    ? Boolean(branchContext.restaurantId && branchContext.branchId)
    : true; // Non-owner roles don't need branch context

  const value: AssistantContextType = {
    // State
    user_role,
    current_screen_id,
    order_status: orderStatus,
    shift_status: shiftStatus,
    selected_table_id: selectedTableId,
    payment_method: paymentMethod,
    system_language: systemLanguage,
    branch_context: branchContext,
    is_branch_ready,
    // Actions
    setOrderStatus,
    setShiftStatus,
    setSelectedTableId,
    setPaymentMethod,
    setBranchContext,
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistantContext() {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error("useAssistantContext must be used within an AssistantContextProvider");
  }
  return context;
}

// Export types for external use
export type {
  UserRole,
  ShiftStatus,
  OrderStatus,
  PaymentMethod,
  SystemLanguage,
  AssistantContextState,
  BranchContext,
};
