import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "ar" : "en");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="gap-2 px-3 py-1.5 h-9 rounded-full border-2 border-primary/20 bg-primary/5 hover:bg-primary/10 hover:border-primary/40 transition-all duration-200 hover-scale"
    >
      <Globe className="h-4 w-4 text-primary" />
      <div className="flex items-center gap-1.5">
        <span 
          className={`text-sm font-semibold transition-colors ${
            language === "en" 
              ? "text-primary" 
              : "text-muted-foreground"
          }`}
        >
          EN
        </span>
        <span className="text-muted-foreground/50">|</span>
        <span 
          className={`text-sm font-semibold transition-colors ${
            language === "ar" 
              ? "text-primary" 
              : "text-muted-foreground"
          }`}
        >
          عربي
        </span>
      </div>
    </Button>
  );
}
