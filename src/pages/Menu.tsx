import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Minus, Plus, ShoppingCart, Check, Globe, Send } from "lucide-react";

/* =======================
   Types
======================= */
type Restaurant = {
  id: string;
  name: string | null;
};

type Category = {
  id: string;
  name: string;
  sort_order: number | null;
};

type Item = {
  id: string;
  name: string;
  price: number;
  category_id: string;
  is_offer: boolean | null;
};

type SelectedItem = {
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes: string;
};

type Language = "ar" | "en";

/* =======================
   Translations
======================= */
const translations = {
  ar: {
    menu: "القائمة",
    table: "الطاولة",
    add: "أضف للطلب",
    quantity: "الكمية",
    notes: "ملاحظات",
    notesPlaceholder: "بدون سكر، حليب أقل...",
    confirmOrder: "تأكيد الطلب",
    orderSummary: "ملخص الطلب",
    confirm: "تأكيد",
    cancel: "إلغاء",
    noItems: "لا يوجد أصناف",
    orderSent: "تم إرسال طلبك للكاشير",
    orderError: "حدث خطأ أثناء إرسال الطلب",
    yourOrder: "طلبك",
    total: "المجموع",
    sendToWhatsApp: "إرسال عبر واتساب",
    noPhone: "لا يوجد رقم هاتف للكاشير",
    loadError: "تعذر فتح القائمة",
    restaurantNotFound: "المطعم غير موجود",
    invalidRestaurant: "Restaurant غير صالح",
    categoriesError: "فشل تحميل التصنيفات",
    itemsError: "فشل تحميل الأصناف",
    close: "إغلاق",
  },
  en: {
    menu: "Menu",
    table: "Table",
    add: "Add to Order",
    quantity: "Quantity",
    notes: "Notes",
    notesPlaceholder: "No sugar, less milk...",
    confirmOrder: "Confirm Order",
    orderSummary: "Order Summary",
    confirm: "Confirm",
    cancel: "Cancel",
    noItems: "No items",
    orderSent: "Your order has been sent to the cashier",
    orderError: "Error sending order",
    yourOrder: "Your Order",
    total: "Total",
    sendToWhatsApp: "Send via WhatsApp",
    noPhone: "Cashier phone number not found",
    loadError: "Unable to open menu",
    restaurantNotFound: "Restaurant not found",
    invalidRestaurant: "Invalid restaurant",
    categoriesError: "Failed to load categories",
    itemsError: "Failed to load items",
    close: "Close",
  },
};

