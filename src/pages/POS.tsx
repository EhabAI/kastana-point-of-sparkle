import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Users, AlertCircle } from "lucide-react";
import { cn, formatJOD } from "@/lib/utils";
import { calculateOrderTotals, roundJOD } from "@/lib/orderCalculations";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { getCashierErrorMessage } from "@/lib/cashierErrors";
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
  useCashierAllMenuItems,
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
  useBranchOpenShift,
  useTableCheckout,
  useSendToKitchen,
} from "@/hooks/pos";
import type { SelectedModifier } from "@/hooks/pos/useModifiers";
import { useCreateRefund } from "@/hooks/pos/useRefunds";
import { useAuditLog } from "@/hooks/pos/useAuditLog";
import { useToggleFavorite } from "@/hooks/pos/useToggleFavorite";
import { useRestaurantActiveStatus } from "@/hooks/useRestaurantActiveStatus";
import { useShiftInventoryMovements } from "@/hooks/useShiftInventoryMovements";
import { RestaurantInactiveScreen } from "@/components/RestaurantInactiveScreen";
import {
  useAddOrderItem,
  useUpdateOrderItemQuantity,
  useRemoveOrderItem,
  useVoidOrderItem,
  useUpdateOrderItemNotes,
} from "@/hooks/pos/useOrderItems";
import { useCompletePayment } from "@/hooks/pos/usePayments";
import { useInventoryDeduction, type DeductionWarning } from "@/hooks/pos/useInventoryDeduction";
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
  ReopenOrderDialog,
  TransferItemDialog,
  ConfirmNewOrderDialog,
  TableOrdersDialog,
  TableCheckoutDialog,
  InventoryWarningsDialog,
  InventorySummaryDialog,
} from "@/components/pos/dialogs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RecentOrder } from "@/components/pos/dialogs/RecentOrdersDialog";
import type { OrderType } from "@/components/pos/OrderTypeSelector";

interface MenuItemWithModifiers {
  id: string;
  name: string;
  price: number;
}

