import { useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useKitchenSession } from "@/hooks/kds/useKitchenSession";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { useKDSAuditLog } from "@/hooks/kds/useKDSAuditLog";
import { useRestaurantActiveStatus } from "@/hooks/useRestaurantActiveStatus";
import { useAuth } from "@/contexts/AuthContext";
import { KDSLayout } from "@/components/kds/KDSLayout";
import { KDSDisabledScreen } from "@/components/kds/KDSDisabledScreen";
import { Loader2 } from "lucide-react";

/**
 * KDS Page - Kitchen Display System
 * 
 * SECURITY RULES:
 * - Access allowed ONLY for: owner, kitchen roles
 * - Access denied for: cashier, system_admin
 * - Requires: restaurant.is_active = true AND kds_enabled = true
 * - Owner operates with kitchen-level permissions only (no owner powers)
 */
export default function KDS() {
  const { role, restaurantId: ownerRestaurantId, loading: authLoading } = useAuth();
  
  // SECURITY: Explicitly check allowed roles
  const isOwner = role === "owner";
  const isKitchen = role === "kitchen";
  const isAllowedRole = isOwner || isKitchen;
  
  // SECURITY: Explicitly deny unauthorized roles
  const isDeniedRole = role === "cashier" || role === "system_admin";
  
  // For kitchen users, use the kitchen session hook
  const { 
    restaurantId: kitchenRestaurantId, 
    branchId: kitchenBranchId, 
    isLoading: kitchenSessionLoading 
  } = useKitchenSession();
  
  // Use appropriate restaurant/branch based on role
  // SECURITY: Kitchen users can only see their assigned branch
  const restaurantId = isOwner ? ownerRestaurantId : kitchenRestaurantId;
  const branchId = isOwner ? null : kitchenBranchId; // Owners see all branches
  const sessionLoading = isOwner ? false : kitchenSessionLoading;
  
  // SECURITY: Check if KDS add-on is enabled
  const { data: kdsEnabled, isLoading: kdsLoading, isFetched: kdsFetched } = useKDSEnabled(restaurantId);
  
  // SECURITY: Check if restaurant is active
  const { data: isRestaurantActive, isLoading: restaurantActiveLoading, isFetched: restaurantActiveFetched } = useRestaurantActiveStatus(restaurantId);
  
  const auditLog = useKDSAuditLog();

  // SECURITY: Log access violations
  useEffect(() => {
    // Wait for all data to be loaded before logging
    const isSettingsLoading = authLoading || sessionLoading || kdsLoading || restaurantActiveLoading;
    const isDataReady = kdsFetched && restaurantActiveFetched;
    if (isSettingsLoading || !isDataReady) return;
    
    // Log denied role access attempt
    if (isDeniedRole && restaurantId) {
      auditLog.mutate({
        action: "KDS_UNAUTHORIZED_ACCESS_ATTEMPT",
        entityType: "kds",
        entityId: restaurantId,
        restaurantId,
        details: { 
          attempted_at: new Date().toISOString(), 
          role,
          reason: "denied_role"
        },
      });
      return;
    }
    
    // Log KDS disabled access attempt
    if (isAllowedRole && restaurantId && kdsEnabled === false) {
      auditLog.mutate({
        action: "KDS_DISABLED_ACCESS",
        entityType: "kds",
        entityId: restaurantId,
        restaurantId,
        details: { 
          attempted_at: new Date().toISOString(), 
          role,
          reason: "kds_disabled"
        },
      });
    }
    
    // Log inactive restaurant access attempt
    if (isAllowedRole && restaurantId && !isRestaurantActive) {
      auditLog.mutate({
        action: "KDS_INACTIVE_RESTAURANT_ACCESS",
        entityType: "kds",
        entityId: restaurantId,
        restaurantId,
        details: { 
          attempted_at: new Date().toISOString(), 
          role,
          reason: "restaurant_inactive"
        },
      });
    }
  }, [
    authLoading,
    sessionLoading,
    kdsLoading,
    restaurantActiveLoading,
    kdsFetched,
    restaurantActiveFetched,
    kdsEnabled, 
    isRestaurantActive,
    restaurantId, 
    role, 
    isAllowedRole, 
    isDeniedRole,
    auditLog
  ]);

  // Determine if we're still in a loading state
  // IMPORTANT: Must wait for all data to be fetched before evaluating feature flags
  const isSettingsLoading = authLoading || sessionLoading || kdsLoading || restaurantActiveLoading;
  const isWaitingForData = !isSettingsLoading && restaurantId && (!kdsFetched || !restaurantActiveFetched);
  const isLoading = isSettingsLoading || isWaitingForData;

  // Show loading state - MUST render before any feature flag checks
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // SECURITY: Redirect denied roles to their appropriate screens
  // This is defense-in-depth (ProtectedRoute should catch this first)
  if (isDeniedRole) {
    if (role === "cashier") {
      return <Navigate to="/pos" replace />;
    }
    if (role === "system_admin") {
      return <Navigate to="/system-admin" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  // SECURITY: Require a valid allowed role
  if (!isAllowedRole) {
    return <Navigate to="/login" replace />;
  }

  // SECURITY: Require a valid restaurant ID
  if (!restaurantId) {
    return <KDSDisabledScreen />;
  }

  // SECURITY: Require restaurant to be active
  if (!isRestaurantActive) {
    return <KDSDisabledScreen />;
  }

  // SECURITY: Require KDS add-on to be enabled
  if (!kdsEnabled) {
    return <KDSDisabledScreen />;
  }

  // All security checks passed - render KDS with kitchen-level permissions only
  // Note: Both Owner and Kitchen roles operate with the same restricted UI here
  return <KDSLayout restaurantId={restaurantId} branchId={branchId} />;
}
