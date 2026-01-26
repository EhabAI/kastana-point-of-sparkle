import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { SubscriptionExpiredScreen } from '@/components/SubscriptionExpiredScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('system_admin' | 'owner' | 'cashier' | 'kitchen')[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, role, isActive, isRestaurantActive, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [showSubscriptionExpired, setShowSubscriptionExpired] = useState(false);

  // Handle inactive user (cashier/owner deactivated)
  useEffect(() => {
    if (!loading && user && !isActive) {
      toast({
        title: 'Account Deactivated',
        description: 'Your account has been deactivated. Please contact your manager.',
        variant: 'destructive',
      });
      signOut();
    }
  }, [loading, user, isActive, signOut, toast]);

  // Handle inactive restaurant/expired subscription for owners, cashiers, and kitchen staff
  // System Admin is never blocked
  useEffect(() => {
    if (!loading && user && role && role !== 'system_admin' && !isRestaurantActive) {
      setShowSubscriptionExpired(true);
    } else {
      setShowSubscriptionExpired(false);
    }
  }, [loading, user, role, isRestaurantActive]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is inactive (cashier/owner deactivated), redirect to login
  if (!isActive) {
    return <Navigate to="/login" replace />;
  }

  // If restaurant subscription expired for owner/cashier/kitchen, show expired screen
  // System Admin is never blocked
  if (showSubscriptionExpired && role !== 'system_admin') {
    return (
      <SubscriptionExpiredScreen showLogout={true} />
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
      if (role === 'kitchen') {
        return <Navigate to="/kds" replace />;
      }
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
}
