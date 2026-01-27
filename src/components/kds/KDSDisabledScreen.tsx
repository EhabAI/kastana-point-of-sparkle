import { ChefHat } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * KDSDisabledScreen - Informational screen when KDS module is not enabled
 * 
 * DISPLAY LOGIC:
 * - Uses AMBER/MUTED styling (not red/destructive)
 * - This is a configuration state, NOT an error
 * - Icon: ChefHat (contextual) instead of AlertTriangle (alarming)
 */
export function KDSDisabledScreen() {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="max-w-md w-full border-amber-200 dark:border-amber-800/50">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <ChefHat className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-xl font-semibold">
            {t("kds_disabled_title")}
          </h1>
          <p className="text-muted-foreground">
            {t("kds_disabled_message")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
