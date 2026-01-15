import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { AssistantContextProvider } from "@/contexts/AssistantContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AIAssistantBubble } from "@/components/AIAssistantBubble";
import { SmartAssistantLite } from "@/components/SmartAssistantLite";
import Login from "./pages/Login";
import SystemAdmin from "./pages/SystemAdmin";
import OwnerAdmin from "./pages/OwnerAdmin";
import POS from "./pages/POS";
import KDS from "./pages/KDS";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <AssistantContextProvider>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/system-admin"
                  element={
                    <ProtectedRoute allowedRoles={['system_admin']}>
                      <SystemAdmin />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['owner']}>
                      <BranchProvider>
                        <OwnerAdmin />
                      </BranchProvider>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/pos"
                  element={
                    <ProtectedRoute allowedRoles={['cashier']}>
                      <POS />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/kds"
                  element={
                    <ProtectedRoute allowedRoles={['kitchen', 'owner']}>
                      <KDS />
                    </ProtectedRoute>
                  }
                />
                <Route path="/menu/:restaurantId/:branchId/:tableCode" element={<Menu />} />
                <Route path="/menu/:restaurantId/:tableCode" element={<Menu />} />
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <AIAssistantBubble />
              <SmartAssistantLite />
            </AssistantContextProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
