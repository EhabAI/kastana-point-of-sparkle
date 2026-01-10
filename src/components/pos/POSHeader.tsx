import { Button } from "@/components/ui/button";
import { LogOut, Clock, FileText, DollarSign, MoreHorizontal, Moon, Sun, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useEffect, useState } from "react";

interface POSHeaderProps {
  restaurantName: string;
  restaurantLogo?: string | null;
  cashierEmail: string;
  shiftStatus: "open" | "closed";
  onSignOut: () => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onCashMovement: () => void;
  onViewHeldOrders: () => void;
  onViewRecentOrders: () => void;
  onViewZReport: () => void;
  heldOrdersCount: number;
}

export function POSHeader({
  restaurantName,
  restaurantLogo,
  cashierEmail,
  shiftStatus,
  onSignOut,
  onOpenShift,
  onCloseShift,
  onCashMovement,
  onViewHeldOrders,
  onViewRecentOrders,
  onViewZReport,
  heldOrdersCount,
}: POSHeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  const [isDark, setIsDark] = useState(() => localStorage.getItem('kastana-theme') === 'dark');

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('kastana-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('kastana-theme', 'light');
    }
  }, [isDark]);

  return (
    <header className="flex items-center justify-between p-3 bg-slate-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
      <div className="flex items-center gap-3">
        {restaurantLogo && (
          <img 
            src={restaurantLogo} 
            alt={`${restaurantName} logo`}
            className="w-10 h-10 object-contain rounded-lg"
          />
        )}
        <div>
          <h1 className="text-lg font-bold">{restaurantName}</h1>
          <p className="text-xs text-muted-foreground">{cashierEmail}</p>
        </div>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            shiftStatus === "open"
              ? "bg-green-500/20 text-green-600"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {shiftStatus === "open" ? t("shift_status_open") : t("shift_status_closed")}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setIsDark(!isDark)}
          className="flex items-center justify-center h-10 w-10 p-2 rounded-full bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-gray-200" />
          ) : (
            <Moon className="h-5 w-5 text-gray-800" />
          )}
        </button>

        {/* Separator gap */}
        <div className="w-1" />

        {/* Compact Language Toggle - matching DashboardLayout style */}
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
      </div>

      <div className="flex items-center gap-2">
        {shiftStatus === "open" ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={onViewHeldOrders}
              className="relative"
            >
              <Clock className="h-4 w-4 mr-1" />
              {t("held")}
              {heldOrdersCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {heldOrdersCount}
                </span>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onViewRecentOrders}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("recent_orders")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCashMovement}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  {t("cash_in_out")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewZReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  {t("z_report")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCloseShift} className="text-destructive">
                  <Clock className="h-4 w-4 mr-2" />
                  {t("close_shift")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button onClick={onOpenShift} size="sm">
            <Clock className="h-4 w-4 mr-1" />
            {t("open_shift")}
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
