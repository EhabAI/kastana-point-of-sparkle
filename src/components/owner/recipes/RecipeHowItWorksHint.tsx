/**
 * Recipe How It Works Hint
 * Shows a one-time numbered explanation of how recipes work
 * Displayed only on first visit, then dismissed forever
 */

import { useState, useEffect } from "react";
import { ChefHat, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

const RECIPE_HINT_DISMISSED_KEY = "kastana_recipe_how_it_works_dismissed";

export function RecipeHowItWorksHint() {
  const { t, language } = useLanguage();
  const [dismissed, setDismissed] = useState(true);
  
  useEffect(() => {
    const wasDismissed = localStorage.getItem(RECIPE_HINT_DISMISSED_KEY) === "true";
    setDismissed(wasDismissed);
  }, []);
  
  const handleDismiss = () => {
    localStorage.setItem(RECIPE_HINT_DISMISSED_KEY, "true");
    setDismissed(true);
  };
  
  if (dismissed) return null;
  
  const steps = [
    t("recipe_how_it_works_step1"),
    t("recipe_how_it_works_step2"),
    t("recipe_how_it_works_step3"),
  ];
  
  return (
    <div
      className={cn(
        "p-4 rounded-lg border bg-muted/30",
        "animate-in fade-in slide-in-from-top-2 duration-300"
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t("recipe_how_it_works_title")}</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleDismiss}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      <ol className="space-y-1.5 mb-3">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-muted text-xs font-medium">
              {index + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>
      
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs h-8"
        onClick={handleDismiss}
      >
        {t("recipe_got_it")}
      </Button>
    </div>
  );
}
