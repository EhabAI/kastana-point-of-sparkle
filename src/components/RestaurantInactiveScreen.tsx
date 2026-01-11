import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface RestaurantInactiveScreenProps {
  showLogout?: boolean;
}

export function RestaurantInactiveScreen({
  showLogout = true,
}: RestaurantInactiveScreenProps) {
  const { signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("restaurant_inactive_title")}</h1>
          <p className="text-muted-foreground">{t("restaurant_inactive_message")}</p>
        </div>
        {showLogout && (
          <Button onClick={() => signOut()} variant="outline" className="w-full">
            {t("sign_out")}
          </Button>
        )}
      </div>
    </div>
  );
}
