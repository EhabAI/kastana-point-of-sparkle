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
import { DomainRouter, isQRMenuDomain } from "@/components/DomainRouter";
import Login from "./pages/Login";
import SystemAdmin from "./pages/SystemAdmin";
import OwnerAdmin from "./pages/OwnerAdmin";
import POS from "./pages/POS";
import KDS from "./pages/KDS";
import Menu from "./pages/Menu";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Trainer overlay wrapper that needs language context
// Only shown on POS domain, not QR menu domain
function TrainerComponents() {
  const { language } = useLanguage();
  const lang = language as "ar" | "en";
  
  // Don't show trainer on QR menu domain
  if (isQRMenuDomain()) {
    return null;
  }
  
  return (
    <>
      <TrainerOverlay language={lang} />
      <FirstShiftPrompt language={lang} />
    </>
  );
}

// Smart Assistant - only shown on POS domain
function AssistantComponent() {
  if (isQRMenuDomain()) {
    return null;
  }
  return <SmartAssistantLite />;
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
                  {/* Domain Router enforces domain-based access control */}
                  <DomainRouter>
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
                      {/* QR Menu routes - accessible on all domains */}
                      <Route path="/menu/:restaurantId/:branchId/:tableCode" element={<Menu />} />
                      <Route path="/menu/:restaurantId/:tableCode" element={<Menu />} />
                      <Route path="/menu" element={<MenuLanding />} />
                      <Route path="/" element={<Navigate to="/login" replace />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </DomainRouter>
                  <AssistantComponent />
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

// Simple landing page for /menu route without parameters
function MenuLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <div className="w-20 h-20 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-primary" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Kastana Menu
        </h1>
        <p className="text-muted-foreground">
          Scan a QR code at your table to view the menu and place an order.
        </p>
      </div>
    </div>
  );
}

export default App;
