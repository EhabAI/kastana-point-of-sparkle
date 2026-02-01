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
  branchName?: string | null;
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
  branchName,
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
    <header className="sticky top-0 z-50 bg-blue-100 dark:bg-blue-900/40 backdrop-blur-sm border-b border-blue-200 dark:border-blue-800/50">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-10 sm:h-11">
          {/* LEFT – Brand Area */}
          <div className="flex items-center gap-2">
            <img 
              src={restaurantLogo || posLogoNew} 
              alt={`${restaurantName} logo`}
              className="h-6 sm:h-7 w-auto object-contain rounded-lg"
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100 leading-tight">
                  {restaurantName}
                </span>
                {branchName && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 leading-tight">
                    • {branchName}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 leading-tight capitalize">
                {cashierDisplayName}
              </span>
            </div>
            
            {/* Shift Status Badge */}
            <div
              className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                shiftStatus === "open"
                  ? "bg-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-blue-200 dark:bg-blue-800 text-blue-600 dark:text-blue-300"
              }`}
            >
              {shiftStatus === "open" ? t("shift_status_open") : t("shift_status_closed")}
            </div>
          </div>

          {/* RIGHT – Actions Area */}
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <LanguageToggle />
            
            {/* Divider */}
            <div className="hidden sm:block w-px h-4 bg-blue-300 dark:bg-blue-700 mx-1" />

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
            <div className="hidden sm:block w-px h-4 bg-blue-300 dark:bg-blue-700 mx-1" />

            {/* Sign Out */}
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onSignOut}
              className="text-blue-700 dark:text-blue-200 hover:text-blue-900 dark:hover:text-white hover:bg-blue-200 dark:hover:bg-blue-800 h-7 px-1.5"
            >
              <LogOut className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
