import { useEffect } from "react";
import { useKitchenSession } from "@/hooks/kds/useKitchenSession";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { useKDSAuditLog } from "@/hooks/kds/useKDSAuditLog";
import { KDSLayout } from "@/components/kds/KDSLayout";
import { KDSDisabledScreen } from "@/components/kds/KDSDisabledScreen";
import { Loader2 } from "lucide-react";

export default function KDS() {
  const { restaurantId, branchId, isLoading: sessionLoading } = useKitchenSession();
  const { data: kdsEnabled, isLoading: kdsLoading } = useKDSEnabled(restaurantId);
  const auditLog = useKDSAuditLog();

  // Log access attempt when KDS is disabled
  useEffect(() => {
    if (!kdsLoading && !sessionLoading && restaurantId && kdsEnabled === false) {
      auditLog.mutate({
        action: "KDS_DISABLED_ACCESS",
        entityType: "kds",
        entityId: restaurantId,
        restaurantId,
        details: { attempted_at: new Date().toISOString() },
      });
    }
  }, [kdsEnabled, kdsLoading, sessionLoading, restaurantId]);

  if (sessionLoading || kdsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!kdsEnabled) {
    return <KDSDisabledScreen />;
  }

  if (!restaurantId) {
    return <KDSDisabledScreen />;
  }

  return <KDSLayout restaurantId={restaurantId} branchId={branchId} />;
}
