import { Button } from "@/components/ui/button";
import { LogOut, Clock, FileText, DollarSign, MoreHorizontal, Moon, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
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
    <header className="flex items-center justify-between p-3 bg-card border-b">
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

        {/* Compact Language Toggle */}
        <div className="flex items-center border rounded-md overflow-hidden text-xs">
          <button
            onClick={() => setLanguage("en")}
            className={cn(
              "px-2 py-1 transition-colors font-medium",
              language === "en" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            EN
          </button>
          <button
            onClick={() => setLanguage("ar")}
            className={cn(
              "px-2 py-1 transition-colors font-medium",
              language === "ar" 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            )}
          >
            AR
          </button>
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
