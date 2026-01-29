import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useKitchenSession } from "@/hooks/kds/useKitchenSession";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { useKDSAuditLog } from "@/hooks/kds/useKDSAuditLog";
import { useAuth } from "@/contexts/AuthContext";
import { KDSLayout } from "@/components/kds/KDSLayout";
import { KDSDisabledScreen } from "@/components/kds/KDSDisabledScreen";

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
  const {
    role,
    restaurantId: ownerRestaurantId,
    isRestaurantActive: authRestaurantActive,
    loading: authLoading,
  } = useAuth();
  
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
    isFetched: kitchenSessionFetched,
  } = useKitchenSession();
  
  // Use appropriate restaurant/branch based on role
  // SECURITY: Kitchen users can only see their assigned branch
  const restaurantId = isOwner ? ownerRestaurantId : kitchenRestaurantId;
  const branchId = isOwner ? null : kitchenBranchId; // Owners see all branches
  const sessionFetched = isOwner ? true : kitchenSessionFetched;
  
  // SECURITY: Check if KDS add-on is enabled
  const {
    data: kdsEnabled,
    isLoading: kdsLoading,
    isFetched: kdsFetched,
  } = useKDSEnabled(restaurantId);
  
  const auditLog = useKDSAuditLog();

  // HARD DECISION GATE (prevents first-load false-negative "KDS disabled")
  // We do not render *any* enabled/disabled decision until:
  // - auth role is resolved
  // - kitchen session is resolved (for kitchen role)
  // - restaurantId is resolved (can be null, but must be resolved)
  // - kds_enabled has been fetched and confirmed (only when restaurantId exists)
  const roleResolved = !authLoading && role !== null;
  const sessionResolved = isOwner ? true : sessionFetched;
  const restaurantIdResolved = roleResolved && sessionResolved;
  const hasRestaurantId = typeof restaurantId === "string" && restaurantId.length > 0;
  const kdsFlagResolved = !hasRestaurantId
    ? true
    : kdsFetched && !kdsLoading && typeof kdsEnabled === "boolean";
  const dataReady = restaurantIdResolved && kdsFlagResolved;

  // SECURITY: Log access violations (useEffect MUST be before any returns)
  useEffect(() => {
    if (!dataReady) return;
    
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
    if (isAllowedRole && restaurantId && !authRestaurantActive) {
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
    dataReady,
    kdsEnabled, 
    authRestaurantActive,
    restaurantId, 
    role, 
    isAllowedRole, 
    auditLog
  ]);

  // IMPORTANT: Never show "disabled" while data is incomplete.
  if (!roleResolved) {
    return null;
  }

  // SECURITY: Redirect denied roles as soon as role is known (no feature-flag decisions needed)
  if (isDeniedRole) {
    if (role === "cashier") return <Navigate to="/pos" replace />;
    if (role === "system_admin") return <Navigate to="/system-admin" replace />;
    return <Navigate to="/login" replace />;
  }

  // SECURITY: Require a valid allowed role
  if (!isAllowedRole) {
    return <Navigate to="/login" replace />;
  }

  // Wait for kitchen session + flags before making any enabled/disabled decision.
  if (!dataReady) {
    return null;
  }

  // SECURITY: Require a valid restaurant ID
  if (!restaurantId) {
    return <KDSDisabledScreen />;
  }

  // SECURITY: Require restaurant to be active
  if (!authRestaurantActive) {
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
