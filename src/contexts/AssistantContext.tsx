import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

type UserRole = "cashier" | "owner" | "system_admin" | null;
type ShiftStatus = "open" | "closed" | null;
type OrderStatus = "open" | "held" | "paid" | "cancelled" | "voided" | null;
type PaymentMethod = "cash" | "visa" | "mastercard" | "wallet" | "efawateer" | null;
type SystemLanguage = "ar" | "en";

interface AssistantContextState {
  user_role: UserRole;
  current_screen_id: string;
  order_status: OrderStatus;
  shift_status: ShiftStatus;
  selected_table_id: string | null;
  payment_method: PaymentMethod;
  system_language: SystemLanguage;
}

interface AssistantContextActions {
  setOrderStatus: (status: OrderStatus) => void;
  setShiftStatus: (status: ShiftStatus) => void;
  setSelectedTableId: (tableId: string | null) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
}

type AssistantContextType = AssistantContextState & AssistantContextActions;

const AssistantContext = createContext<AssistantContextType | undefined>(undefined);

// Map routes to screen IDs
const getScreenId = (pathname: string): string => {
  if (pathname === "/login") return "login";
  if (pathname === "/system-admin") return "system_admin_dashboard";
  if (pathname === "/admin") return "owner_dashboard";
  if (pathname === "/pos") return "pos_main";
  if (pathname.startsWith("/menu/")) return "customer_menu";
  return "unknown";
};

export function AssistantContextProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { language } = useLanguage();
  const { role } = useAuth();

  // Local state for dynamic values
  const [orderStatus, setOrderStatusState] = useState<OrderStatus>(null);
  const [shiftStatus, setShiftStatusState] = useState<ShiftStatus>(null);
  const [selectedTableId, setSelectedTableIdState] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethodState] = useState<PaymentMethod>(null);

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

  // Derive values
  const current_screen_id = getScreenId(location.pathname);
  const system_language: SystemLanguage = language as SystemLanguage;
  const user_role: UserRole = role as UserRole;

  const value: AssistantContextType = {
    // State
    user_role,
    current_screen_id,
    order_status: orderStatus,
    shift_status: shiftStatus,
    selected_table_id: selectedTableId,
    payment_method: paymentMethod,
    system_language,
    // Actions
    setOrderStatus,
    setShiftStatus,
    setSelectedTableId,
    setPaymentMethod,
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
};
