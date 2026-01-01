import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Clock, Edit, ArrowRightLeft, ChevronDown, ChevronUp, XCircle, Scissors } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { OpenOrder } from "@/hooks/pos/useOpenOrders";
import type { BranchTable } from "@/hooks/pos/useBranchTables";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TableSelector } from "./TableSelector";

interface OpenOrdersListProps {
  orders: OpenOrder[];
  tables: BranchTable[];
  currency: string;
  onSelectOrder: (orderId: string) => void;
  onMoveToTable: (orderId: string, tableId: string, tableName: string, prevTableId?: string, prevTableName?: string) => void;
  onCloseOrder: (orderId: string, tableId?: string, tableName?: string) => void;
  onSplitOrder: (order: OpenOrder) => void;
  isLoading?: boolean;
}

export function OpenOrdersList({
  orders,
  tables,
  currency,
  onSelectOrder,
  onMoveToTable,
  onCloseOrder,
  onSplitOrder,
  isLoading,
}: OpenOrdersListProps) {
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedOrderForMove, setSelectedOrderForMove] = useState<OpenOrder | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  const getTableInfo = (notes: string | null): { id: string; name: string } | null => {
    if (!notes) return null;
    const match = notes.match(/table:(\S+)/);
    if (!match) return null;
    const table = tables.find((t) => t.id === match[1]);
    return table ? { id: table.id, name: table.table_name } : null;
  };

  const handleMoveClick = (order: OpenOrder) => {
    setSelectedOrderForMove(order);
    setSelectedTableId(null);
    setMoveDialogOpen(true);
  };

  const handleMoveConfirm = () => {
    if (selectedOrderForMove && selectedTableId) {
      const prevTable = getTableInfo(selectedOrderForMove.notes);
      const newTable = tables.find((t) => t.id === selectedTableId);
      if (newTable) {
        onMoveToTable(
          selectedOrderForMove.id,
          selectedTableId,
          newTable.table_name,
          prevTable?.id,
          prevTable?.name
        );
      }
      setMoveDialogOpen(false);
      setSelectedOrderForMove(null);
    }
  };

  if (orders.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
        <Clock className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-1">No Open Orders</h3>
        <p className="text-sm">Start a new order to see it here</p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            const tableInfo = getTableInfo(order.notes);
            const activeItems = order.order_items.filter((i) => !i.voided);
            const itemCount = activeItems.reduce((sum, item) => sum + item.quantity, 0);

            return (
              <Card key={order.id} className="overflow-hidden">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-base">
                        Order #{order.order_number}
                      </CardTitle>
                      <Badge 
                        variant={order.status === "confirmed" ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {order.status}
                      </Badge>
                      {tableInfo && (
                        <Badge variant="outline" className="text-xs">
                          {tableInfo.name}
                        </Badge>
                      )}
                      {!tableInfo && (
                        <Badge variant="outline" className="text-xs">
                          Takeaway
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="py-0 px-4">
                  <button
                    onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                    className="w-full flex items-center justify-between py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span>{itemCount} items</span>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="pb-3 space-y-1">
                      {activeItems.map((item) => (
                        <div key={item.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                          <div>
                            <span>{item.quantity}× {item.name}</span>
                            {item.notes && (
                              <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                            )}
                          </div>
                          <span className="text-muted-foreground">
                            {(item.price * item.quantity).toFixed(2)} {currency}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center py-2 border-t font-medium">
                    <span>Total</span>
                    <span className="text-lg">{order.total.toFixed(2)} {currency}</span>
                  </div>
                </CardContent>

                <CardFooter className="py-3 px-4 bg-muted/30 gap-2 flex-wrap">
                  {tableInfo && (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1 h-12 min-w-[120px]"
                        onClick={() => handleMoveClick(order)}
                        disabled={isLoading}
                      >
                        <ArrowRightLeft className="h-5 w-5 mr-2" />
                        Move
                      </Button>
                      {activeItems.length > 1 && (
                        <Button
                          variant="outline"
                          className="flex-1 h-12 min-w-[120px]"
                          onClick={() => onSplitOrder(order)}
                          disabled={isLoading}
                        >
                          <Scissors className="h-5 w-5 mr-2" />
                          Split
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 h-12 min-w-[120px]"
                    onClick={() => onCloseOrder(order.id, tableInfo?.id, tableInfo?.name)}
                    disabled={isLoading}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Close
                  </Button>
                  <Button
                    className="flex-1 h-12 min-w-[120px]"
                    onClick={() => onSelectOrder(order.id)}
                    disabled={isLoading}
                  >
                    <Edit className="h-5 w-5 mr-2" />
                    Edit / Pay
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Table</DialogTitle>
            <DialogDescription>
              Select a new table for order #{selectedOrderForMove?.order_number}
            </DialogDescription>
          </DialogHeader>
          <TableSelector
            tables={tables.filter((t) => !t.hasOpenOrder || getTableInfo(selectedOrderForMove?.notes || null)?.id === t.id)}
            selectedTableId={selectedTableId}
            onSelectTable={setSelectedTableId}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialogOpen(false)} className="h-12">
              Cancel
            </Button>
            <Button onClick={handleMoveConfirm} disabled={!selectedTableId} className="h-12">
              Move Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
