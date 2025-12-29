import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useCashierRestaurant,
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
  useRestaurantSettings,
  useZReport,
  useCashierCategories,
  useCashierMenuItems,
} from "@/hooks/pos";
import {
  useAddOrderItem,
  useUpdateOrderItemQuantity,
  useRemoveOrderItem,
  useVoidOrderItem,
  useUpdateOrderItemNotes,
} from "@/hooks/pos/useOrderItems";
import { useAddPayment, useCompleteOrder } from "@/hooks/pos/usePayments";
import { POSHeader, CategoryList, MenuItemGrid, OrderPanel } from "@/components/pos";
import {
  ShiftDialog,
  PaymentDialog,
  DiscountDialog,
  HeldOrdersDialog,
  RecentOrdersDialog,
  CancelOrderDialog,
  CashMovementDialog,
  ZReportDialog,
  ItemNotesDialog,
} from "@/components/pos/dialogs";

export default function POS() {
  const { signOut, user } = useAuth();
  const { data: restaurant, isLoading: restaurantLoading } = useCashierRestaurant();
  const { data: currentShift, isLoading: shiftLoading } = useCurrentShift();
  const { data: settings } = useRestaurantSettings();
  const { data: categories = [] } = useCashierCategories();
  const { data: heldOrders = [] } = useHeldOrders(currentShift?.id);
  const { data: recentOrders = [] } = useRecentOrders(currentShift?.id);
  const { data: currentOrder, refetch: refetchOrder } = useCurrentOrder(currentShift?.id);
  const { data: zReportData, isLoading: zReportLoading } = useZReport(currentShift?.id);

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();
  const { data: menuItems = [], isLoading: itemsLoading } = useCashierMenuItems(selectedCategoryId);

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
  const [selectedItemForNotes, setSelectedItemForNotes] = useState<{ id: string; name: string; notes?: string | null } | null>(null);

  const currency = settings?.currency || "JOD";
  const taxRate = settings?.tax_rate || 0.16;
  const serviceChargeRate = settings?.service_charge_rate || 0;

  // Auto-select first category
  useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // Calculate order totals
  const orderItems = currentOrder?.order_items?.filter((item: { voided: boolean }) => !item.voided) || [];
  const subtotal = orderItems.reduce((sum: number, item: { price: number; quantity: number }) => sum + Number(item.price) * item.quantity, 0);
  
  const calculateTotals = useCallback((sub: number, discType?: string | null, discVal?: number | null) => {
    let discountAmount = 0;
    if (discVal && discVal > 0) {
      discountAmount = discType === "percentage" ? (sub * discVal) / 100 : discVal;
    }
    const afterDiscount = sub - discountAmount;
    const serviceCharge = afterDiscount * serviceChargeRate;
    const taxAmount = (afterDiscount + serviceCharge) * taxRate;
    const total = afterDiscount + serviceCharge + taxAmount;
    return { discountAmount, serviceCharge, taxAmount, total };
  }, [serviceChargeRate, taxRate]);

  const { discountAmount, serviceCharge, taxAmount, total } = calculateTotals(
    subtotal,
    currentOrder?.discount_type,
    currentOrder?.discount_value
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
          await closeShiftMutation.mutateAsync({ shiftId: currentShift.id, closingCash: amount });
          toast.success("Shift closed");
        }
      }
      setShiftDialogOpen(false);
    } catch (error) {
      toast.error("Failed to " + shiftDialogMode + " shift");
    }
  };

  const handleSelectItem = async (menuItem: { id: string; name: string; price: number }) => {
    if (!currentShift) return;
    
    try {
      let orderId = currentOrder?.id;
      
      if (!orderId) {
        const newOrder = await createOrderMutation.mutateAsync({
          shiftId: currentShift.id,
          taxRate,
        });
        orderId = newOrder.id;
      }

      await addItemMutation.mutateAsync({ orderId, menuItem });
      await refetchOrder();
      
      // Update order totals
      const items = [...orderItems, { price: menuItem.price, quantity: 1 }];
      const newSubtotal = items.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
      const totals = calculateTotals(newSubtotal, currentOrder?.discount_type, currentOrder?.discount_value);
      
      await updateOrderMutation.mutateAsync({
        orderId,
        updates: {
          subtotal: newSubtotal,
          tax_amount: totals.taxAmount,
          service_charge: totals.serviceCharge,
          total: totals.total,
        },
      });
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
    try {
      await removeItemMutation.mutateAsync(itemId);
      await refetchOrder();
    } catch (error) {
      toast.error("Failed to remove item");
    }
  };

  const handleVoidItem = (itemId: string) => {
    const item = currentOrder?.order_items?.find((i: { id: string }) => i.id === itemId);
    if (item) {
      setSelectedItemForNotes({ id: item.id, name: item.name });
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

  const handlePaymentConfirm = async (payments: { method: "cash" | "card" | "mobile"; amount: number }[]) => {
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

  if (restaurantLoading || shiftLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">No restaurant assigned to this cashier.</p>
        <button onClick={signOut} className="text-primary underline">Sign Out</button>
      </div>
    );
  }

  const shiftOpen = currentShift?.status === "open";

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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">No Active Shift</h2>
            <p className="text-muted-foreground mb-6">You must open a shift before starting work.</p>
            <button
              onClick={handleOpenShift}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Open Shift
            </button>
          </div>
        </div>
      ) : (
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
          <div className="flex-1 bg-muted/30">
            <MenuItemGrid
              items={menuItems}
              currency={currency}
              onSelectItem={handleSelectItem}
              isLoading={itemsLoading}
            />
          </div>

          {/* Order Panel */}
          <div className="w-80 border-l">
            <OrderPanel
              orderNumber={currentOrder?.order_number}
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
            />
          </div>
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
      />

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        total={total}
        currency={currency}
        onConfirm={handlePaymentConfirm}
        isLoading={addPaymentMutation.isPending}
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
        orders={recentOrders}
        currency={currency}
      />

      <CancelOrderDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        orderNumber={currentOrder?.order_number}
        onConfirm={handleCancelOrder}
        isLoading={cancelOrderMutation.isPending}
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

      <ItemNotesDialog
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
        itemName={selectedItemForNotes?.name || ""}
        currentNotes={selectedItemForNotes?.notes}
        onSave={handleSaveNotes}
        isLoading={updateNotesMutation.isPending}
      />
    </div>
  );
}
