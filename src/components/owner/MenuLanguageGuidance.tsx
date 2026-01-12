import { Info } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MenuLanguageGuidanceProps {
  variant?: "inline" | "tooltip";
}

export function MenuLanguageGuidance({ variant = "inline" }: MenuLanguageGuidanceProps) {
  const { t, language } = useLanguage();

  if (variant === "tooltip") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 text-muted-foreground cursor-help inline-block ltr:ml-1 rtl:mr-1" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">{t("menu_language_tooltip")}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="rounded-lg bg-muted/50 border border-border/50 p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
        <div className="space-y-1.5 text-xs">
          <p className="font-medium text-foreground">{t("menu_language_title")}</p>
          <p className="text-muted-foreground leading-relaxed">{t("menu_language_description")}</p>
          <p className="text-muted-foreground leading-relaxed">
            {t("menu_language_example_intro")}
            <br />
            <span className="font-medium text-foreground">
              {language === "ar" ? "برغر دجاج / Chicken Burger" : "Chicken Burger / برغر دجاج"}
            </span>
          </p>
          <p className="text-muted-foreground/70 italic">{t("menu_language_future_note")}</p>
        </div>
      </div>
    </div>
  );
}
