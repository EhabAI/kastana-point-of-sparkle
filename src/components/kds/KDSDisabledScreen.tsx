import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export function KDSDisabledScreen() {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir={isRTL ? "rtl" : "ltr"}>
      <Card className="max-w-md w-full">
        <CardContent className="pt-6 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-destructive" />
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
