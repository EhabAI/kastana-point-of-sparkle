import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useCashierSession,
  NoCashierRoleError,
  useCurrentShift,
  useOpenShift,
  useCloseShift,
  useCashMovement,
  useCurrentOrder,
  useHeldOrders,
  useRecentOrders,
  useCreateOrder,
  useUpdateOrder,
  useHoldOrder,
  useResumeOrder,
  useCancelOrder,
  useReopenOrder,
  useRestaurantSettings,
  useZReport,
  useCashierCategories,
  useCashierMenuItems,
  useBranchTables,
  usePendingOrders,
  useConfirmPendingOrder,
  useRejectPendingOrder,
  useOpenOrders,
  useMoveOrderToTable,
  useCloseOrder,
  useSplitOrder,
  useMergeOrders,
  useCashierPaymentMethods,
  useMenuItemModifiers,
  useAddOrderItemModifiers,
  useTransferOrderItem,
} from "@/hooks/pos";
import type { SelectedModifier } from "@/hooks/pos/useModifiers";
import { useCreateRefund } from "@/hooks/pos/useRefunds";
import { useAuditLog } from "@/hooks/pos/useAuditLog";
import {
  useAddOrderItem,
  useUpdateOrderItemQuantity,
  useRemoveOrderItem,
  useVoidOrderItem,
  useUpdateOrderItemNotes,
} from "@/hooks/pos/useOrderItems";
import { useAddPayment, useCompleteOrder } from "@/hooks/pos/usePayments";
import {
  POSHeader,
  POSTabControl,
  CategoryList,
  MenuItemGrid,
  OrderPanel,
  QRPendingOrders,
  OpenOrdersList,
  TableCard,
  type POSTab,
} from "@/components/pos";
import {
  ShiftDialog,
  ShiftSummaryDialog,
  PaymentDialog,
  DiscountDialog,
  HeldOrdersDialog,
  RecentOrdersDialog,
  CancelOrderDialog,
  CashMovementDialog,
  ZReportDialog,
  ItemNotesDialog,
  NewOrderDialog,
  ModifierDialog,
  MergeOrdersDialog,
  SplitOrderDialog,
  ReceiptDialog,
  RefundDialog,
  VoidItemDialog,
  ConfirmRemoveLastItemDialog,
  ReopenOrderDialog,
  TransferItemDialog,
} from "@/components/pos/dialogs";
import type { RecentOrder } from "@/components/pos/dialogs/RecentOrdersDialog";
import type { OrderType } from "@/components/pos/OrderTypeSelector";

interface MenuItemWithModifiers {
  id: string;
  name: string;
  price: number;
}