export default function POS() {
  const { signOut, user, displayName, role } = useAuth();
  const { t } = useLanguage();
  const { data: session, isLoading: sessionLoading, error: sessionError } = useCashierSession();
  const restaurant = session?.restaurant;
  const branch = session?.branch;
  const { data: isRestaurantActive, isLoading: activeLoading } = useRestaurantActiveStatus(restaurant?.id);
  const { data: currentShift, isLoading: shiftLoading } = useCurrentShift();
  const { data: branchOpenShift } = useBranchOpenShift(branch?.id); // Check for existing open shift at branch
  const { data: settings } = useRestaurantSettings();
  const { data: categories = [] } = useCashierCategories();
  const { data: heldOrders = [] } = useHeldOrders(currentShift?.id);
  const { data: recentOrders = [] } = useRecentOrders(currentShift?.id);

  // CRITICAL: POS can have multiple OPEN orders at the same time.
  // Track an explicit activeOrderId so "resume/pay/void" always targets the selected order.id.
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const { data: currentOrder, refetch: refetchOrder } = useCurrentOrder(currentShift?.id, activeOrderId);

  const { data: zReportData, isLoading: zReportLoading, refetch: zReportRefetch } = useZReport(currentShift?.id);

  const { data: inventoryMovements, isLoading: inventoryMovementsLoading } = useShiftInventoryMovements(
    currentShift?.id,
    restaurant?.id,
    branch?.id
  );
  const { data: tables = [], isLoading: tablesLoading } = useBranchTables(branch?.id);
  const { data: pendingOrders = [] } = usePendingOrders(branch?.id);
  const { data: openOrders = [] } = useOpenOrders(branch?.id);
  const { data: paymentMethods = [] } = useCashierPaymentMethods(branch?.id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const { data: menuItems = [], isLoading: itemsLoading } = useCashierMenuItems(selectedCategoryId);
  const { data: allMenuItems = [], isLoading: allItemsLoading } = useCashierAllMenuItems();
  const { data: favoriteItems = [], isLoading: favoritesLoading } = useCashierFavoriteItems();
  const toggleFavoriteMutation = useToggleFavorite();

  // B1: Menu item search - GLOBAL search across all categories
  const [menuSearch, setMenuSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // When search is active, search all items globally; otherwise show category items
  const isSearchActive = menuSearch.trim().length > 0;
  
  const filteredMenuItems = useMemo(() => {
    if (!isSearchActive) return menuItems;
    const query = menuSearch.toLowerCase().trim();
    // Bilingual search: search across both name (English) and description (Arabic name)
    return allMenuItems.filter((item: { name: string; description?: string | null }) => 
      item.name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query))
    );
  }, [menuItems, allMenuItems, menuSearch, isSearchActive]);

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
  const completePaymentMutation = useCompletePayment();
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
  const inventoryDeductionMutation = useInventoryDeduction();
  const sendToKitchenMutation = useSendToKitchen();
  
  // State for inventory deduction warnings
  const [inventoryWarnings, setInventoryWarnings] = useState<DeductionWarning[]>([]);
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
  const [inventorySummaryDialogOpen, setInventorySummaryDialogOpen] = useState(false);
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
    closingCash: number;
    expectedCash: number;
    openedAt: string;
    closedAt: string;
    orderCount: number;
  } | null>(null);

  // Merge orders state
  const [mergeSelection, setMergeSelection] = useState<string[]>([]);

  // Move order state
  const [moveMode, setMoveMode] = useState<{
    active: boolean;
    sourceTableId: string;
    orderId: string;
    orderNumber: number;
  } | null>(null);

  // Table orders dialog state
  const [tableOrdersDialogOpen, setTableOrdersDialogOpen] = useState(false);
  const [selectedTableForOrders, setSelectedTableForOrders] = useState<{
    id: string;
    name: string;
    orders: typeof openOrders;
  } | null>(null);

  // Table checkout dialog state (group pay)
  const [tableCheckoutDialogOpen, setTableCheckoutDialogOpen] = useState(false);
  const tableCheckoutMutation = useTableCheckout();

  // Draft order state (create-on-first-item pattern)
  const [draftOrder, setDraftOrder] = useState<{
    orderType: "dine-in" | "takeaway";
    tableId?: string | null;
    customerInfo?: { name: string; phone: string };
  } | null>(null);

  // Pending item after draft order creation (to avoid race condition)
  const [pendingItemAfterDraft, setPendingItemAfterDraft] = useState<{
    menuItem: { id: string; name: string; price: number };
    orderId: string;
  } | null>(null);

  // Pending item for first-item order type flow
  const [pendingItemForOrderType, setPendingItemForOrderType] = useState<{
    menuItem: { id: string; name: string; price: number };
  } | null>(null);

  // Query client for manual cache invalidation
  const queryClient = useQueryClient();

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

  // Don't clear search when category changes - global search should persist

  // Calculate order totals - MUST be before keyboard shortcuts useEffect
  const orderItems = currentOrder?.order_items?.filter((item: { voided: boolean }) => !item.voided) || [];
  
  // Extract menu_item_ids from order items for highlighting in menu grid
  const orderItemIds = useMemo(() => 
    orderItems.map((item: { menu_item_id?: string | null }) => item.menu_item_id).filter(Boolean) as string[],
    [orderItems]
  );

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

  const subtotal = roundJOD(orderItems.reduce(
    (sum: number, item: { price: number; quantity: number }) => sum + Number(item.price) * item.quantity,
    0,
  ));

  const calculateTotals = useCallback(
    (sub: number, discType?: string | null, discVal?: number | null) => {
      const result = calculateOrderTotals({
        subtotal: sub,
        discountType: discType,
        discountValue: discVal,
        serviceChargeRate,
        taxRate,
        currency,
      });

      return {
        discountAmount: result.discountAmount,
        serviceCharge: result.serviceCharge,
        taxAmount: result.taxAmount,
        rawTotal: result.totalBeforeRounding,
        payableTotal: result.total,
        roundingAdjustment: 0,
        total: result.total,
      };
    },
    [serviceChargeRate, taxRate, currency],
  );

  const { discountAmount, serviceCharge, taxAmount, total, rawTotal, payableTotal, roundingAdjustment } = calculateTotals(
    subtotal,
    currentOrder?.discount_type,
    currentOrder?.discount_value,
  );

  // Handlers
  const handleOpenShift = () => {
    // Soft block: Check if there's already an open shift at this branch (by another cashier)
    if (branchOpenShift && branchOpenShift.cashier_id !== user?.id) {
      toast.error(t("shift_already_open_at_branch"));
      return;
    }
    setShiftDialogMode("open");
    setShiftDialogOpen(true);
  };

  const handleCloseShift = async () => {
    // Block shift close if there are held orders
    if (heldOrders.length > 0) {
      toast.error(t("cannot_close_held_orders"));
      setHeldOrdersDialogOpen(true);
      return;
    }
    
    // Refetch Z report data before opening dialog to ensure fresh expected cash
    try {
      await zReportRefetch();
    } catch (error) {
      console.error("Failed to fetch Z report data:", error);
      toast.error(t("failed_to_load_expected_cash"));
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
            closingCash: amount,
            expectedCash: zReportData?.expectedCash ?? 0,
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
      // Create the order with selected type
      const createdOrder = await createOrderMutation.mutateAsync({
        shiftId: currentShift.id,
        taxRate,
        branchId: branch.id,
        restaurantId: restaurant.id,
        orderType,
        tableId: orderType === "takeaway" ? null : tableId,
        customerInfo,
      });

      // Resume the order to make it the current active order
      await resumeOrderMutation.mutateAsync(createdOrder.id);

      // Invalidate queries for complete sync
      queryClient.invalidateQueries({ queryKey: ["branch-tables"] });

      setNewOrderDialogOpen(false);
      setActiveTab("new-order");

      // If there was a pending item waiting for order type, add it now
      if (pendingItemForOrderType) {
        const menuItem = pendingItemForOrderType.menuItem;
        setPendingItemForOrderType(null);
        
        // Store the item and order info, then open modifier dialog
        setPendingItemAfterDraft({ menuItem, orderId: createdOrder.id });
        setSelectedItemForModifiers(menuItem);
        setModifierDialogOpen(true);
      } else {
        toast.success(t("order_created"));
      }
    } catch (error) {
      toast.error(t("failed_create_order"));
    }
  };

  const handleSelectItem = async (menuItem: { id: string; name: string; price: number }) => {
    if (!currentShift || !branch || !restaurant) return;

    // If we have a draft order but no DB order yet, create it first
    if (!currentOrder?.id && draftOrder) {
      try {
        // Create order and capture the returned order data
        const createdOrder = await createOrderMutation.mutateAsync({
          shiftId: currentShift.id,
          taxRate,
          branchId: branch.id,
          restaurantId: restaurant.id,
          orderType: draftOrder.orderType,
          tableId: draftOrder.orderType === "takeaway" ? null : draftOrder.tableId,
          customerInfo: draftOrder.customerInfo,
        });

        // Immediately resume to ensure it's the active current order in cache
        // This also triggers proper query invalidation
        await resumeOrderMutation.mutateAsync(createdOrder.id);

        // Clear draft state
        setDraftOrder(null);

        // Invalidate additional queries for complete sync
        queryClient.invalidateQueries({ queryKey: ["branch-tables"] });

        // Now proceed with adding the item - use the createdOrder directly
        // Store the item and order info, then open modifier dialog
        setPendingItemAfterDraft({ menuItem, orderId: createdOrder.id });
        setSelectedItemForModifiers(menuItem);
        setModifierDialogOpen(true);
        return;
      } catch (error) {
        toast.error(t("failed_create_order"));
        return;
      }
    }

    // FIRST-ITEM FLOW: If no current order (or order has zero items), show order type dialog
    const activeOrderItems = currentOrder?.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    if (!currentOrder?.id || activeOrderItems.length === 0) {
      // Store the pending item and show order type dialog
      setPendingItemForOrderType({ menuItem });
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
    // Use pendingItemAfterDraft order ID if available (draft order just created)
    // Otherwise use currentOrder ID
    const orderId = pendingItemAfterDraft?.orderId || currentOrder?.id;
    
    if (!orderId || !restaurant) return;

    try {
      // Calculate price with modifiers
      const modifierTotal = modifiers.reduce((sum, m) => sum + m.price_adjustment, 0);
      const finalPrice = menuItem.price + modifierTotal;
      const menuItemWithPrice = { ...menuItem, price: finalPrice };

      // MARKET-GRADE KITCHEN WORKFLOW:
      // Determine if this is a dine-in order (has table_id)
      // - If using pendingItemAfterDraft, check draftOrder which was just used to create the order
      // - If using currentOrder, check its table_id
      const isDineInOrder = pendingItemAfterDraft 
        ? !!draftOrder?.tableId || !!currentOrder?.table_id
        : !!currentOrder?.table_id;

      // Add item to order
      const orderItem = await addItemMutation.mutateAsync({
        orderId: orderId,
        restaurantId: restaurant.id,
        menuItem: menuItemWithPrice,
        kdsEnabled: settings?.kds_enabled ?? false,
        isDineIn: isDineInOrder, // Only dine-in orders go to kitchen immediately
      });

      // Add modifiers if any
      if (modifiers.length > 0 && orderItem) {
        await addModifiersMutation.mutateAsync({
          orderItemId: orderItem.id,
          modifiers,
        });
      }

      // Clear pending item state if it was used
      if (pendingItemAfterDraft) {
        setPendingItemAfterDraft(null);
      }

      await refetchOrder();

      // Update order totals
      const items = [...orderItems, { price: finalPrice, quantity: 1 }];
      const newSubtotal = roundJOD(items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0));
      // Use discount from currentOrder if available (may still be null for fresh draft orders)
      const discountType = currentOrder?.discount_type || null;
      const discountValue = currentOrder?.discount_value || null;
      const totals = calculateTotals(newSubtotal, discountType, discountValue);

      await updateOrderMutation.mutateAsync({
        orderId: orderId,
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
    // Validate we have an order and item to remove
    if (!currentOrder) {
      console.error("handleRemoveItem: No current order");
      return;
    }

    if (!itemId) {
      console.error("handleRemoveItem: No item ID provided");
      return;
    }

    // Optimistic UI: remove immediately from cache so the list + totals re-render instantly
    queryClient.setQueriesData(
      { queryKey: ["current-order"], exact: false },
      (old: any) => {
        if (!old) return old;
        const oldItems = Array.isArray(old.order_items) ? old.order_items : [];
        return {
          ...old,
          order_items: oldItems.filter((i: any) => i.id !== itemId),
        };
      }
    );

    try {
      await removeItemMutation.mutateAsync(itemId);

      // Recalculate totals (note: item.price already includes modifiers in this POS)
      const remainingActiveItems =
        currentOrder.order_items?.filter(
          (i: { id: string; voided: boolean }) => !i.voided && i.id !== itemId
        ) || [];

      const newSubtotal = roundJOD(
        remainingActiveItems.reduce(
          (sum: number, item: { price: number; quantity: number }) =>
            sum + Number(item.price) * item.quantity,
          0
        )
      );

      const totals = calculateTotals(
        newSubtotal,
        currentOrder.discount_type,
        currentOrder.discount_value
      );

      await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });

      // Ensure server truth sync
      queryClient.invalidateQueries({ queryKey: ["current-order"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["open-orders"], exact: false });
      await refetchOrder();
    } catch (error) {
      console.error("handleRemoveItem error:", error);
      // Roll back by refetching from server
      queryClient.invalidateQueries({ queryKey: ["current-order"], exact: false });
      await refetchOrder();
      toast.error(t("failed_remove_item"));
    }
  };


  const handleVoidItem = (itemId: string) => {
    // Only allow void on open orders
    if (currentOrder?.status !== "open") {
      toast.error(t("cannot_void_must_be_open"));
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

  const handleApplyDiscount = async (type: "percent" | "fixed", value: number) => {
    if (!currentOrder) return;
    
    // Validate order status - only allow discount on open orders
    if (currentOrder.status !== "open") {
      toast.error(t("failed_apply_discount"));
      return;
    }
    
    try {
      // Use stored subtotal from DB or calculate fresh from items
      const orderSubtotal = currentOrder.subtotal ?? subtotal;
      
      // Recalculate totals with the new discount using the correct subtotal
      const totals = calculateTotals(orderSubtotal, type, value);
      
      console.log('[handleApplyDiscount] Debug:', {
        orderSubtotal,
        uiSubtotal: subtotal,
        discountType: type,
        discountValue: value,
        taxRate,
        serviceChargeRate,
        currency,
        calculatedTotals: totals,
      });
      
      // Save discount AND recalculated totals to database
      // This ensures DB order.total matches UI total for payment validation
      const result = await updateOrderMutation.mutateAsync({
        orderId: currentOrder.id,
        updates: {
          discount_type: type,
          discount_value: value,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
      
      console.log('[handleApplyDiscount] Update result:', result);
      toast.success(t("discount_applied"));
    } catch (error) {
      console.error('[handleApplyDiscount] Error:', error);
      toast.error(t("failed_apply_discount"));
    }
  };

  const handleClearDiscount = async () => {
    if (!currentOrder) return;
    try {
      // Recalculate totals without discount
      const totals = calculateTotals(subtotal, null, null);
      
      // Clear discount AND save recalculated totals to database
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
    // Guard: Order must exist
    if (!currentOrder) {
      toast.error(`${t("error_order_empty_title")}\n${t("error_order_empty_desc")}`);
      return;
    }
    
    // Guard: Order must have items
    const activeItems = currentOrder.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    if (activeItems.length === 0) {
      toast.error(`${t("error_order_empty_title")}\n${t("error_order_empty_desc")}`);
      return;
    }
    
    // Guard: Order must be OPEN status
    if (currentOrder.status === "held") {
      toast.error(`${t("error_order_held_title")}\n${t("error_order_held_desc")}\n${t("error_order_held_action")}`);
      return;
    }
    
    if (currentOrder.status === "paid" || currentOrder.status === "refunded") {
      toast.info(`${t("error_order_closed_title")}\n${t("error_order_closed_desc")}`);
      return;
    }
    
    if (currentOrder.status !== "open") {
      toast.error(`${t("error_order_closed_title")}\n${t("error_order_closed_desc")}`);
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

      // Use atomic payment completion - prevents double payments
      await completePaymentMutation.mutateAsync({ orderId: currentOrder.id, payments });
      
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

      // Inventory deduction - only if module is enabled
      // If inventory_enabled = false: skip silently, no errors, no warnings, no logs
      if (settings?.inventory_enabled) {
        // TODO: Re-enable in Phase 2 when inventory system is fully tested
        // inventoryDeductionMutation.mutateAsync(currentOrder.id);
        console.info("[handlePaymentConfirm] Inventory enabled but Phase 1 - deduction skipped for order:", currentOrder.id);
      }
      // When inventory disabled: proceed silently - this is intended behavior
      
    } catch (error) {
      // ═══════════════════════════════════════════════════════════════════
      // CRITICAL: Convert all errors to user-friendly Arabic messages
      // NEVER show raw system errors to cashier
      // ═══════════════════════════════════════════════════════════════════
      console.error("[handlePaymentConfirm] Payment error (internal):", error);
      
      // Use the cashier error handler to get user-friendly message
      const errorMessage = getCashierErrorMessage(error, t);
      toast.error(errorMessage);
      
      // Re-throw to signal failure to PaymentDialog (for state reset)
      throw error;
    }
  };

  // Handler for New Order button in OrderPanel
  // NEW UX: "New Order" button does NOT show order type dialog
  // It only prepares empty state - order type is asked on first item click
  const handleNewOrderButton = async () => {
    if (!currentOrder) {
      // No current order - just clear any pending item state, ready for first item click
      setPendingItemForOrderType(null);
      setDraftOrder(null);
      // Don't show dialog - cashier will click an item to start
      return;
    }

    // Check if current order has non-voided items
    const activeItems = currentOrder.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
    
    if (activeItems.length === 0) {
      // Order has zero items - auto-discard silently, ready for first item click
      try {
        await cancelOrderMutation.mutateAsync({ 
          orderId: currentOrder.id, 
          reason: "Empty order discarded" 
        });
      } catch {
        // Ignore cancel failure - proceed anyway
      }
      // Don't show dialog - cashier will click an item to start
      return;
    }

    // Has items - show confirmation dialog (hold current order first)
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
      // Don't show dialog - cashier will click an item to start
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
      
      // Don't show dialog - cashier will click an item to start new order
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
      // Don't show dialog - cashier will click an item to start
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
      
      await cancelOrderMutation.mutateAsync({ orderId, reason: t("cancelled_from_held") });
      
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
    
    // Soft lock: Paid orders must be refunded, not voided
    if (currentOrder.status === "paid") {
      toast.error(t("void_paid_use_refund"));
      return;
    }
    
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
      setTableOrdersDialogOpen(false); // Close table orders dialog after successful void
      toast.success(t("order_voided"));
    } catch (error: unknown) {
      // Use user-friendly Arabic message instead of raw error
      console.error("[handleVoidOrderConfirm] Error:", error);
      const errorMessage = getCashierErrorMessage(error, t);
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
    // Soft lock: Block refund if shift is closed
    if (!currentShift || currentShift.status !== "open") {
      toast.error(t("cannot_refund_shift_closed"));
      return;
    }
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
      // Use user-friendly Arabic message instead of raw error
      console.error("[handleRefundConfirm] Error:", error);
      const errorMessage = getCashierErrorMessage(error, t);
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
        // Order has a table - fetch active orders for that table
        // Include "new" status - QR orders are confirmed as "new" for KDS
        const tableOrders = await supabase
          .from("orders")
          .select("id, order_number, status, total, subtotal, created_at, notes, order_notes, table_id, order_items(id, name, quantity, price, notes, voided)")
          .eq("table_id", confirmedOrder.table_id)
          .in("status", ["new", "open"])
          .order("created_at", { ascending: false });
        
        const activeOrders = tableOrders.data || [];
        
        if (activeOrders.length === 1) {
          // Only one active order - open it directly
          setActiveTab("tables");
          try {
            await resumeOrderMutation.mutateAsync(activeOrders[0].id);
            setActiveTab("new-order");
            toast.success(t("order_confirmed"));
          } catch (resumeError) {
            console.error("Failed to resume confirmed order:", resumeError);
            toast.success(t("order_confirmed"));
          }
        } else {
          // Multiple active orders - show selection dialog
          const table = tables.find(t => t.id === confirmedOrder.table_id);
          
          setActiveTab("tables");
          setSelectedTableForOrders({
            id: confirmedOrder.table_id,
            name: table?.table_name || t("unknown"),
            orders: activeOrders as typeof openOrders,
          });
          setTableOrdersDialogOpen(true);
          toast.success(t("order_confirmed"));
        }
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
    // Soft lock: Block move if order is in 'ready' or 'paid' status
    const orderToMove = openOrders.find(o => o.id === orderId);
    if (orderToMove && (orderToMove.status === "ready" || orderToMove.status === "paid")) {
      toast.error(t("cannot_move_ready_order"));
      return;
    }
    
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
      
      // MARKET-STANDARD: Auto-hold current order when switching to a new table
      // A cashier can only have ONE active (OPEN) order at a time
      if (currentOrder && currentOrder.status === "open") {
        const activeItems = currentOrder.order_items?.filter((i: { voided: boolean }) => !i.voided) || [];
        
        if (activeItems.length > 0) {
          // Hold the current order before creating new draft
          try {
            await holdOrderMutation.mutateAsync(currentOrder.id);
            toast.info(t("order_held_automatically"));
          } catch (error) {
            toast.error(t("failed_hold_order"));
            return; // Don't proceed if hold fails
          }
        } else {
          // Empty open order - cancel it silently
          try {
            await cancelOrderMutation.mutateAsync({ 
              orderId: currentOrder.id, 
              reason: "Empty order discarded on table switch" 
            });
          } catch {
            // Ignore cancel failure - proceed anyway
          }
        }
      }
      
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
      // SINGLE SOURCE OF TRUTH: persist the explicit order.id we intend to open
      setActiveOrderId(orderId);
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      await refetchOrder();
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
        reason: t("empty_order_cancelled"),
      });

      // Update the selectedTableForOrders to remove the cancelled order
      if (selectedTableForOrders) {
        const remainingOrders = selectedTableForOrders.orders.filter((o) => o.id !== orderId);
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

  // Handler for voiding order from table orders dialog
  const handleVoidTableOrder = async (orderId: string) => {
    // Resume the order first to load it, then open void dialog
    try {
      setActiveOrderId(orderId);
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      await refetchOrder();
      // Open void dialog for this order
      setVoidOrderDialogOpen(true);
    } catch (error) {
      toast.error(t("failed_load_order"));
    }
  };

  // Handler for paying order from table orders dialog
  const handlePayTableOrder = async (orderId: string) => {
    // First resume the order to load it
    try {
      setActiveOrderId(orderId);
      await resumeOrderMutation.mutateAsync(orderId);
      setActiveTab("new-order");
      // Fetch fresh order data before opening payment dialog
      await refetchOrder();
      setPaymentDialogOpen(true);
    } catch (error) {
      toast.error(t("failed_load_order"));
    }
  };

  // Handler for table checkout (group pay) - pays all orders at once
  const handlePayTable = () => {
    if (!selectedTableForOrders || selectedTableForOrders.orders.length === 0) return;
    setTableCheckoutDialogOpen(true);
  };

  // Handler for confirming table checkout payment
  const handleTableCheckoutConfirm = async (payments: { method: string; amount: number }[]) => {
    if (!selectedTableForOrders || !restaurant) return;
    
    const orderIds = selectedTableForOrders.orders.map(o => o.id);
    const combinedTotal = selectedTableForOrders.orders.reduce((sum, o) => sum + Number(o.total), 0);
    
    try {
      await tableCheckoutMutation.mutateAsync({
        orderIds,
        payments,
        tableId: selectedTableForOrders.id,
      });
      
      // Audit log for table checkout
      auditLogMutation.mutate({
        entityType: "order",
        entityId: selectedTableForOrders.id,
        action: "TABLE_CHECKOUT",
        details: {
          table_name: selectedTableForOrders.name,
          order_count: orderIds.length,
          order_numbers: selectedTableForOrders.orders.map(o => o.order_number),
          combined_total: combinedTotal,
          payments: payments.map(p => ({ method: p.method, amount: p.amount })),
        },
      });
      
      setTableCheckoutDialogOpen(false);
      setTableOrdersDialogOpen(false);
      setSelectedTableForOrders(null);
      toast.success(t("table_checkout_success"));
    } catch (error) {
      console.error("[handleTableCheckoutConfirm] Error:", error);
      const errorMessage = getCashierErrorMessage(error, t);
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleStartMerge = (tableId: string) => {
    // Cancel move mode if active
    if (moveMode?.active) {
      setMoveMode(null);
    }
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

    // Soft lock: Block merge if either order is paid
    if (order1.status === "paid" || order2.status === "paid") {
      toast.error(t("cannot_merge_paid_orders"));
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

  // Send to Kitchen Handler
  const handleSendToKitchen = async () => {
    if (!currentOrder || !restaurant) return;
    
    const orderItems = currentOrder.order_items || [];
    const pendingItems = orderItems.filter(
      (item: any) => !item.voided && !item.kitchen_sent_at
    );
    
    if (pendingItems.length === 0) {
      toast.info(t("send_to_kitchen_tooltip_disabled"));
      return;
    }
    
    try {
      await sendToKitchenMutation.mutateAsync({
        orderId: currentOrder.id,
        restaurantId: restaurant.id,
        itemIds: pendingItems.map((item: any) => item.id),
      });
      toast.success(t("items_sent_to_kitchen"));
    } catch (error) {
      toast.error(t("send_to_kitchen_failed"));
    }
  };

  // Move Order Handlers
  const handleStartMoveOrder = (tableId: string) => {
    // Cancel merge mode if active
    if (mergeSelection.length > 0) {
      setMergeSelection([]);
    }
    
    const order = tableOrderMap.get(tableId);
    if (!order) {
      toast.error(t("no_order_to_move"));
      return;
    }
    
    // Only allow moving OPEN or HELD orders (not paid, closed, etc.)
    if (order.status !== "open" && order.status !== "held") {
      toast.error(t("can_only_move_open_orders"));
      return;
    }
    
    setMoveMode({
      active: true,
      sourceTableId: tableId,
      orderId: order.id,
      orderNumber: order.order_number,
    });
    toast.info(t("select_target_table"));
  };

  const handleCancelMoveOrder = () => {
    setMoveMode(null);
  };

  const handleMoveOrderToTable = async (targetTableId: string) => {
    if (!moveMode || !restaurant) return;
    
    const sourceTable = tables.find(t => t.id === moveMode.sourceTableId);
    const targetTable = tables.find(t => t.id === targetTableId);
    
    if (!targetTable) {
      toast.error(t("table_not_found"));
      handleCancelMoveOrder();
      return;
    }
    
    // Prevent moving to same table
    if (targetTableId === moveMode.sourceTableId) {
      toast.error(t("cannot_move_to_same_table"));
      return;
    }
    
    // Check if target table has an open order
    const targetOrder = tableOrderMap.get(targetTableId);
    if (targetOrder && (targetOrder.status === "open" || targetOrder.status === "held" || targetOrder.status === "confirmed")) {
      toast.error(t("target_table_has_order"));
      return;
    }
    
    try {
      await moveToTableMutation.mutateAsync({
        orderId: moveMode.orderId,
        tableId: targetTableId,
        tableName: targetTable.table_name,
        previousTableId: moveMode.sourceTableId,
        previousTableName: sourceTable?.table_name,
      });
      
      toast.success(t("order_moved_successfully"));
      handleCancelMoveOrder();
    } catch (error) {
      toast.error(t("failed_move_order"));
      handleCancelMoveOrder();
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
      primaryTableName: isPrimaryFirst ? table1?.table_name || t("table") : table2?.table_name || t("table"),
      secondaryTableName: isPrimaryFirst ? table2?.table_name || t("table") : table1?.table_name || t("table"),
      primaryOrderNumber: isPrimaryFirst ? order1.order_number : order2.order_number,
      secondaryOrderNumber: isPrimaryFirst ? order2.order_number : order1.order_number,
    };
  };

  const mergeData = getMergeData();

  if (sessionLoading || shiftLoading || activeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Restaurant inactive guard - block ALL POS interactions
  if (isRestaurantActive === false) {
    return <RestaurantInactiveScreen />;
  }

  if (sessionError instanceof NoCashierRoleError || !session || !restaurant || !branch) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">{t("no_restaurant_or_branch")}</p>
        <button onClick={signOut} className="text-primary underline">
          {t("sign_out")}
        </button>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-destructive">{t("failed_load_session")}</p>
        <button onClick={signOut} className="text-primary underline">
          {t("sign_out")}
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <POSHeader
        restaurantName={restaurant.name}
        restaurantLogo={restaurant.logo_url}
        cashierDisplayName={displayName ? `${displayName} - ${role?.replace('_', ' ')}` : (user?.email || "")}
        shiftStatus={shiftOpen ? "open" : "closed"}
        onSignOut={signOut}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onCashMovement={() => setCashMovementDialogOpen(true)}
        onViewHeldOrders={() => setHeldOrdersDialogOpen(true)}
        onViewRecentOrders={() => setRecentOrdersDialogOpen(true)}
        onViewZReport={() => setZReportDialogOpen(true)}
        onViewInventorySummary={() => setInventorySummaryDialogOpen(true)}
        heldOrdersCount={heldOrders.length}
        inventoryEnabled={settings?.inventory_enabled}
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
            <h2 className="text-xl font-semibold mb-2">{t("no_active_shift")}</h2>
            <p className="text-muted-foreground mb-6">{t("must_open_shift")}</p>
            <button
              onClick={handleOpenShift}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors min-h-[48px]"
            >
              {t("open_shift")}
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
                // Tab switch is UI navigation only - no order creation or dialogs
              }}
              pendingCount={pendingOrders.length}
              openCount={openOrdersNoTable.length}
              occupiedTablesCount={occupiedTablesCount}
              favoritesCount={favoriteItems.length}
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
                    placeholder={t("search_items_placeholder")}
                    className="w-full px-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex-1 overflow-hidden">
                  <MenuItemGrid
                    items={filteredMenuItems}
                    currency={currency}
                    onSelectItem={handleSelectItem}
                    onToggleFavorite={(itemId, isFavorite) => toggleFavoriteMutation.mutate({ itemId, isFavorite })}
                    isLoading={isSearchActive ? allItemsLoading : itemsLoading}
                    showCategoryName={isSearchActive}
                    orderItemIds={orderItemIds}
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
                  hasTable={!!currentOrder?.table_id}
                  kdsEnabled={settings?.kds_enabled}
                  onSendToKitchen={handleSendToKitchen}
                  isSendingToKitchen={sendToKitchenMutation.isPending}
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
                  onToggleFavorite={(itemId, isFavorite) => toggleFavoriteMutation.mutate({ itemId, isFavorite })}
                  isLoading={favoritesLoading}
                  orderItemIds={orderItemIds}
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
                  hasTable={!!currentOrder?.table_id}
                  kdsEnabled={settings?.kds_enabled}
                  onSendToKitchen={handleSendToKitchen}
                  isSendingToKitchen={sendToKitchenMutation.isPending}
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
              {/* Move mode banner */}
              {moveMode?.active && (
                <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    {t("select_target_table")} (#{moveMode.orderNumber})
                  </span>
                  <button
                    onClick={handleCancelMoveOrder}
                    className="text-sm text-destructive hover:underline"
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}

              {/* Merge mode banner */}
              {mergeSelection.length > 0 && !moveMode?.active && (
                <div className="mb-4 p-3 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {mergeSelection.length === 1 
                      ? t("select_second_table") 
                      : t("ready_to_merge")}
                  </span>
                  <button
                    onClick={handleCancelMerge}
                    className="text-sm text-destructive hover:underline"
                  >
                    {t("cancel")}
                  </button>
                </div>
              )}

              {tablesLoading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : tables.length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p className="text-lg font-medium">{t("no_tables_found")}</p>
                  <p className="text-sm mt-1">{t("ask_owner_create_tables")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {tables.map((table) => {
                    const order = tableOrderMap.get(table.id);
                    const isSelected = mergeSelection.includes(table.id);
                    const orderCount = tableOrderCountMap.get(table.id);
                    const oldestOrderCreatedAt = tableOldestOrderMap.get(table.id);
                    
                    // Determine table status: free, active (open), or held
                    const getTableStatus = (): "free" | "active" | "held" => {
                      if (!order) return "free";
                      if (order.status === "open") return "active";
                      if (order.status === "held") return "held";
                      // For confirmed or other statuses, treat as active
                      return "active";
                    };
                    
                    const tableStatus = getTableStatus();
                    const isOccupied = tableStatus !== "free";
                    
                    // Move mode: highlight eligible target tables (FREE only)
                    const isMoveSource = moveMode?.active && moveMode.sourceTableId === table.id;
                    const isMoveTarget = moveMode?.active && !isMoveSource && tableStatus === "free";
                    const isMoveDisabled = moveMode?.active && !isMoveSource && tableStatus !== "free";

                    // Determine if move button should show:
                    // - Table has order with status OPEN or HELD
                    // - Not in merge mode or move mode
                    // - Order is dine-in (has table_id, which it does if it's in tableOrderMap)
                    const canShowMoveButton = isOccupied && 
                      mergeSelection.length === 0 && 
                      !moveMode?.active && 
                      order && 
                      (order.status === "open" || order.status === "held");

                    // Handle click based on mode
                    const handleClick = () => {
                      if (moveMode?.active) {
                        if (isMoveSource) {
                          // Clicking source table cancels move mode
                          handleCancelMoveOrder();
                        } else if (tableStatus === "free") {
                          // Move order to this table
                          handleMoveOrderToTable(table.id);
                        } else {
                          // Table has order - show error
                          toast.error("الطاولة تحتوي على طلب نشط");
                        }
                      } else {
                        handleTableClick(table.id);
                      }
                    };

                    return (
                      <TableCard
                        key={table.id}
                        tableName={table.table_name}
                        capacity={table.capacity || 4}
                        tableStatus={tableStatus}
                        orderNumber={order?.order_number}
                        orderCount={orderCount}
                        orderCreatedAt={oldestOrderCreatedAt}
                        onClick={handleClick}
                        disabled={
                          createOrderMutation.isPending || 
                          resumeOrderMutation.isPending || 
                          mergeOrdersMutation.isPending || 
                          moveToTableMutation.isPending ||
                          isMoveDisabled
                        }
                        selected={isSelected || isMoveSource || isMoveTarget}
                        showMergeButton={isOccupied && mergeSelection.length === 0 && !moveMode?.active}
                        onMergeClick={() => handleStartMerge(table.id)}
                        showMoveButton={canShowMoveButton}
                        onMoveClick={() => handleStartMoveOrder(table.id)}
                      />
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
        isExpectedCashLoading={zReportLoading}
        currency={currency}
      />

      <NewOrderDialog
        open={newOrderDialogOpen}
        onOpenChange={(open) => {
          setNewOrderDialogOpen(open);
          // Clear pending item if dialog is closed without confirming
          if (!open) {
            setPendingItemForOrderType(null);
          }
        }}
        tables={tables}
        tablesLoading={tablesLoading}
        onConfirm={handleNewOrder}
        isLoading={createOrderMutation.isPending}
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={currentOrder?.total ? Number(currentOrder.total) : total}
        currency={currency}
        onConfirm={handlePaymentConfirm}
        isLoading={completePaymentMutation.isPending}
        paymentMethods={paymentMethods}
        orderStatus={currentOrder?.status}
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

      <InventorySummaryDialog
        open={inventorySummaryDialogOpen}
        onOpenChange={setInventorySummaryDialogOpen}
        inventoryData={inventoryMovements || null}
        isLoading={inventoryMovementsLoading}
        shiftOpenedAt={currentShift?.opened_at}
        shiftClosedAt={currentShift?.closed_at}
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
        <>
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
            onPayTable={handlePayTable}
            onVoidOrder={handleVoidTableOrder}
            onCancelEmptyOrder={handleCancelEmptyTableOrder}
            isLoading={resumeOrderMutation.isPending || cancelOrderMutation.isPending || voidOrderMutation.isPending}
          />

          <TableCheckoutDialog
            open={tableCheckoutDialogOpen}
            onOpenChange={setTableCheckoutDialogOpen}
            tableName={selectedTableForOrders.name}
            orders={selectedTableForOrders.orders.map(o => ({
              id: o.id,
              order_number: o.order_number,
              total: o.total,
              itemCount: o.order_items?.filter(i => !i.voided).length || 0,
            }))}
            currency={currency}
            onConfirm={handleTableCheckoutConfirm}
            isLoading={tableCheckoutMutation.isPending}
            paymentMethods={paymentMethods}
          />
        </>
      )}

      {/* Inventory Warnings Dialog */}
      <InventoryWarningsDialog
        open={inventoryWarnings.length > 0}
        onOpenChange={(open) => { if (!open) setInventoryWarnings([]); }}
        warnings={inventoryWarnings}
      />
    </div>
  );
}