/* =======================
   Component
======================= */
export default function Menu() {
  const { restaurantId, tableCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // Language state
  const [lang, setLang] = useState<Language>("ar");
  const t = translations[lang];

  // Item selection state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemNotes, setItemNotes] = useState("");

  // Cart state (local only)
  const [cart, setCart] = useState<SelectedItem[]>([]);

  // Confirm order state
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  /* =======================
     Load Data
  ======================= */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      if (!restaurantId) {
        setError(t.invalidRestaurant);
        setLoading(false);
        return;
      }

      /* 1️⃣ Restaurant - use public RPC function */
      const { data: restaurantData, error: restaurantError } = await supabase
        .rpc("get_public_restaurant", { p_restaurant_id: restaurantId });

      if (restaurantError || !restaurantData || restaurantData.length === 0) {
        setError(t.restaurantNotFound);
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData[0]);

      /* 2️⃣ Categories */
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) {
        setError(t.categoriesError);
        setLoading(false);
        return;
      }

      setCategories(categoriesData || []);

      /* 3️⃣ Items - get by category IDs */
      const categoryIds = (categoriesData || []).map((c) => c.id);
      
      if (categoryIds.length > 0) {
        const { data: itemsData, error: itemsError } = await supabase
          .from("menu_items")
          .select("id, name, price, category_id, is_offer")
          .in("category_id", categoryIds)
          .eq("is_available", true)
          .order("name", { ascending: true });

        if (itemsError) {
          setError(t.itemsError);
          setLoading(false);
          return;
        }

        setItems(itemsData || []);
      } else {
        setItems([]);
      }

      setLoading(false);
    }

    load();
  }, [restaurantId]);

  /* =======================
     Group Items
  ======================= */
  const categoriesWithItems = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id),
    }));
  }, [categories, items]);

  /* =======================
     Cart Functions
  ======================= */
  const addToCart = () => {
    if (!selectedItem) return;

    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === selectedItem.id && i.notes === itemNotes);
      if (existing) {
        return prev.map((i) =>
          i.item_id === selectedItem.id && i.notes === itemNotes
            ? { ...i, quantity: i.quantity + itemQuantity }
            : i
        );
      }
      return [
        ...prev,
        {
          item_id: selectedItem.id,
          name: selectedItem.name,
          price: selectedItem.price,
          quantity: itemQuantity,
          notes: itemNotes,
        },
      ];
    });

    // Reset and close
    setSelectedItem(null);
    setItemQuantity(1);
    setItemNotes("");
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  /* =======================
     Order Submission
  ======================= */
  const handleConfirmOrder = async () => {
    if (cart.length === 0 || !restaurantId) return;

    setOrderLoading(true);

    try {
      // Get restaurant settings for phone number
      const { data: settings } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .maybeSingle();

      // Generate WhatsApp message
      const itemsList = cart
        .map((item) => `• ${item.name} x${item.quantity}${item.notes ? ` (${item.notes})` : ""}`)
        .join("\n");

      const message = encodeURIComponent(
        `🍽️ *${restaurant?.name || "Order"}*\n` +
        `📍 ${t.table}: ${tableCode}\n\n` +
        `${itemsList}\n\n` +
        `💰 ${t.total}: ${cartTotal.toFixed(2)} JOD`
      );

      // Clear cart and show success
      setCart([]);
      setShowConfirm(false);
      setOrderSuccess(true);

      // Check if we have a phone number (future: add to restaurant_settings)
      // For now, use a generic WhatsApp link
      const whatsappUrl = `https://wa.me/?text=${message}`;
      window.open(whatsappUrl, "_blank");

      // Auto-hide success after 3 seconds
      setTimeout(() => {
        setOrderSuccess(false);
      }, 3000);

    } catch (err) {
      console.error("Order error:", err);
      setError(t.orderError);
    } finally {
      setOrderLoading(false);
    }
  };

  /* =======================
     UI States
  ======================= */
  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center">
        <Card className="p-6">
          <h2 className="font-bold text-lg mb-2">{t.loadError}</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  /* =======================
     Success UI
  ======================= */
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold">{restaurant?.name ?? "Restaurant"}</h1>
            <p className="text-sm text-muted-foreground">{t.table}: {tableCode}</p>
          </div>
          
          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="flex items-center gap-1"
          >
            <Globe className="h-4 w-4" />
            <span>{lang === "ar" ? "EN" : "عربي"}</span>
          </Button>
        </div>

        {/* Success Message */}
        {orderSuccess && (
          <div className="mb-4 p-4 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-lg flex items-center gap-2">
            <Check className="h-5 w-5" />
            <span>{t.orderSent}</span>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-2">
          {categoriesWithItems.map((category) => {
            const isOpen = openCategoryId === category.id;

            return (
              <div key={category.id} className="border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                  className="w-full flex justify-between items-center p-4 font-semibold bg-muted/50 hover:bg-muted transition-colors"
                >
                  <span>{category.name}</span>
                  <span className="text-sm">{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="p-4">
                    {category.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.noItems}</p>
                    ) : (
                      <div className="space-y-3">
                        {category.items.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setSelectedItem(item);
                              setItemQuantity(1);
                              setItemNotes("");
                            }}
                            className="w-full flex justify-between items-center p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                          >
                            <div>
                              <p className="font-medium">
                                {item.name} {item.is_offer && <span className="ml-1 text-xs">🔥</span>}
                              </p>
                            </div>
                            <div className="text-sm font-semibold">{item.price.toFixed(2)} JOD</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Item Selection Bottom Sheet */}
      <Sheet open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>{selectedItem?.name}</SheetTitle>
            <SheetDescription>{selectedItem?.price.toFixed(2)} JOD</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Quantity Selector */}
            <div className="flex items-center justify-between">
              <span className="font-medium">{t.quantity}</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemQuantity(Math.max(1, itemQuantity - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center font-semibold">{itemQuantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setItemQuantity(itemQuantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-2">{t.notes}</label>
              <Textarea
                placeholder={t.notesPlaceholder}
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                rows={2}
              />
            </div>

            {/* Add Button */}
            <Button className="w-full" onClick={addToCart}>
              {t.add} ({((selectedItem?.price || 0) * itemQuantity).toFixed(2)} JOD)
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Order Confirmation Bottom Sheet */}
      <Sheet open={showConfirm} onOpenChange={setShowConfirm}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[80vh] overflow-auto">
          <SheetHeader>
            <SheetTitle>{t.orderSummary}</SheetTitle>
            <SheetDescription>{t.table}: {tableCode}</SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">{item.name} x{item.quantity}</p>
                  {item.notes && (
                    <p className="text-sm text-muted-foreground">{item.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} JOD</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCart(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    ✕
                  </Button>
                </div>
              </div>
            ))}

            <div className="border-t pt-3 flex justify-between items-center font-bold text-lg">
              <span>{t.total}</span>
              <span>{cartTotal.toFixed(2)} JOD</span>
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleConfirmOrder}
              disabled={orderLoading}
            >
              <Send className="h-4 w-4" />
              {t.sendToWhatsApp}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Fixed Bottom Cart Button */}
      {cart.length > 0 && !showConfirm && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t">
          <div className="max-w-3xl mx-auto">
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => setShowConfirm(true)}
            >
              <ShoppingCart className="h-5 w-5" />
              {t.confirmOrder} ({cart.length}) - {cartTotal.toFixed(2)} JOD
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
