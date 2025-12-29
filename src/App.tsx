import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import SystemAdmin from "./pages/SystemAdmin";
import OwnerAdmin from "./pages/OwnerAdmin";
import POS from "./pages/POS";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
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
                    <OwnerAdmin />
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
              <Route path="/menu/:restaurantId/:tableCode" element={<Menu />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
