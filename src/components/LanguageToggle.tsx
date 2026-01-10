import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 h-9 px-2 rounded-md border border-border/50 bg-background hover:border-border transition-colors">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-1.5 py-1 text-sm font-medium rounded-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            language === "en"
              ? "text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          aria-pressed={language === "en"}
          aria-label="Switch to English"
        >
          EN
        </button>
        <span className="text-border mx-0.5 select-none">|</span>
        <button
          type="button"
          onClick={() => setLanguage("ar")}
          className={`px-1.5 py-1 text-sm font-medium rounded-sm transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            language === "ar"
              ? "text-foreground"
              : "text-muted-foreground/60 hover:text-muted-foreground"
          }`}
          aria-pressed={language === "ar"}
          aria-label="التبديل إلى العربية"
        >
          عربي
        </button>
      </div>
    </div>
  );
}
