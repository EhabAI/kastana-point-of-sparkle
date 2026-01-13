import { Card, CardContent } from "@/components/ui/card";
import { PackageX } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export function InventoryDisabledCard() {
  const { t } = useLanguage();

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <PackageX className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {t("inventory_module_disabled_title")}
        </h3>
        <p className="text-muted-foreground max-w-md">
          {t("inventory_module_disabled_message")}
        </p>
      </CardContent>
    </Card>
  );
}
