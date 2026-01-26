import { AlertTriangle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface SubscriptionExpiredScreenProps {
  showLogout?: boolean;
}

export function SubscriptionExpiredScreen({
  showLogout = true,
}: SubscriptionExpiredScreenProps) {
  const { signOut } = useAuth();
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const handleContactSupport = () => {
    // Open WhatsApp or email - using a placeholder URL
    window.open("https://wa.me/962790000000", "_blank");
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-background p-4"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-10 w-10 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="space-y-3">
          <h1 className="text-2xl font-bold text-foreground">
            {t("subscription_expired_title")}
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            {t("subscription_expired_message")}
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <Button 
            onClick={handleContactSupport} 
            className="w-full gap-2"
            size="lg"
          >
            <MessageSquare className="h-5 w-5" />
            {t("contact_support")}
          </Button>
          {showLogout && (
            <Button 
              onClick={() => signOut()} 
              variant="ghost" 
              className="w-full text-muted-foreground"
            >
              {t("sign_out")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
