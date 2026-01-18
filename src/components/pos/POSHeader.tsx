import { Button } from "@/components/ui/button";
import { LogOut, Clock, FileText, DollarSign, MoreHorizontal, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import posLogoNew from "@/assets/pos-logo-new.png";

interface POSHeaderProps {
  restaurantName: string;
  restaurantLogo?: string | null;
  cashierDisplayName: string;
  shiftStatus: "open" | "closed";
  onSignOut: () => void;
  onOpenShift: () => void;
  onCloseShift: () => void;
  onCashMovement: () => void;
  onViewHeldOrders: () => void;
  onViewRecentOrders: () => void;
  onViewZReport: () => void;
  onViewInventorySummary: () => void;
  heldOrdersCount: number;
  inventoryEnabled?: boolean;
}

export function POSHeader({
  restaurantName,
  restaurantLogo,
  cashierDisplayName,
  shiftStatus,
  onSignOut,
  onOpenShift,
  onCloseShift,
  onCashMovement,
  onViewHeldOrders,
  onViewRecentOrders,
  onViewZReport,
  onViewInventorySummary,
  heldOrdersCount,
  inventoryEnabled = false,
}: POSHeaderProps) {
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/60">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-12 sm:h-14">
          {/* LEFT – Brand Area */}
          <div className="flex items-center gap-2.5">
            <img 
              src={restaurantLogo || posLogoNew} 
              alt={`${restaurantName} logo`}
              className="h-8 sm:h-10 w-auto object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground leading-tight">
                {restaurantName}
              </span>
              <span className="text-[11px] text-muted-foreground leading-tight capitalize">
                {cashierDisplayName}
              </span>
            </div>
            
            {/* Shift Status Badge */}
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                shiftStatus === "open"
                  ? "bg-green-500/20 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {shiftStatus === "open" ? t("shift_status_open") : t("shift_status_closed")}
            </div>
          </div>

          {/* RIGHT – Actions Area */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeToggle />
            <LanguageToggle />
            
            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />

            {shiftStatus === "open" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewHeldOrders}
                  className="relative h-8"
                >
                  <Clock className="h-3.5 w-3.5 ltr:mr-1 rtl:ml-1" />
                  <span className="hidden sm:inline text-xs">{t("held")}</span>
                  {heldOrdersCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">
                      {heldOrdersCount}
                    </span>
                  )}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 px-2">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={onViewRecentOrders}>
                      <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("recent_orders")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={onCashMovement}>
                      <DollarSign className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("cash_in_out")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onViewZReport}>
                      <FileText className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("z_report")}
                    </DropdownMenuItem>
                    {inventoryEnabled && (
                      <DropdownMenuItem onClick={onViewInventorySummary}>
                        <Package className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                        {t("inventory_summary") || "ملخص المخزون"}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onCloseShift} className="text-destructive">
                      <Clock className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                      {t("close_shift")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button onClick={onOpenShift} size="sm" className="h-8">
                <Clock className="h-3.5 w-3.5 ltr:mr-1.5 rtl:ml-1.5" />
                <span className="text-xs">{t("open_shift")}</span>
              </Button>
            )}

            {/* Divider */}
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-1.5" />

            {/* Sign Out */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSignOut}
              className="text-muted-foreground hover:text-foreground h-8 px-2"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
