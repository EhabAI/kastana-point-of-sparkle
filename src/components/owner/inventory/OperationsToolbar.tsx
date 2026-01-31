import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOwnerContext } from "@/hooks/useOwnerContext";
import { Plus, ShoppingCart, ArrowUpDown, Trash2, ArrowLeftRight, ClipboardList, History } from "lucide-react";
import { ReceivePurchaseDialog } from "./ReceivePurchaseDialog";
import { AdjustmentDialog } from "./AdjustmentDialog";
import { WasteDialog } from "./WasteDialog";
import { TransferDialog } from "./TransferDialog";
import { StockCountDialog } from "./StockCountDialog";
import { StockCountHistoryDialog } from "./StockCountHistoryDialog";

interface OperationsToolbarProps {
  restaurantId: string;
  branchId?: string; // Optional - will use context if not provided
  isReadOnly?: boolean;
}

export function OperationsToolbar({ restaurantId, branchId: propBranchId, isReadOnly = false }: OperationsToolbarProps) {
  const { t } = useLanguage();
  const ownerContext = useOwnerContext();
  const effectiveBranchId = propBranchId || ownerContext.branchId;
  
  const [showReceive, setShowReceive] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [showWaste, setShowWaste] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showStockCount, setShowStockCount] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Block operations if no branch context
  if (isReadOnly || !effectiveBranchId) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" className="gap-2" onClick={() => setShowHistory(true)}>
          <History className="h-4 w-4" />
          {t("inv_stock_count_history")}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              {t("inv_new_operation")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-popover border shadow-lg z-50">
            <DropdownMenuItem onClick={() => setShowReceive(true)} className="gap-2 cursor-pointer">
              <ShoppingCart className="h-4 w-4 text-green-600" />
              {t("inv_receive_purchase")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAdjustment(true)} className="gap-2 cursor-pointer">
              <ArrowUpDown className="h-4 w-4 text-blue-600" />
              {t("inv_adjustment")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowWaste(true)} className="gap-2 cursor-pointer">
              <Trash2 className="h-4 w-4 text-red-600" />
              {t("inv_waste")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowTransfer(true)} className="gap-2 cursor-pointer">
              <ArrowLeftRight className="h-4 w-4 text-purple-600" />
              {t("inv_transfer")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowStockCount(true)} className="gap-2 cursor-pointer">
              <ClipboardList className="h-4 w-4 text-orange-600" />
              {t("inv_stock_count")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showReceive && (
        <ReceivePurchaseDialog
          restaurantId={restaurantId}
          open={showReceive}
          onOpenChange={setShowReceive}
        />
      )}

      {showAdjustment && (
        <AdjustmentDialog
          restaurantId={restaurantId}
          open={showAdjustment}
          onOpenChange={setShowAdjustment}
        />
      )}

      {showWaste && (
        <WasteDialog
          restaurantId={restaurantId}
          open={showWaste}
          onOpenChange={setShowWaste}
        />
      )}

      {showTransfer && (
        <TransferDialog
          restaurantId={restaurantId}
          open={showTransfer}
          onOpenChange={setShowTransfer}
        />
      )}

      {showStockCount && (
        <StockCountDialog
          restaurantId={restaurantId}
          open={showStockCount}
          onOpenChange={setShowStockCount}
        />
      )}

      {showHistory && (
        <StockCountHistoryDialog
          restaurantId={restaurantId}
          open={showHistory}
          onOpenChange={setShowHistory}
        />
      )}
    </>
  );
}
