import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Users, AlertCircle } from "lucide-react";
import { cn, formatJOD } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
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
  useVoidOrder,
  useReopenOrder,
  useRestaurantSettings,
  useZReport,
  useCashierCategories,
  useCashierMenuItems,
  useCashierFavoriteItems,
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
  FavoritesGrid,
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
  VoidOrderDialog,
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
  ConfirmNewOrderDialog,
  TableOrdersDialog,
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
  const { t } = useLanguage();
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
  const { data: favoriteItems = [], isLoading: favoritesLoading } = useCashierFavoriteItems();

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
  const voidOrderMutation = useVoidOrder();
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
  const [voidOrderDialogOpen, setVoidOrderDialogOpen] = useState(false);
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
  const [confirmNewOrderDialogOpen, setConfirmNewOrderDialogOpen] = useState(false);
  const [closedShiftData, setClosedShiftData] = useState<{
    openingCash: number;
    openedAt: string;
    closedAt: string;
    orderCount: number;
  } | null>(null);

  // Merge orders state
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  // Table orders dialog state
  const [tableOrdersDialogOpen, setTableOrdersDialogOpen] = useState(false);
  const [selectedTableForOrders, setSelectedTableForOrders] = useState<{
    id: string;
    name: string;
    orders: typeof openOrders;
  } | null>(null);

  // Draft order state (create-on-first-item pattern)
  const [draftOrder, setDraftOrder] = useState<{
    orderType: "dine-in" | "takeaway";
    tableId?: string | null;
    customerInfo?: { name: string; phone: string };
  } | null>(null);
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

  // Derived: Open orders without table (for Open Orders tab only)
  const openOrdersNoTable = useMemo(() => {
    return openOrders.filter(o => !o.table_id);
  }, [openOrders]);

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
          // Trigger Pay if there are items and order is OPEN (not held)
          if (orderItems.length > 0 && currentOrder && currentOrder.status === "open") {
            setPaymentDialogOpen(true);
          }
          break;
        case "h":
        case "H":
          // Hold current order - only if OPEN status
          if (currentOrder && currentOrder.status === "open" && orderItems.length > 0) {
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

  // Helper: round to 3 decimals using HALF-UP (JOD standard)
  const roundJOD = useCallback((n: number): number => {
    return Math.round(n * 1000) / 1000;
  }, []);

  const subtotal = roundJOD(orderItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + Number(item.price) * item.quantity,
    0,
  ));

  const calculateTotals = useCallback(
    (sub: number, discType?: string | null, discVal?: number | null) => {
      let discountAmount = 0;
      if (discVal && discVal > 0) {
        discountAmount = discType === "percentage" ? (sub * discVal) / 100 : discVal;
      }
      const afterDiscount = sub - discountAmount;
      const serviceCharge = afterDiscount * serviceChargeRate;
      const taxAmount = (afterDiscount + serviceCharge) * taxRate;
      const total = afterDiscount + serviceCharge + taxAmount;
      
      // Round all monetary values to 3 decimals (JOD standard)
      return { 
        discountAmount: roundJOD(discountAmount), 
        serviceCharge: roundJOD(serviceCharge), 
        taxAmount: roundJOD(taxAmount), 
        total: roundJOD(total) 
      };
    },
    [serviceChargeRate, taxRate, roundJOD],
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
    // Block shift close if there are held orders
    if (heldOrders.length > 0) {
      toast.error(t("cannot_close_held_orders"));
      setHeldOrdersDialogOpen(true);
      return;
    }
    setShiftDialogMode("close");
    setShiftDialogOpen(true);
  };

  const handleShiftConfirm = async (amount: number) => {
    try {
      if (shiftDialogMode === "open") {
        await openShiftMutation.mutateAsync(amount);
        toast.success(t("shift_opened"));
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
          toast.success(t("shift_closed_msg"));
        }
      }
      setShiftDialogOpen(false);
    } catch (error) {
      toast.error(shiftDialogMode === "open" ? t("failed_open_shift") : t("failed_close_shift"));
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
      toast.success(t("order_created"));
    } catch (error) {
      toast.error(t("failed_create_order"));
    }
  };

  const handleSelectItem = async (menuItem: { id: string; name: string; price: number }) => {
    if (!currentShift || !branch || !restaurant) return;

    // If we have a draft order but no DB order yet, create it first
    if (!currentOrder?.id && draftOrder) {
      try {
        await createOrderMutation.mutateAsync({
          shiftId: currentShift.id,
          taxRate,
          branchId: branch.id,
          restaurantId: restaurant.id,
          orderType: draftOrder.orderType,
          tableId: draftOrder.orderType === "takeaway" ? null : draftOrder.tableId,
          customerInfo: draftOrder.customerInfo,
        });
        setDraftOrder(null);
        // After order is created, we proceed to add item via modifier dialog
        // The refetch will happen, so we use a slight delay to ensure order is available
        await refetchOrder();
      } catch (error) {
        toast.error(t("failed_create_order"));
        return;
      }
    }

    if (!currentOrder?.id && !draftOrder) {
      // Open new order dialog if no current order and no draft
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
      const newSubtotal = roundJOD(items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
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
      toast.error(t("failed_add_item"));
    }
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (!currentOrder) return;
    try {
      await updateQuantityMutation.mutateAsync({ itemId, quantity });
      
      // Recalculate totals from updated items
      const updatedItems = currentOrder.order_items
        ?.filter((i: { voided: boolean }) => !i.voided)
        .map((item: { id: string; price: number; quantity: number }) =>
          item.id === itemId ? { ...item, quantity: quantity > 0 ? quantity : 0 } : item
        )
        .filter((item: { quantity: number }) => item.quantity > 0) || [];
      
      const newSubtotal = roundJOD(updatedItems.reduce(
        (sum: number, item: { price: number; quantity: number }) => 
          sum + Number(item.price) * item.quantity, 0
      ));
      const totals = calculateTotals(newSubtotal, currentOrder.discount_type, currentOrder.discount_value);
      
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      
      await refetchOrder();
    } catch (error) {
      toast.error(t("failed_update_quantity"));
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
    
    if (!currentOrder) return;
    try {
      await removeItemMutation.mutateAsync(itemId);
      
      // Recalculate totals from remaining items
      const remainingItems = activeItems.filter(
        (item: { id: string }) => item.id !== itemId
      );
      const newSubtotal = roundJOD(remainingItems.reduce(
        (sum: number, item: { price: number; quantity: number }) => 
          sum + Number(item.price) * item.quantity, 0
      ));
      const totals = calculateTotals(newSubtotal, currentOrder.discount_type, currentOrder.discount_value);
      
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      
      await refetchOrder();
    } catch (error) {
      toast.error(t("failed_remove_item"));
    }
  };

  const handleConfirmRemoveLastItem = async () => {
    if (!selectedItemForRemoval || !currentOrder) return;
    try {
      await removeItemMutation.mutateAsync(selectedItemForRemoval.id);
      
      // All items removed, set totals to zero
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: 0,
          tax_amount: 0,
          service_charge: 0,
          total: 0,
        },
      });
      
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
    if (!selectedItemForVoid || !currentOrder) return;
    try {
      await voidItemMutation.mutateAsync({ itemId: selectedItemForVoid.id, reason });
      setVoidDialogOpen(false);
      setSelectedItemForVoid(null);
      
      // Recalculate totals excluding voided item
      const remainingItems = currentOrder.order_items?.filter(
        (i: { id: string; voided: boolean }) => !i.voided && i.id !== selectedItemForVoid.id
      ) || [];
      const newSubtotal = roundJOD(remainingItems.reduce(
        (sum: number, item: { price: number; quantity: number }) => 
          sum + Number(item.price) * item.quantity, 0
      ));
      const totals = calculateTotals(newSubtotal, currentOrder.discount_type, currentOrder.discount_value);
      
      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      
      await refetchOrder();
      toast.success(t("item_voided"));
    } catch (error) {
      toast.error(t("failed_void_item"));
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
      toast.error(t("failed_save_notes"));
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
      toast.success(t("discount_applied"));
    } catch (error) {
      toast.error(t("failed_apply_discount"));
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
      toast.success(t("discount_removed"));
    } catch (error) {
      toast.error(t("failed_remove_discount"));
    }
  };

  const handlePay = () => {
    // Payment guard: only allow for OPEN orders
    if (!currentOrder || currentOrder.status !== "open") {
      toast.error(t("cannot_pay_not_open"));
      return;
    }
    setPaymentDialogOpen(true);
  };

  const handlePaymentConfirm = async (payments: { method: string; amount: number }[]): Promise<void> => {
    if (!currentOrder) return;
    try {
      // Store order data before completing for receipt
      const orderForReceipt = {
        id: currentOrder.id,
        order_number: currentOrder.order_number,
        created_at: currentOrder.created_at,
        status: "paid",
        subtotal: currentOrder.subtotal,
        discount_type: currentOrder.discount_type,
        discount_value: currentOrder.discount_value,
        tax_amount: currentOrder.tax_amount,
        service_charge: currentOrder.service_charge,
        total: currentOrder.total,
        order_notes: currentOrder.order_notes,
        table_id: currentOrder.table_id,
        order_items: currentOrder.order_items || [],
        payments: payments.map((p, idx) => ({ id: `temp-${idx}`, method: p.method, amount: p.amount })),
      };

      for (const payment of payments) {
        await addPaymentMutation.mutateAsync({
          orderId: currentOrder.id,
          method: payment.method,
          amount: payment.amount,
        });
      }
      await completeOrderMutation.mutateAsync({ orderId: currentOrder.id, payments });
      
      // Determine payment mode and breakdown for audit
      const cashAmount = roundJOD(payments.filter(p => p.method === "cash").reduce((sum, p) => sum + p.amount, 0));
      const cardAmount = roundJOD(payments.filter(p => p.method !== "cash").reduce((sum, p) => sum + p.amount, 0));
      const paymentMode = payments.length > 1 ? "split" : "single";
      
      // Audit log for payment completion
      auditLogMutation.mutate({
        entityType: "order",
        entityId: currentOrder.id,
        action: "ORDER_COMPLETE",
        details: {
          order_id: currentOrder.id,
          order_number: currentOrder.order_number,
          total: currentOrder.total,
          cashAmount,
          cardAmount,
          mode: paymentMode,
          payments: payments.map(p => ({ method: p.method, amount: p.amount })),
        },
      });
      
      setPaymentDialogOpen(false);
      toast.success(t("payment_success"));

      // Auto-show receipt after successful payment
      setSelectedOrderForReceipt(orderForReceipt as RecentOrder);
      setReceiptDialogOpen(true);
    } catch (error) {
      toast.error(t("payment_failed"));
      throw error; // Re-throw to signal failure to PaymentDialog
    }
  };

  // Handler for New Order button in OrderPanel
  const handleNewOrderButton = async () => {
    if (!currentOrder) {
      // No current order - open new order dialog directly
      setNewOrderDialogOpen(true);
      return;
    }

    // Check if current order has non-voided items
    const activeItems = currentOrder.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    
    if (activeItems.length === 0) {
      // Order has zero items - auto-discard and open new order dialog
      try {
        await cancelOrderMutation.mutateAsync({ 
          orderId: currentOrder.id, 
          reason: "Empty order discarded" 
        });
        setNewOrderDialogOpen(true);
      } catch (error) {
        // Even if cancel fails, proceed to new order
        setNewOrderDialogOpen(true);
      }
      return;
    }

    // Has items - show confirmation dialog
    setConfirmNewOrderDialogOpen(true);
  };

  const handleConfirmHoldAndNew = async () => {
    if (!currentOrder) return;
    
    // Double-check order has items and is open
    const activeItems = currentOrder.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    
    if (activeItems.length === 0 || currentOrder.status !== "open") {
      // Cannot hold empty order or non-open order - auto-discard
      try {
        await cancelOrderMutation.mutateAsync({ 
          orderId: currentOrder.id, 
          reason: "Empty order discarded" 
        });
      } catch {
        // Ignore cancel failure
      }
      setConfirmNewOrderDialogOpen(false);
      setNewOrderDialogOpen(true);
      return;
    }
    
    try {
      // Hold the current order first
      await holdOrderMutation.mutateAsync(currentOrder.id);
      
      // Log audit for hold
      await auditLogMutation.mutateAsync({
        entityType: "order",
        entityId: currentOrder.id,
        action: "ORDER_HOLD",
        details: {
          order_number: currentOrder.order_number,
          total: total,
          items_count: activeItems.length,
        },
      });
      
      toast.success(t("order_held"));
      setConfirmNewOrderDialogOpen(false);
      
      // Open new order dialog
      setNewOrderDialogOpen(true);
    } catch (error) {
      // Hold failed - auto-discard and proceed
      try {
        await cancelOrderMutation.mutateAsync({ 
          orderId: currentOrder.id, 
          reason: t("hold_failed_discarded")
        });
        toast.info(t("hold_failed_discarded"));
      } catch {
        // Ignore cancel failure
      }
      setConfirmNewOrderDialogOpen(false);
      setNewOrderDialogOpen(true);
    }
  };

  const handleHoldOrder = async () => {
    if (!currentOrder) return;
    
    // Block if no items
    if (orderItems.length === 0) {
      toast.error(t("cannot_hold_empty"));
      return;
    }
    
    // Only allow hold on OPEN orders
    if (currentOrder.status !== "open") {
      toast.error(t("can_only_hold_open"));
      return;
    }
    
    try {
      await holdOrderMutation.mutateAsync(currentOrder.id);
      
      // Log audit
      await auditLogMutation.mutateAsync({
        entityType: "order",
        entityId: currentOrder.id,
        action: "ORDER_HOLD",
        details: {
          order_number: currentOrder.order_number,
          total: total,
          items_count: orderItems.length,
        },
      });
      
      toast.success(t("order_held"));
    } catch (error) {
      toast.error(t("failed_hold_order"));
    }
  };

  const handleResumeOrder = async (orderId: string) => {
    try {
      // Get order info for audit before resuming
      const orderToResume = heldOrders.find(o => o.id === orderId);
      
      await resumeOrderMutation.mutateAsync(orderId);
      
      // Log audit
      if (orderToResume) {
        await auditLogMutation.mutateAsync({
          entityType: "order",
          entityId: orderId,
          action: "ORDER_RESUME",
          details: {
            order_number: orderToResume.order_number,
            total: orderToResume.total,
          },
        });
      }
      
      setActiveTab("new-order");
      toast.success(t("order_loaded"));
    } catch (error) {
      toast.error(t("failed_load_order"));
    }
  };

  const handleCancelHeldOrder = async (orderId: string) => {
    try {
      const orderToCancel = heldOrders.find(o => o.id === orderId);
      
      await cancelOrderMutation.mutateAsync({ orderId, reason: "Cancelled from held orders" });
      
      // Log audit
      if (orderToCancel) {
        await auditLogMutation.mutateAsync({
          entityType: "order",
          entityId: orderId,
          action: "ORDER_CANCEL",
          details: {
            order_number: orderToCancel.order_number,
            total: orderToCancel.total,
            source: "held_orders",
          },
        });
      }
      
      toast.success(t("order_cancelled"));
    } catch (error) {
      toast.error(t("failed_cancel_order"));
    }
  };

  const handleCancelOrder = async (reason: string) => {
    if (!currentOrder) return;
    try {
      await cancelOrderMutation.mutateAsync({ orderId: currentOrder.id, reason });
      setCancelDialogOpen(false);
      toast.success(t("order_cancelled"));
    } catch (error) {
      toast.error(t("failed_cancel_order"));
    }
  };

  const handleVoidOrder = () => {
    if (!currentOrder) return;
    
    // Only allow void on open orders
    if (currentOrder.status !== "open") {
      toast.error(t("can_only_void_open"));
      return;
    }
    
    setVoidOrderDialogOpen(true);
  };

  const handleVoidOrderConfirm = async (reason: string) => {
    if (!currentOrder) return;
    try {
      const result = await voidOrderMutation.mutateAsync({ 
        orderId: currentOrder.id, 
        reason 
      });
      
      // Audit log for void
      await auditLogMutation.mutateAsync({
        entityType: "order",
        entityId: currentOrder.id,
        action: "ORDER_VOIDED",
        details: {
          reason,
          order_number: result.order_number,
          total: result.total,
        },
      });
      
      setVoidOrderDialogOpen(false);
      toast.success(t("order_voided"));
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("failed_void_order");
      toast.error(errorMessage);
    }
  };

  const handleCashMovement = async (type: "cash_in" | "cash_out", amount: number, reason?: string) => {
    if (!currentShift) return;
    try {
      await cashMovementMutation.mutateAsync({ shiftId: currentShift.id, type, amount, reason });
      setCashMovementDialogOpen(false);
      toast.success(type === "cash_in" ? t("cash_added") : t("cash_removed"));
    } catch (error) {
      toast.error(t("failed_record_cash"));
    }
  };

  const handleViewReceipt = (order: RecentOrder) => {
    setSelectedOrderForReceipt(order);
    setReceiptDialogOpen(true);
  };

  const handleRefund = (order: RecentOrder) => {
    // Only allow refunds on paid orders
    if (order.status !== "paid") {
      toast.error(t("can_only_refund_paid"));
      return;
    }
    // Check if already fully refunded
    const totalRefunded = order.refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0;
    if (totalRefunded >= Number(order.total)) {
      toast.error(t("already_fully_refunded"));
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

      // Audit log for refund
      await auditLogMutation.mutateAsync({
        entityType: "refund",
        entityId: selectedOrderForRefund.id,
        action: "REFUND_CREATE",
        details: {
          event_name: "ORDER_REFUNDED",
          order_id: selectedOrderForRefund.id,
          order_number: selectedOrderForRefund.order_number,
          amount: data.amount,
          reason: data.reason,
        },
      });

      toast.success(t("refund_processed"));
      setRefundDialogOpen(false);
      setReceiptDialogOpen(false);
      setSelectedOrderForRefund(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t("refund_failed");
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleReopen = (order: RecentOrder) => {
    // Only allow reopen on paid orders without refunds
    if (order.status !== "paid") {
      toast.error(t("can_only_reopen_paid"));
      return;
    }
    if (order.refunds && order.refunds.length > 0) {
      toast.error(t("cannot_reopen_refunded"));
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
        action: "ORDER_REOPEN",
        details: {
          order_number: selectedOrderForReopen.order_number,
          total: selectedOrderForReopen.total,
        },
      });

      toast.success(t("order_reopened"));
      setReopenDialogOpen(false);
      setRecentOrdersDialogOpen(false);
      setSelectedOrderForReopen(null);
    } catch (error) {
      toast.error(t("failed_reopen_order"));
    }
  };

  const handleTransferItem = (itemId: string) => {
    // Only allow on open orders with more than 1 item
    if (currentOrder?.status !== "open") {
      toast.error(t("cannot_transfer_from_open"));
      return;
    }
    const activeItems = currentOrder?.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    if (activeItems.length <= 1) {
      toast.error(t("need_two_items"));
      return;
    }
    const item = currentOrder?.order_items?.find((i: { id: string }) => i.id === itemId);
    if (item?.voided) {
      toast.error(t("cannot_transfer_voided"));
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
      toast.success(`${selectedItemForTransfer.name} ${t("item_transferred")}`);
      setTransferDialogOpen(false);
      setSelectedItemForTransfer(null);
      await refetchOrder();
    } catch (error) {
      toast.error(t("failed_transfer_item"));
    }
  };

  const handleConfirmPending = async (orderId: string) => {
    try {
      await confirmPendingMutation.mutateAsync(orderId);
      
      // Fetch the confirmed order to get table_id and route correctly
      const { data: confirmedOrder, error: fetchError } = await supabase
        .from("orders")
        .select("id, order_number, status, table_id, branch_id, total")
        .eq("id", orderId)
        .single();
      
      if (fetchError) {
        console.error("Failed to fetch confirmed order:", fetchError);
        toast.success(t("order_confirmed"));
        return;
      }

      if (confirmedOrder.table_id) {
        // Order has a table - switch to Tables tab and open TableOrdersDialog
        const tableOrders = await supabase
          .from("orders")
          .select("id, order_number, status, total, subtotal, created_at, notes, order_notes, table_id, order_items(id, name, quantity, price, notes, voided)")
          .eq("table_id", confirmedOrder.table_id)
          .in("status", ["open", "confirmed", "held"])
          .order("created_at", { ascending: false });
        
        const table = tables.find(t => t.id === confirmedOrder.table_id);
        
        setActiveTab("tables");
        setSelectedTableForOrders({
          id: confirmedOrder.table_id,
          name: table?.table_name || t("unknown"),
          orders: (tableOrders.data || []) as typeof openOrders,
        });
        setTableOrdersDialogOpen(true);
        toast.success(t("order_confirmed"));
      } else {
        // Order has no table - switch to Open Orders tab and auto-resume
        setActiveTab("open-orders");
        try {
          await resumeOrderMutation.mutateAsync(orderId);
          setActiveTab("new-order");
          toast.success(t("order_confirmed"));
        } catch (resumeError) {
          console.error("Failed to resume confirmed order:", resumeError);
          toast.success(t("order_confirmed"));
        }
      }
    } catch (error) {
      toast.error(t("failed_confirm_order"));
    }
  };

  const handleRejectPending = async (orderId: string, reason?: string) => {
    try {
      await rejectPendingMutation.mutateAsync({ orderId, reason });
      toast.success(t("order_rejected"));
    } catch (error) {
      toast.error(t("failed_reject_order"));
    }
  };

  const handleSelectOpenOrder = async (orderId: string) => {
    try {
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      toast.success(t("order_loaded"));
    } catch (error) {
      toast.error(t("failed_load_order"));
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
      toast.success(t("order_moved"));
    } catch (error) {
      toast.error(t("failed_move_order"));
    }
  };

  const handleCloseOrder = async (orderId: string, tableId?: string, tableName?: string) => {
    try {
      await closeOrderMutation.mutateAsync({ orderId, tableId, tableName });
      toast.success(t("order_closed"));
    } catch (error) {
      toast.error(t("failed_close_order"));
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
      toast.success(t("order_split"));
    } catch (error) {
      toast.error(t("failed_split_order"));
    }
  };

  const handleTableClick = async (tableId: string) => {
    // If in merge mode and table is occupied, add to selection
    if (mergeSelection.length > 0 && mergeSelection.length < 2) {
      const existingOrder = tableOrderMap.get(tableId);
      if (!existingOrder) {
        toast.error(t("select_occupied_table"));
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

    // Get all orders for this table (not just first)
    const tableOrders = openOrders.filter((o) => o.table_id === tableId);
    const table = tables.find((t) => t.id === tableId);

    if (tableOrders.length > 0) {
      // Occupied: Open table orders dialog instead of auto-resuming
      setSelectedTableForOrders({
        id: tableId,
        name: table?.table_name || t("unknown"),
        orders: tableOrders,
      });
      setTableOrdersDialogOpen(true);
    } else {
      // Available: Set up draft order (create-on-first-item pattern)
      if (!currentShift || !branch || !restaurant) return;
      const tableName = table?.table_name || t("unknown");
      setDraftOrder({
        orderType: "dine-in",
        tableId,
      });
      setActiveTab("new-order");
      toast.info(`${t("draft_for_table")} ${tableName}`);
    }
  };

  // Handler for resuming order from table orders dialog
  const handleResumeTableOrder = async (orderId: string) => {
    try {
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      toast.success(t("order_loaded"));
    } catch (error) {
      toast.error(t("failed_load_order"));
    }
  };

  // Handler for canceling empty orders from table orders dialog
  const handleCancelEmptyTableOrder = async (orderId: string) => {
    try {
      await cancelOrderMutation.mutateAsync({ 
        orderId, 
        reason: "Empty order cancelled by cashier" 
      });
      
      // Update the selectedTableForOrders to remove the cancelled order
      if (selectedTableForOrders) {
        const remainingOrders = selectedTableForOrders.orders.filter(o => o.id !== orderId);
        if (remainingOrders.length === 0) {
          setTableOrdersDialogOpen(false);
          setSelectedTableForOrders(null);
        } else {
          setSelectedTableForOrders({
            ...selectedTableForOrders,
            orders: remainingOrders,
          });
        }
      }
      
      toast.success(t("empty_order_cancelled"));
    } catch (error) {
      toast.error(t("failed_cancel_order"));
    }
  };

  // Handler for paying order from table orders dialog
  const handlePayTableOrder = async (orderId: string) => {
    // First resume the order to load it
    try {
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      // Fetch fresh order data before opening payment dialog (no setTimeout race condition)
      await refetchOrder();
      setPaymentDialogOpen(true);
    } catch (error) {
      toast.error(t("failed_load_order"));
    }
  };

  const handleStartMerge = (tableId: string) => {
    const order = tableOrderMap.get(tableId);
    if (!order) {
      toast.error(t("select_occupied_table"));
      return;
    }
    setMergeSelection([tableId]);
    toast.info(t("select_second_table"));
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
      toast.error(t("order_not_found"));
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
      toast.success(t("order_merged"));
      handleCancelMerge();
    } catch (error) {
      toast.error(t("failed_merge_orders"));
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
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === "new-order" && !currentOrder) {
                  setNewOrderDialogOpen(true);
                }
              }}
              pendingCount={pendingOrders.length}
              openCount={openOrdersNoTable.length}
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
                {/* Draft order banner */}
                {draftOrder && !currentOrder && (
                  <div className="p-2 bg-amber-100 dark:bg-amber-900/30 border-b border-amber-300 dark:border-amber-700 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                      <AlertCircle className="h-4 w-4" />
                      <span>
                        {draftOrder.orderType === "dine-in" 
                          ? `${t("draft_order_for_table")} – ${t("will_create_on_first_item")}`
                          : `${t("draft_takeaway_order")} – ${t("will_create_on_first_item")}`}
                      </span>
                    </div>
                    <button
                      onClick={() => setDraftOrder(null)}
                      className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      {t("discard")}
                    </button>
                  </div>
                )}
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
                  orderStatus={currentOrder?.status}
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
                  onVoidOrder={handleVoidOrder}
                  hasItems={orderItems.length > 0}
                  onTransferItem={handleTransferItem}
                  showTransfer={currentOrder?.status === "open" && orderItems.length > 1 && openOrders.length > 1}
                  onNewOrder={handleNewOrderButton}
                  shiftOpen={shiftOpen}
                />
              </div>
            </div>
          )}

          {activeTab === "favorites" && (
            <div className="flex-1 flex overflow-hidden">
              {/* Favorites Grid */}
              <div className="flex-1 bg-muted/30">
                <FavoritesGrid
                  items={favoriteItems}
                  currency={currency}
                  onSelectItem={handleSelectItem}
                  isLoading={favoritesLoading}
                />
              </div>

              {/* Order Panel */}
              <div className="w-80 border-l">
                <OrderPanel
                  orderNumber={currentOrder?.order_number}
                  orderStatus={currentOrder?.status}
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
                  onVoidOrder={handleVoidOrder}
                  hasItems={orderItems.length > 0}
                  onTransferItem={handleTransferItem}
                  showTransfer={currentOrder?.status === "open" && orderItems.length > 1 && openOrders.length > 1}
                  onNewOrder={handleNewOrderButton}
                  shiftOpen={shiftOpen}
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
              orders={openOrdersNoTable}
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
        tables={tables}
        currency={currency}
        onResumeOrder={handleResumeOrder}
        onCancelOrder={handleCancelHeldOrder}
        isLoading={resumeOrderMutation.isPending || cancelOrderMutation.isPending}
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
        branch={branch}
        currency={currency}
        tables={tables}
        cashierEmail={user?.email}
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
          alreadyRefunded={selectedOrderForRefund.refunds?.reduce((sum, r) => sum + Number(r.amount), 0) || 0}
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

      <VoidOrderDialog
        open={voidOrderDialogOpen}
        onOpenChange={setVoidOrderDialogOpen}
        orderNumber={currentOrder?.order_number}
        onConfirm={handleVoidOrderConfirm}
        isLoading={voidOrderMutation.isPending}
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

      <ConfirmNewOrderDialog
        open={confirmNewOrderDialogOpen}
        onOpenChange={setConfirmNewOrderDialogOpen}
        onConfirmHoldAndNew={handleConfirmHoldAndNew}
      />

      {selectedTableForOrders && (
        <TableOrdersDialog
          open={tableOrdersDialogOpen}
          onOpenChange={(open) => {
            setTableOrdersDialogOpen(open);
            if (!open) setSelectedTableForOrders(null);
          }}
          tableName={selectedTableForOrders.name}
          orders={selectedTableForOrders.orders}
          currency={currency}
          onResumeOrder={handleResumeTableOrder}
          onPayOrder={handlePayTableOrder}
          onCancelEmptyOrder={handleCancelEmptyTableOrder}
          isLoading={resumeOrderMutation.isPending || cancelOrderMutation.isPending}
        />
      )}
    </div>
  );
}
