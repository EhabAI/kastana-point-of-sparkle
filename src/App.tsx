import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider, useLanguage } from "@/contexts/LanguageContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { AssistantContextProvider } from "@/contexts/AssistantContext";
import { ErrorContextProvider } from "@/contexts/ErrorContext";
import { TrainerProvider } from "@/contexts/TrainerContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SmartAssistantLite } from "@/components/SmartAssistantLite";
import { TrainerOverlay, FirstShiftPrompt } from "@/components/trainer";
import Login from "./pages/Login";
import SystemAdmin from "./pages/SystemAdmin";
import OwnerAdmin from "./pages/OwnerAdmin";
import POS from "./pages/POS";
import KDS from "./pages/KDS";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Trainer overlay wrapper that needs language context
function TrainerComponents() {
  const { language } = useLanguage();
  const lang = language as "ar" | "en";
  
  return (
    <>
      <TrainerOverlay language={lang} />
      <FirstShiftPrompt language={lang} />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
            <ErrorContextProvider>
              <AssistantContextProvider>
                <TrainerProvider>
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
                  <SmartAssistantLite />
                  <TrainerComponents />
                </TrainerProvider>
              </AssistantContextProvider>
            </ErrorContextProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
