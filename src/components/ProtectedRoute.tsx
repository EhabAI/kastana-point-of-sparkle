import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('system_admin' | 'owner' | 'cashier')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles) {
    // If route requires roles, deny when role is missing or not allowed
    if (!role) {
      return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(role)) {
      // Redirect based on role
      if (role === 'system_admin') {
        return <Navigate to="/system-admin" replace />;
      }
      if (role === 'owner') {
        return <Navigate to="/admin" replace />;
      }
      if (role === 'cashier') {
        return <Navigate to="/pos" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