export default function POS() {
  const { signOut, user } = useAuth();
  const { data: session, isLoading: sessionLoading, error: sessionError } = useCashierSession();
  const restaurant = session?.restaurant;
  const branch = session?.branch;
  const { data: currentShift, isLoading: shiftLoading } = useCurrentShift();
  const { data: settings } = useRestaurantSettings();
  const { data: categories = [] } = useCashierCategories();
  const { data: heldOrders = [] } = useHeldOrders(currentShift?.id);
  const { data: recentOrders = [] } = useRecentOrders(currentShift?.id);
  const { data: currentOrder, refetch: refetchOrder } = useCurrentOrder(currentShift?.id);
  const { data: zReportData, isLoading: zReportLoading } = useZReport(currentShift?.id);
  const { data: tables = [], isLoading: tablesLoading } = useBranchTables(branch?.id);
  const { data: pendingOrders = [] } = usePendingOrders(branch?.id);
  const { data: openOrders = [] } = useOpenOrders(branch?.id);
  const { data: paymentMethods = [] } = useCashierPaymentMethods(branch?.id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const { data: menuItems = [], isLoading: itemsLoading } = useCashierMenuItems(selectedCategoryId);

  // B1: Menu item search
  const [menuSearch, setMenuSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredMenuItems = useMemo(() => {
    if (!menuSearch.trim()) return menuItems;
    const query = menuSearch.toLowerCase().trim();
    return menuItems.filter((item: { name: string }) => 
      item.name.toLowerCase().includes(query)
    );
  }, [menuItems, menuSearch]);

  // Tab state
  const [activeTab, setActiveTab] = useState<POSTab>("new-order");
  const [newOrderDialogOpen, setNewOrderDialogOpen] = useState(false);

  // Mutations
  const openShiftMutation = useOpenShift();
  const closeShiftMutation = useCloseShift();
  const cashMovementMutation = useCashMovement();
  const createOrderMutation = useCreateOrder();
  const updateOrderMutation = useUpdateOrder();
  const holdOrderMutation = useHoldOrder();
  const resumeOrderMutation = useResumeOrder();
  const cancelOrderMutation = useCancelOrder();
  const addItemMutation = useAddOrderItem();
  const updateQuantityMutation = useUpdateOrderItemQuantity();
  const removeItemMutation = useRemoveOrderItem();
  const voidItemMutation = useVoidOrderItem();
  const updateNotesMutation = useUpdateOrderItemNotes();
  const addPaymentMutation = useAddPayment();
  const completeOrderMutation = useCompleteOrder();
  const confirmPendingMutation = useConfirmPendingOrder();
  const rejectPendingMutation = useRejectPendingOrder();
  const moveToTableMutation = useMoveOrderToTable();
  const closeOrderMutation = useCloseOrder();
  const splitOrderMutation = useSplitOrder();
  const addModifiersMutation = useAddOrderItemModifiers();
  const mergeOrdersMutation = useMergeOrders();
  const createRefundMutation = useCreateRefund();
  const reopenOrderMutation = useReopenOrder();
  const auditLogMutation = useAuditLog();
  const transferItemMutation = useTransferOrderItem();
  
  // Dialog states
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [shiftDialogMode, setShiftDialogMode] = useState<"open" | "close">("open");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [heldOrdersDialogOpen, setHeldOrdersDialogOpen] = useState(false);
  const [recentOrdersDialogOpen, setRecentOrdersDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cashMovementDialogOpen, setCashMovementDialogOpen] = useState(false);
  const [zReportDialogOpen, setZReportDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [modifierDialogOpen, setModifierDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [selectedOrderForSplit, setSelectedOrderForSplit] = useState<typeof openOrders[0] | null>(null);
  const [selectedItemForModifiers, setSelectedItemForModifiers] = useState<MenuItemWithModifiers | null>(null);
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<{
    id: string;
    name: string;
    notes?: string | null;
  } | null>(null);
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedItemForVoid, setSelectedItemForVoid] = useState<{
    id: string;
    name: string;
    quantity: number;
  } | null>(null);
  const [summaryDialogOpen, setSummaryDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<RecentOrder | null>(null);
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [selectedOrderForRefund, setSelectedOrderForRefund] = useState<RecentOrder | null>(null);
  const [removeLastItemDialogOpen, setRemoveLastItemDialogOpen] = useState(false);
  const [selectedItemForRemoval, setSelectedItemForRemoval] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [selectedOrderForReopen, setSelectedOrderForReopen] = useState<RecentOrder | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedItemForTransfer, setSelectedItemForTransfer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [closedShiftData, setClosedShiftData] = useState<{
    openingCash: number;
    openedAt: string;
    closedAt: string;
    orderCount: number;
  } | null>(null);

  // Merge orders state
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  // Fetch modifiers for selected item
  const { data: itemModifierGroups = [] } = useMenuItemModifiers(selectedItemForModifiers?.id);

  const currency = settings?.currency || "JOD";
  const taxRate = settings?.tax_rate || 0.16;
  const serviceChargeRate = settings?.service_charge_rate || 0;
  const shiftOpen = currentShift?.status === "open";

  // Build map: tableId -> order (using table_id column)
  const tableOrderMap = useMemo(() => {
    const map = new Map<string, typeof openOrders[0]>();
    for (const order of openOrders) {
      if (order.table_id) {
        // Keep the latest order for resume functionality
        if (!map.has(order.table_id)) {
          map.set(order.table_id, order);
        }
      }
    }
    return map;
  }, [openOrders]);

  // Build map: tableId -> order count (for multiple orders indicator)
  const tableOrderCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const order of openOrders) {
      if (order.table_id) {
        map.set(order.table_id, (map.get(order.table_id) || 0) + 1);
      }
    }
    return map;
  }, [openOrders]);

  // Build map: tableId -> oldest order created_at (for occupancy timer)
  const tableOldestOrderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const order of openOrders) {
      if (order.table_id) {
        const existing = map.get(order.table_id);
        if (!existing || new Date(order.created_at) < new Date(existing)) {
          map.set(order.table_id, order.created_at);
        }
      }
    }
    return map;
  }, [openOrders]);

  const occupiedTablesCount = tableOrderMap.size;

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Clear search when category changes
  useEffect(() => {
    setMenuSearch("");
  }, [selectedCategoryId]);

  // Calculate order totals - MUST be before keyboard shortcuts useEffect
  const orderItems = currentOrder?.order_items?.filter((item: { voided: boolean }) => !item.voided) || [];

  // B2: Keyboard shortcuts - MUST be before any early returns
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      // Only work when shift is open and on new-order tab
      if (!shiftOpen || activeTab !== "new-order") return;

      switch (e.key) {
        case "Enter":
          // Trigger Pay if there are items
          if (orderItems.length > 0 && currentOrder) {
            setPaymentDialogOpen(true);
          }
          break;
        case "h":
        case "H":
          // Hold current order - use mutation directly
          if (currentOrder && orderItems.length > 0) {
            holdOrderMutation.mutate(currentOrder.id);
          }
          break;
        case "Escape":
          // Open cancel dialog
          if (currentOrder) {
            setCancelDialogOpen(true);
          }
          break;
      }
    };

    const handleKeyDownWithPrevent = (e: KeyboardEvent) => {
      // Ctrl+F to focus search
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keydown", handleKeyDownWithPrevent);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keydown", handleKeyDownWithPrevent);
    };
  }, [shiftOpen, activeTab, orderItems.length, currentOrder]);

  const subtotal = orderItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + Number(item.price) * item.quantity,
    0,
  );

  const calculateTotals = useCallback(
    (sub: number, discType?: string | null, discVal?: number | null) => {
      let discountAmount = 0;
      if (discVal && discVal > 0) {
        discountAmount = discType === "percentage" ? (sub * discVal) / 100 : discVal;
      }
      const afterDiscount = sub - discountAmount;
      const serviceCharge = afterDiscount * serviceChargeRate;
      const taxAmount = (afterDiscount + serviceCharge) * taxRate;
      let total = afterDiscount + serviceCharge + taxAmount;
      
      if (settings?.rounding_enabled) {
        total = Math.ceil(total);
      }
      
      return { discountAmount, serviceCharge, taxAmount, total };
    },
    [serviceChargeRate, taxRate, settings?.rounding_enabled],
  );

  const { discountAmount, serviceCharge, taxAmount, total } = calculateTotals(
    subtotal,
    currentOrder?.discount_type,
    currentOrder?.discount_value,
  );

  // Handlers
  const handleOpenShift = () => {
    setShiftDialogMode("open");
    setShiftDialogOpen(true);
  };

  const handleCloseShift = () => {
    setShiftDialogMode("close");
    setShiftDialogOpen(true);
  };

  const handleShiftConfirm = async (amount: number) => {
    try {
      if (shiftDialogMode === "open") {
        await openShiftMutation.mutateAsync(amount);
        toast.success("Shift opened");
      } else {
        if (currentShift) {
          const closedAt = new Date().toISOString();
          const orderCount = recentOrders.length;

          await closeShiftMutation.mutateAsync({ shiftId: currentShift.id, closingCash: amount });

          setClosedShiftData({
            openingCash: currentShift.opening_cash,
            openedAt: currentShift.opened_at,
            closedAt,
            orderCount,
          });
          setSummaryDialogOpen(true);
          toast.success("Shift closed");
        }
      }
      setShiftDialogOpen(false);
    } catch (error) {
      toast.error("Failed to " + shiftDialogMode + " shift");
    }
  };

  const handleNewOrder = async (
    orderType: OrderType,
    tableId: string | null,
    customerInfo?: { name: string; phone: string }
  ) => {
    if (!currentShift || !branch || !restaurant) return;

    try {
      await createOrderMutation.mutateAsync({
        shiftId: currentShift.id,
        taxRate,
        branchId: branch.id,
        restaurantId: restaurant.id,
        orderType,
        tableId: orderType === "takeaway" ? null : tableId,
        customerInfo,
      });
      setNewOrderDialogOpen(false);
      setActiveTab("new-order");
      toast.success("Order created");
    } catch (error) {
      toast.error("Failed to create order");
    }
  };

  const handleSelectItem = (menuItem: { id: string; name: string; price: number }) => {
    if (!currentShift || !branch) return;

    if (!currentOrder?.id) {
      // Open new order dialog if no current order
      setNewOrderDialogOpen(true);
      return;
    }

    // Open modifier dialog - it will check if modifiers exist
    setSelectedItemForModifiers(menuItem);
    setModifierDialogOpen(true);
  };

  const handleAddItemWithModifiers = async (
    menuItem: MenuItemWithModifiers,
    modifiers: SelectedModifier[]
  ) => {
    if (!currentOrder?.id || !restaurant) return;

    try {
      // Calculate price with modifiers
      const modifierTotal = modifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
      const finalPrice = menuItem.price + modifierTotal;
      const menuItemWithPrice = { ...menuItem, price: finalPrice };

      // Add item to order
      const orderItem = await addItemMutation.mutateAsync({
        orderId: currentOrder.id,
        restaurantId: restaurant.id,
        menuItem: menuItemWithPrice,
      });

      // Add modifiers if any
      if (modifiers.length > 0 && orderItem) {
        await addModifiersMutation.mutateAsync({
          orderItemId: orderItem.id,
          modifiers,
        });
      }

      await refetchOrder();

      // Update order totals
      const items = [...orderItems, { price: finalPrice, quantity: 1 }];
      const newSubtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const totals = calculateTotals(newSubtotal, currentOrder?.discount_type, currentOrder?.discount_value);

      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });

      setSelectedItemForModifiers(null);
    } catch (error) {
      toast.error("Failed to add item");
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    try {
      await updateQuantityMutation.mutateAsync({ itemId, quantity });
      await refetchOrder();
    } catch (error) {
      toast.error("Failed to update quantity");
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    // Check if this is the last non-voided item
    const activeItems = currentOrder?.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    if (activeItems.length === 1) {
      const item = activeItems[0];
      setSelectedItemForRemoval({ id: item.id, name: item.name });
      setRemoveLastItemDialogOpen(true);
      return;
    }
    
    try {
      await removeItemMutation.mutateAsync(itemId);
      await refetchOrder();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleConfirmRemoveLastItem = async () => {
    if (!selectedItemForRemoval) return;
    try {
      await removeItemMutation.mutateAsync(selectedItemForRemoval.id);
      await refetchOrder();
      setRemoveLastItemDialogOpen(false);
      setSelectedItemForRemoval(null);
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleVoidItem = (itemId: string) => {
    // Only allow void on open orders
    if (currentOrder?.status !== "open") {
      toast.error("Can only void items on open orders");
      return;
    }
    const item = currentOrder?.order_items?.find((i: { id: string }) => i.id === itemId);
    if (item) {
      setSelectedItemForVoid({ id: item.id, name: item.name, quantity: item.quantity });
      setVoidDialogOpen(true);
    }
  };

  const handleVoidConfirm = async (reason: string) => {
    if (!selectedItemForVoid) return;
    try {
      await voidItemMutation.mutateAsync({ itemId: selectedItemForVoid.id, reason });
      setVoidDialogOpen(false);
      setSelectedItemForVoid(null);
      await refetchOrder();
      toast.success("Item voided");
    } catch (error) {
      toast.error("Failed to void item");
    }
  };

  const handleAddNotes = (itemId: string) => {
    const item = currentOrder?.order_items?.find((i: { id: string }) => i.id === itemId);
    if (item) {
      setSelectedItemForNotes({ id: item.id, name: item.name, notes: item.notes });
      setNotesDialogOpen(true);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!selectedItemForNotes) return;
    try {
      await updateNotesMutation.mutateAsync({ itemId: selectedItemForNotes.id, notes });
      setNotesDialogOpen(false);
      setSelectedItemForNotes(null);
      await refetchOrder();
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const handleApplyDiscount = async (type: "percentage" | "fixed", value: number) => {
    if (!currentOrder) return;
    try {
      const totals = calculateTotals(subtotal, type, value);
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          discount_type: type,
          discount_value: value,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      toast.success("Discount applied");
    } catch (error) {
      toast.error("Failed to apply discount");
    }
  };

  const handleClearDiscount = async () => {
    if (!currentOrder) return;
    try {
      const totals = calculateTotals(subtotal, null, null);
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          discount_type: null,
          discount_value: null,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      toast.success("Discount removed");
    } catch (error) {
      toast.error("Failed to remove discount");
    }
  };

  const handlePay = () => setPaymentDialogOpen(true);

  const handlePaymentConfirm = async (payments: { method: string; amount: number }[]) => {
    if (!currentOrder) return;
    try {
      for (const payment of payments) {
        await addPaymentMutation.mutateAsync({
          orderId: currentOrder.id,
          method: payment.method,
          amount: payment.amount,
        });
      }
      await completeOrderMutation.mutateAsync(currentOrder.id);
      setPaymentDialogOpen(false);
      toast.success("Payment complete");
    } catch (error) {
      toast.error("Payment failed");
    }
  };

  const handleHoldOrder = async () => {
    if (!currentOrder) return;
    try {
      await holdOrderMutation.mutateAsync(currentOrder.id);
      toast.success("Order held");
    } catch (error) {
      toast.error("Failed to hold order");
    }
  };

  const handleResumeOrder = async (orderId: string) => {
    try {
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      toast.success("Order resumed");
    } catch (error) {
      toast.error("Failed to resume order");
    }
  };

  const handleCancelOrder = async (reason: string) => {
    if (!currentOrder) return;
    try {
      await cancelOrderMutation.mutateAsync({ orderId: currentOrder.id, reason });
      setCancelDialogOpen(false);
      toast.success("Order cancelled");
    } catch (error) {
      toast.error("Failed to cancel order");
    }
  };

  const handleCashMovement = async (type: "cash_in" | "cash_out", amount: number, reason?: string) => {
    if (!currentShift) return;
    try {
      await cashMovementMutation.mutateAsync({ shiftId: currentShift.id, type, amount, reason });
      setCashMovementDialogOpen(false);
      toast.success(`Cash ${type === "cash_in" ? "added" : "removed"}`);
    } catch (error) {
      toast.error("Failed to record cash movement");
    }
  };

  const handleViewReceipt = (order: RecentOrder) => {
    setSelectedOrderForReceipt(order);
    setReceiptDialogOpen(true);
  };

  const handleRefund = (order: RecentOrder) => {
    // Only allow refunds on paid orders
    if (order.status !== "paid") {
      toast.error("Can only refund paid orders");
      return;
    }
    setSelectedOrderForRefund(order);
    setRefundDialogOpen(true);
  };

  const handleRefundConfirm = async (data: {
    refundType: "full" | "partial";
    amount: number;
    reason: string;
  }) => {
    if (!selectedOrderForRefund) return;
    try {
      await createRefundMutation.mutateAsync({
        orderId: selectedOrderForRefund.id,
        amount: data.amount,
        refundType: data.refundType,
        reason: data.reason,
      });
      toast.success("Refund processed successfully");
      setRefundDialogOpen(false);
      setReceiptDialogOpen(false);
      setSelectedOrderForRefund(null);
    } catch (error) {
      toast.error("Failed to process refund");
      throw error;
    }
  };

  const handleReopen = (order: RecentOrder) => {
    // Only allow reopen on paid orders without refunds
    if (order.status !== "paid") {
      toast.error("Can only reopen paid orders");
      return;
    }
    if (order.refunds && order.refunds.length > 0) {
      toast.error("Cannot reopen refunded orders");
      return;
    }
    setSelectedOrderForReopen(order);
    setReopenDialogOpen(true);
  };

  const handleReopenConfirm = async () => {
    if (!selectedOrderForReopen) return;
    try {
      await reopenOrderMutation.mutateAsync(selectedOrderForReopen.id);
      
      // Log the audit
      await auditLogMutation.mutateAsync({
        entityType: "order",
        entityId: selectedOrderForReopen.id,
        action: "order_reopen",
        details: {
          order_number: selectedOrderForReopen.order_number,
          total: selectedOrderForReopen.total,
        },
      });

      toast.success(`Order #${selectedOrderForReopen.order_number} reopened`);
      setReopenDialogOpen(false);
      setRecentOrdersDialogOpen(false);
      setSelectedOrderForReopen(null);
    } catch (error) {
      toast.error("Failed to reopen order");
    }
  };

  const handleTransferItem = (itemId: string) => {
    // Only allow on open orders with more than 1 item
    if (currentOrder?.status !== "open") {
      toast.error("Can only transfer items from open orders");
      return;
    }
    const activeItems = currentOrder?.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    if (activeItems.length <= 1) {
      toast.error("Order must have at least 2 items to transfer");
      return;
    }
    const item = currentOrder?.order_items?.find((i: { id: string }) => i.id === itemId);
    if (item?.voided) {
      toast.error("Cannot transfer voided items");
      return;
    }
    if (item) {
      setSelectedItemForTransfer({ id: item.id, name: item.name });
      setTransferDialogOpen(true);
    }
  };

  const handleTransferConfirm = async (targetOrderId: string) => {
    if (!selectedItemForTransfer || !currentOrder) return;
    try {
      await transferItemMutation.mutateAsync({
        itemId: selectedItemForTransfer.id,
        sourceOrderId: currentOrder.id,
        targetOrderId,
      });
      toast.success(`${selectedItemForTransfer.name} transferred`);
      setTransferDialogOpen(false);
      setSelectedItemForTransfer(null);
      await refetchOrder();
    } catch (error) {
      toast.error("Failed to transfer item");
    }
  };

  const handleConfirmPending = async (orderId: string) => {
    try {
      await confirmPendingMutation.mutateAsync(orderId);
      toast.success("Order confirmed");
    } catch (error) {
      toast.error("Failed to confirm order");
    }
  };

  const handleRejectPending = async (orderId: string, reason?: string) => {
    try {
      await rejectPendingMutation.mutateAsync({ orderId, reason });
      toast.success("Order rejected");
    } catch (error) {
      toast.error("Failed to reject order");
    }
  };

  const handleSelectOpenOrder = async (orderId: string) => {
    try {
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      toast.success("Order loaded");
    } catch (error) {
      toast.error("Failed to load order");
    }
  };

  const handleMoveToTable = async (
    orderId: string,
    tableId: string,
    tableName: string,
    prevTableId?: string,
    prevTableName?: string,
  ) => {
    try {
      await moveToTableMutation.mutateAsync({
        orderId,
        tableId,
        tableName,
        previousTableId: prevTableId,
        previousTableName: prevTableName,
      });
      toast.success(`Order moved to ${tableName}`);
    } catch (error) {
      toast.error("Failed to move order");
    }
  };

  const handleCloseOrder = async (orderId: string, tableId?: string, tableName?: string) => {
    try {
      await closeOrderMutation.mutateAsync({ orderId, tableId, tableName });
      toast.success("Order closed");
    } catch (error) {
      toast.error("Failed to close order");
    }
  };

  const handleSplitOrder = (order: typeof openOrders[0]) => {
    setSelectedOrderForSplit(order);
    setSplitDialogOpen(true);
  };

  const handleConfirmSplit = async (itemsToSplit: { itemId: string; quantity: number }[]) => {
    if (!selectedOrderForSplit || !currentShift || !branch) return;
    try {
      await splitOrderMutation.mutateAsync({
        originalOrder: selectedOrderForSplit,
        itemsToSplit,
        shiftId: currentShift.id,
        branchId: branch.id,
        taxRate,
      });
      setSplitDialogOpen(false);
      setSelectedOrderForSplit(null);
      toast.success("Order split successfully");
    } catch (error) {
      toast.error("Failed to split order");
    }
  };

  const handleTableClick = async (tableId: string) => {
    const existingOrder = tableOrderMap.get(tableId);

    // If in merge mode and table is occupied, add to selection
    if (mergeSelection.length > 0 && mergeSelection.length < 2) {
      if (!existingOrder) {
        toast.error("Select an occupied table to merge");
        return;
      }
      if (mergeSelection.includes(tableId)) {
        // Deselect
        setMergeSelection([]);
        return;
      }
      // Add second table and open dialog
      setMergeSelection([...mergeSelection, tableId]);
      setMergeDialogOpen(true);
      return;
    }

    if (existingOrder) {
      // Occupied: Load existing order
      try {
        await resumeOrderMutation.mutateAsync(existingOrder.id);
        setActiveTab("new-order");
        toast.success("Order loaded");
      } catch (error) {
        toast.error("Failed to load order");
      }
    } else {
      // Available: Create new dine-in order
      if (!currentShift || !branch || !restaurant) return;
      try {
        await createOrderMutation.mutateAsync({
          shiftId: currentShift.id,
          taxRate,
          branchId: branch.id,
          restaurantId: restaurant.id,
          orderType: "dine-in",
          tableId,
        });
        setActiveTab("new-order");
        toast.success("Order created");
      } catch (error) {
        toast.error("Failed to create order");
      }
    }
  };

  const handleStartMerge = (tableId: string) => {
    const order = tableOrderMap.get(tableId);
    if (!order) {
      toast.error("Select an occupied table first");
      return;
    }
    setMergeSelection([tableId]);
    toast.info("Select second table to merge");
  };

  const handleCancelMerge = () => {
    setMergeSelection([]);
    setMergeDialogOpen(false);
  };

  const handleConfirmMerge = async () => {
    if (mergeSelection.length !== 2 || !restaurant) return;

    const order1 = tableOrderMap.get(mergeSelection[0]);
    const order2 = tableOrderMap.get(mergeSelection[1]);

    if (!order1 || !order2) {
      toast.error("Orders not found");
      handleCancelMerge();
      return;
    }

    // Determine primary (oldest) and secondary (newest)
    const order1Date = new Date(order1.created_at);
    const order2Date = new Date(order2.created_at);
    const primaryOrder = order1Date <= order2Date ? order1 : order2;
    const secondaryOrder = order1Date <= order2Date ? order2 : order1;

    try {
      await mergeOrdersMutation.mutateAsync({
        primaryOrderId: primaryOrder.id,
        secondaryOrderId: secondaryOrder.id,
        restaurantId: restaurant.id,
      });
      toast.success(`Orders merged into #${primaryOrder.order_number}`);
      handleCancelMerge();
    } catch (error) {
      toast.error("Failed to merge orders");
    }
  };

  // Get merge data for dialog
  const getMergeData = () => {
    if (mergeSelection.length !== 2) return null;
    const order1 = tableOrderMap.get(mergeSelection[0]);
    const order2 = tableOrderMap.get(mergeSelection[1]);
    if (!order1 || !order2) return null;

    const table1 = tables.find(t => t.id === mergeSelection[0]);
    const table2 = tables.find(t => t.id === mergeSelection[1]);

    const order1Date = new Date(order1.created_at);
    const order2Date = new Date(order2.created_at);
    const isPrimaryFirst = order1Date <= order2Date;

    return {
      primaryTableName: isPrimaryFirst ? table1?.table_name || "Table" : table2?.table_name || "Table",
      secondaryTableName: isPrimaryFirst ? table2?.table_name || "Table" : table1?.table_name || "Table",
      primaryOrderNumber: isPrimaryFirst ? order1.order_number : order2.order_number,
      secondaryOrderNumber: isPrimaryFirst ? order2.order_number : order1.order_number,
    };
  };

  const mergeData = getMergeData();

  if (sessionLoading || shiftLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (sessionError instanceof NoCashierRoleError || !session || !restaurant || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">No restaurant or branch assigned to this cashier.</p>
        <button onClick={signOut} className="text-primary underline">
          Sign Out
        </button>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-destructive">Failed to load session. Please try again.</p>
        <button onClick={signOut} className="text-primary underline">
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <POSHeader
        restaurantName={restaurant.name}
        restaurantLogo={restaurant.logo_url}
        cashierEmail={user?.email || ""}
        shiftStatus={shiftOpen ? "open" : "closed"}
        onSignOut={signOut}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onCashMovement={() => setCashMovementDialogOpen(true)}
        onViewHeldOrders={() => setHeldOrdersDialogOpen(true)}
        onViewRecentOrders={() => setRecentOrdersDialogOpen(true)}
        onViewZReport={() => setZReportDialogOpen(true)}
        heldOrdersCount={heldOrders.length}
      />

      {!shiftOpen ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8 rounded-lg border bg-card max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">No Active Shift</h2>
            <p className="text-muted-foreground mb-6">You must open a shift before starting work.</p>
            <button
              onClick={handleOpenShift}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors min-h-[48px]"
            >
              Open Shift
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Control */}
          <div className="p-2 border-b bg-card">
            <POSTabControl
              activeTab={activeTab}
              onTabChange={setActiveTab}
              pendingCount={pendingOrders.length}
              openCount={openOrders.length}
              occupiedTablesCount={occupiedTablesCount}
            />
          </div>

          {/* Tab Content */}
          {activeTab === "new-order" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Categories */}
              <div className="w-48 border-r bg-card">
                <CategoryList
                  categories={categories}
                  selectedCategoryId={selectedCategoryId}
                  onSelectCategory={setSelectedCategoryId}
                />
              </div>

              {/* Menu Items */}
              <div className="flex-1 bg-muted/30 flex flex-col">
                {/* B1: Search Input */}
                <div className="p-2 border-b bg-card">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    placeholder="Search items... (Ctrl+F)"
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <MenuItemGrid
                    items={filteredMenuItems}
                    currency={currency}
                    onSelectItem={handleSelectItem}
                    isLoading={itemsLoading}
                  />
                </div>
              </div>

              {/* Order Panel */}
              <div className="w-80 border-l">
                <OrderPanel
                  orderNumber={currentOrder?.order_number}
                  orderNotes={currentOrder?.order_notes}
                  items={currentOrder?.order_items || []}
                  subtotal={subtotal}
                  discountType={currentOrder?.discount_type}
                  discountValue={currentOrder?.discount_value ? Number(currentOrder.discount_value) : null}
                  taxRate={taxRate}
                  taxAmount={taxAmount}
                  serviceCharge={serviceCharge}
                  total={total}
                  currency={currency}
                  onUpdateQuantity={handleUpdateQuantity}
                  onRemoveItem={handleRemoveItem}
                  onVoidItem={handleVoidItem}
                  onAddNotes={handleAddNotes}
                  onApplyDiscount={() => setDiscountDialogOpen(true)}
                  onPay={handlePay}
                  onHoldOrder={handleHoldOrder}
                  onCancelOrder={() => setCancelDialogOpen(true)}
                  hasItems={orderItems.length > 0}
                  onTransferItem={handleTransferItem}
                  showTransfer={currentOrder?.status === "open" && orderItems.length > 1 && openOrders.length > 1}
                />
              </div>
            </div>
          )}

          {activeTab === "qr-pending" && (
            <QRPendingOrders
              orders={pendingOrders}
              currency={currency}
              onConfirm={handleConfirmPending}
              onReject={handleRejectPending}
              isLoading={confirmPendingMutation.isPending || rejectPendingMutation.isPending}
            />
          )}

          {activeTab === "open-orders" && (
            <OpenOrdersList
              orders={openOrders}
              tables={tables}
              currency={currency}
              onSelectOrder={handleSelectOpenOrder}
              onMoveToTable={handleMoveToTable}
              onCloseOrder={handleCloseOrder}
              onSplitOrder={handleSplitOrder}
              isLoading={resumeOrderMutation.isPending || moveToTableMutation.isPending || closeOrderMutation.isPending || splitOrderMutation.isPending}
            />
          )}

          {activeTab === "tables" && (
            <div className="flex-1 p-4 overflow-auto bg-gradient-to-br from-muted/30 to-muted/10">
              {/* Merge mode banner */}
              {mergeSelection.length > 0 && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {mergeSelection.length === 1 
                      ? "Select second table to merge" 
                      : "Ready to merge"}
                  </span>
                  <button
                    onClick={handleCancelMerge}
                    className="text-sm text-destructive hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {tablesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg font-medium">No tables found</p>
                  <p className="text-sm mt-1">Ask owner to create tables for this branch.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tables.map((table) => {
                    const order = tableOrderMap.get(table.id);
                    const isOccupied = !!order;
                    const isSelected = mergeSelection.includes(table.id);
                    const orderCount = tableOrderCountMap.get(table.id);
                    const oldestOrderCreatedAt = tableOldestOrderMap.get(table.id);

                    return (
                      <div key={table.id} className="relative">
                        <TableCard
                          tableName={table.table_name}
                          capacity={table.capacity || 4}
                          isOccupied={isOccupied}
                          orderNumber={order?.order_number}
                          orderCount={orderCount}
                          orderCreatedAt={oldestOrderCreatedAt}
                          onClick={() => handleTableClick(table.id)}
                          disabled={createOrderMutation.isPending || resumeOrderMutation.isPending || mergeOrdersMutation.isPending}
                          selected={isSelected}
                        />
                        {/* Merge button for occupied tables when not in merge mode */}
                        {isOccupied && mergeSelection.length === 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartMerge(table.id);
                            }}
                            className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center hover:bg-primary/90 shadow-md"
                            title="Merge with another table"
                          >
                            M
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Dialogs */}
      <ShiftDialog
        open={shiftDialogOpen}
        onOpenChange={setShiftDialogOpen}
        mode={shiftDialogMode}
        onConfirm={handleShiftConfirm}
        isLoading={openShiftMutation.isPending || closeShiftMutation.isPending}
        expectedCash={zReportData?.expectedCash}
        currency={currency}
      />

      <NewOrderDialog
        open={newOrderDialogOpen}
        onOpenChange={setNewOrderDialogOpen}
        tables={tables}
        tablesLoading={tablesLoading}
        onConfirm={handleNewOrder}
        isLoading={createOrderMutation.isPending}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        currency={currency}
        onConfirm={handlePaymentConfirm}
        isLoading={addPaymentMutation.isPending}
        paymentMethods={paymentMethods}
      />

      <DiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        currentSubtotal={subtotal}
        currency={currency}
        onApply={handleApplyDiscount}
        onClear={handleClearDiscount}
        currentDiscountType={currentOrder?.discount_type}
        currentDiscountValue={currentOrder?.discount_value ? Number(currentOrder.discount_value) : null}
      />

      <HeldOrdersDialog
        open={heldOrdersDialogOpen}
        onOpenChange={setHeldOrdersDialogOpen}
        orders={heldOrders}
        currency={currency}
        onResumeOrder={handleResumeOrder}
      />

      <RecentOrdersDialog
        open={recentOrdersDialogOpen}
        onOpenChange={setRecentOrdersDialogOpen}
        orders={recentOrders as RecentOrder[]}
        currency={currency}
        onViewReceipt={handleViewReceipt}
        onRefund={handleRefund}
        onReopen={handleReopen}
      />

      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        order={selectedOrderForReceipt}
        restaurant={restaurant}
        currency={currency}
        tables={tables}
        onRefund={handleRefund}
      />

      {selectedOrderForRefund && (
        <RefundDialog
          open={refundDialogOpen}
          onOpenChange={(open) => {
            setRefundDialogOpen(open);
            if (!open) setSelectedOrderForRefund(null);
          }}
          orderNumber={selectedOrderForRefund.order_number}
          totalPaid={Number(selectedOrderForRefund.total)}
          currency={currency}
          onConfirm={handleRefundConfirm}
          isProcessing={createRefundMutation.isPending}
        />
      )}

      {selectedOrderForReopen && (
        <ReopenOrderDialog
          open={reopenDialogOpen}
          onOpenChange={(open) => {
            setReopenDialogOpen(open);
            if (!open) setSelectedOrderForReopen(null);
          }}
          orderNumber={selectedOrderForReopen.order_number}
          onConfirm={handleReopenConfirm}
          isLoading={reopenOrderMutation.isPending}
        />
      )}

      {selectedItemForVoid && (
        <VoidItemDialog
          open={voidDialogOpen}
          onOpenChange={(open) => {
            setVoidDialogOpen(open);
            if (!open) setSelectedItemForVoid(null);
          }}
          itemName={`${selectedItemForVoid.name} (×${selectedItemForVoid.quantity})`}
          onConfirm={handleVoidConfirm}
          isLoading={voidItemMutation.isPending}
        />
      )}

      <CancelOrderDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        orderNumber={currentOrder?.order_number}
        onConfirm={handleCancelOrder}
        isLoading={cancelOrderMutation.isPending}
      />

      {selectedItemForRemoval && (
        <ConfirmRemoveLastItemDialog
          open={removeLastItemDialogOpen}
          onOpenChange={(open) => {
            setRemoveLastItemDialogOpen(open);
            if (!open) setSelectedItemForRemoval(null);
          }}
          itemName={selectedItemForRemoval.name}
          onConfirm={handleConfirmRemoveLastItem}
          isLoading={removeItemMutation.isPending}
        />
      )}

      <CashMovementDialog
        open={cashMovementDialogOpen}
        onOpenChange={setCashMovementDialogOpen}
        currency={currency}
        onConfirm={handleCashMovement}
        isLoading={cashMovementMutation.isPending}
      />

      <ZReportDialog
        open={zReportDialogOpen}
        onOpenChange={setZReportDialogOpen}
        report={zReportData || null}
        currency={currency}
        isLoading={zReportLoading}
      />

      <ItemNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        itemName={selectedItemForNotes?.name || ""}
        currentNotes={selectedItemForNotes?.notes}
        onSave={handleSaveNotes}
        isLoading={updateNotesMutation.isPending}
      />

      <ShiftSummaryDialog
        open={summaryDialogOpen}
        onOpenChange={setSummaryDialogOpen}
        shiftData={closedShiftData}
        currency={currency}
      />

      <ModifierDialog
        open={modifierDialogOpen}
        onOpenChange={(open) => {
          setModifierDialogOpen(open);
          if (!open) setSelectedItemForModifiers(null);
        }}
        menuItem={selectedItemForModifiers}
        modifierGroups={itemModifierGroups}
        currency={currency}
        onConfirm={handleAddItemWithModifiers}
        isLoading={addItemMutation.isPending || addModifiersMutation.isPending}
      />

      {mergeData && (
        <MergeOrdersDialog
          open={mergeDialogOpen}
          onOpenChange={(open) => {
            if (!open) handleCancelMerge();
          }}
          primaryTableName={mergeData.primaryTableName}
          secondaryTableName={mergeData.secondaryTableName}
          primaryOrderNumber={mergeData.primaryOrderNumber}
          secondaryOrderNumber={mergeData.secondaryOrderNumber}
          onConfirm={handleConfirmMerge}
          isLoading={mergeOrdersMutation.isPending}
        />
      )}

      {selectedOrderForSplit && (
        <SplitOrderDialog
          open={splitDialogOpen}
          onOpenChange={(open) => {
            setSplitDialogOpen(open);
            if (!open) setSelectedOrderForSplit(null);
          }}
          orderNumber={selectedOrderForSplit.order_number}
          items={selectedOrderForSplit.order_items.filter((i) => !i.voided)}
          currency={currency}
          onConfirm={handleConfirmSplit}
          isLoading={splitOrderMutation.isPending}
        />
      )}

      {selectedItemForTransfer && currentOrder && (
        <TransferItemDialog
          open={transferDialogOpen}
          onOpenChange={(open) => {
            setTransferDialogOpen(open);
            if (!open) setSelectedItemForTransfer(null);
          }}
          itemName={selectedItemForTransfer.name}
          openOrders={openOrders}
          currentOrderId={currentOrder.id}
          onConfirm={handleTransferConfirm}
          isLoading={transferItemMutation.isPending}
        />
      )}
    </div>
  );
}
