import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 h-9 px-1.5 rounded-lg border border-border/50 bg-background hover:border-border transition-colors">
      <Globe className="h-4 w-4 text-muted-foreground" />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`px-2 py-1 text-sm rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            language === "en"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
          aria-pressed={language === "en"}
          aria-label="Switch to English"
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLanguage("ar")}
          className={`px-2 py-1 text-sm rounded-md transition-all duration-200 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            language === "ar"
              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
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
