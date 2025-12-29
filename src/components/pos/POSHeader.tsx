import { Button } from "@/components/ui/button";
import { LogOut, Clock, FileText, DollarSign, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          {shiftStatus === "open" ? "Shift Open" : "Shift Closed"}
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
              Held
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
                  Recent Orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onCashMovement}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Cash In/Out
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onViewZReport}>
                  <FileText className="h-4 w-4 mr-2" />
                  Z Report
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCloseShift} className="text-destructive">
                  <Clock className="h-4 w-4 mr-2" />
                  Close Shift
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : (
          <Button onClick={onOpenShift} size="sm">
            <Clock className="h-4 w-4 mr-1" />
            Open Shift
          </Button>
        )}

        <Button variant="ghost" size="sm" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
