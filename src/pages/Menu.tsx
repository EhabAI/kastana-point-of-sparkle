import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import {
  Minus,
  Plus,
  ShoppingCart,
  Check,
  Globe,
  Send,
  Coffee,
  Pizza,
  Sandwich,
  Salad,
  Soup,
  Cake,
  IceCreamCone,
  Beer,
  Wine,
  GlassWater,
  UtensilsCrossed,
  Beef,
  Fish,
  Egg,
  Cookie,
  Croissant,
  Apple,
  Flame,
  ChefHat,
  CupSoda,
  Milk,
  Citrus,
  Cherry,
  Drumstick,
  Wheat,
  Leaf,
  Dessert,
  Popcorn,
  Ham,
  Carrot,
  Star,
  Package,
  CakeSlice,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* =======================
   Types
======================= */
type Restaurant = {
  id: string;
  name: string | null;
  logo_url: string | null;
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
   Icon Mapping (unchanged)
======================= */
type CategoryIconInfo = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

const getCategoryIcon = (categoryName: string): CategoryIconInfo => {
  const name = categoryName.toLowerCase();
  if (name.includes("offer") || name.includes("عرض"))
    return { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-100" };
  return { icon: UtensilsCrossed, color: "text-gray-600", bgColor: "bg-gray-100" };
};

/* =======================
   Translations
======================= */
const translations = {
  ar: {
    table: "الطاولة",
    add: "أضف",
    confirmOrder: "تأكيد الطلب",
    orderSummary: "ملخص الطلب",
    noItems: "لا يوجد أصناف",
    orderSent: "تم إرسال طلبك للكاشير",
    orderError: "حدث خطأ أثناء إرسال الطلب",
    total: "المجموع",
    sendToWhatsApp: "تثبيت الطلب",
    loadError: "تعذر فتح القائمة",
    restaurantNotFound: "المطعم غير موجود",
    invalidRestaurant: "معرف المطعم غير صالح",
    categoriesError: "فشل تحميل التصنيفات",
    itemsError: "فشل تحميل الأصناف",
    currency: "د.أ",
  },
  en: {
    table: "Table",
    add: "Add",
    confirmOrder: "Confirm Order",
    orderSummary: "Order Summary",
    noItems: "No items",
    orderSent: "Your order has been sent to the cashier",
    orderError: "Error sending order",
    total: "Total",
    sendToWhatsApp: "Place Order",
    loadError: "Unable to open menu",
    restaurantNotFound: "Restaurant not found",
    invalidRestaurant: "Invalid restaurant",
    categoriesError: "Failed to load categories",
    itemsError: "Failed to load items",
    currency: "JOD",
  },
};

export default function Menu() {
  const { restaurantId, tableCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<SelectedItem[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [lang, setLang] = useState<Language>("ar");
  const t = translations[lang];

  useEffect(() => {
    async function load() {
      if (!restaurantId) return;
      const { data } = await supabase.rpc("get_public_restaurant", {
        p_restaurant_id: restaurantId,
      });
      setRestaurant(data?.[0] ?? null);

      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id,name,sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order");

      setCategories(cats ?? []);

      const ids = (cats ?? []).map((c) => c.id);
      if (ids.length) {
        const { data: its } = await supabase
          .from("menu_items")
          .select("id,name,price,category_id,is_offer")
          .in("category_id", ids)
          .eq("is_available", true);

        setItems(its ?? []);
      }
      setLoading(false);
    }
    load();
  }, [restaurantId]);

  const categoriesWithItems = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        items: items.filter((i) => i.category_id === c.id),
      })),
    [categories, items],
  );

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + i.price * i.quantity, 0), [cart]);

  /* =======================
     ORDER SUBMIT (FINAL)
  ======================= */
  const handleConfirmOrder = async () => {
    if (!restaurantId || cart.length === 0) return;
    setOrderLoading(true);

    try {
      const subtotal = cartTotal;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurantId,
          status: "pending",
          subtotal,
          total: subtotal,
          order_notes: orderNotes || null,
        })
        .select()
        .single();

      if (orderError || !order) throw orderError;

      const orderItems = cart.map((item) => ({
        order_id: order.id,
        restaurant_id: restaurantId,
        menu_item_id: item.item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes || null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

      if (itemsError) throw itemsError;

      setCart([]);
      setOrderNotes("");
      setShowConfirm(false);
      setOrderSuccess(true);

      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      setError(t.orderError);
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) return <Skeleton className="h-40 w-full" />;

  return (
    <div className="min-h-screen pb-24">
      {orderSuccess && (
        <div className="p-4 bg-green-100 text-green-800 flex gap-2">
          <Check /> {t.orderSent}
        </div>
      )}

      <Sheet open={showConfirm} onOpenChange={setShowConfirm}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>{t.orderSummary}</SheetTitle>
            <SheetDescription>
              {t.table}: {tableCode}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-2">
            <Textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Notes" />

            <div className="flex justify-between font-bold">
              <span>{t.total}</span>
              <span>
                {cartTotal.toFixed(2)} {t.currency}
              </span>
            </div>

            <Button className="w-full" onClick={handleConfirmOrder} disabled={orderLoading}>
              <Send className="h-4 w-4" /> {t.sendToWhatsApp}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button className="w-full" onClick={() => setShowConfirm(true)}>
            <ShoppingCart /> {t.confirmOrder}
          </Button>
        </div>
      )}
    </div>
  );
}
