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
import { 
  Minus, Plus, ShoppingCart, Check, Globe, Send,
  Coffee, Pizza, Sandwich, Salad, Soup, Cake, IceCreamCone,
  Beer, Wine, GlassWater, UtensilsCrossed, Beef, Fish,
  Egg, Cookie, Croissant, Apple, Flame, ChefHat, Tag,
  CupSoda, Milk, Citrus, Cherry, Drumstick, Wheat, Leaf,
  Dessert, Popcorn, Ham, Carrot, Star, Package, CakeSlice
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
   Category Icon Mapping
======================= */
type CategoryIconInfo = {
  icon: LucideIcon;
  color: string;
  bgColor: string;
};

const getCategoryIcon = (categoryName: string): CategoryIconInfo => {
  const name = categoryName.toLowerCase();
  
  // ☕ Hot Drinks
  if (name.includes("coffee") || name.includes("قهوة") || name.includes("كافي")) 
    return { icon: Coffee, color: "text-amber-700", bgColor: "bg-amber-100" };
  if (name.includes("tea") || name.includes("شاي")) 
    return { icon: Leaf, color: "text-green-600", bgColor: "bg-green-100" };
  if (name.includes("hot") || name.includes("ساخن")) 
    return { icon: Coffee, color: "text-orange-600", bgColor: "bg-orange-100" };
  
  // 🥤 Cold Drinks
  if (name.includes("juice") || name.includes("عصير") || name.includes("عصائر")) 
    return { icon: Citrus, color: "text-orange-500", bgColor: "bg-orange-100" };
  if (name.includes("smoothie") || name.includes("سموذي")) 
    return { icon: CupSoda, color: "text-pink-500", bgColor: "bg-pink-100" };
  if (name.includes("milk") || name.includes("حليب") || name.includes("لبن")) 
    return { icon: Milk, color: "text-sky-500", bgColor: "bg-sky-100" };
  if (name.includes("cold") || name.includes("بارد")) 
    return { icon: GlassWater, color: "text-cyan-500", bgColor: "bg-cyan-100" };
  if (name.includes("drink") || name.includes("مشروب") || name.includes("شراب")) 
    return { icon: CupSoda, color: "text-purple-500", bgColor: "bg-purple-100" };
  
  // 🍺 Alcoholic
  if (name.includes("beer") || name.includes("بيرة")) 
    return { icon: Beer, color: "text-amber-500", bgColor: "bg-amber-100" };
  if (name.includes("wine") || name.includes("نبيذ")) 
    return { icon: Wine, color: "text-rose-600", bgColor: "bg-rose-100" };
  
  // 🍕 Fast Food
  if (name.includes("pizza") || name.includes("بيتزا")) 
    return { icon: Pizza, color: "text-red-500", bgColor: "bg-red-100" };
  if (name.includes("burger") || name.includes("برجر")) 
    return { icon: Sandwich, color: "text-yellow-600", bgColor: "bg-yellow-100" };
  if (name.includes("sandwich") || name.includes("ساندويش")) 
    return { icon: Ham, color: "text-rose-500", bgColor: "bg-rose-100" };
  if (name.includes("fries") || name.includes("بطاطس")) 
    return { icon: Popcorn, color: "text-yellow-500", bgColor: "bg-yellow-100" };
  
  // 🥗 Healthy
  if (name.includes("salad") || name.includes("سلطة") || name.includes("سلطات")) 
    return { icon: Salad, color: "text-emerald-500", bgColor: "bg-emerald-100" };
  if (name.includes("soup") || name.includes("شوربة") || name.includes("حساء")) 
    return { icon: Soup, color: "text-orange-400", bgColor: "bg-orange-100" };
  if (name.includes("vegan") || name.includes("نباتي")) 
    return { icon: Leaf, color: "text-green-500", bgColor: "bg-green-100" };
  if (name.includes("healthy") || name.includes("صحي")) 
    return { icon: Carrot, color: "text-orange-500", bgColor: "bg-orange-100" };
  
  // 🥩 Meat & Protein
  if (name.includes("grill") || name.includes("مشاوي") || name.includes("مشوي")) 
    return { icon: Flame, color: "text-red-600", bgColor: "bg-red-100" };
  if (name.includes("meat") || name.includes("لحم") || name.includes("لحوم") || name.includes("steak")) 
    return { icon: Beef, color: "text-red-700", bgColor: "bg-red-100" };
  if (name.includes("chicken") || name.includes("دجاج")) 
    return { icon: Drumstick, color: "text-amber-600", bgColor: "bg-amber-100" };
  if (name.includes("fish") || name.includes("سمك") || name.includes("seafood") || name.includes("بحري")) 
    return { icon: Fish, color: "text-blue-500", bgColor: "bg-blue-100" };
  
  // 🍳 Breakfast & Bakery
  if (name.includes("breakfast") || name.includes("فطور") || name.includes("إفطار")) 
    return { icon: Egg, color: "text-yellow-500", bgColor: "bg-yellow-100" };
  if (name.includes("bakery") || name.includes("مخبوزات") || name.includes("مخبز")) 
    return { icon: CakeSlice, color: "text-amber-600", bgColor: "bg-amber-100" };
  if (name.includes("bread") || name.includes("خبز")) 
    return { icon: Wheat, color: "text-amber-500", bgColor: "bg-amber-100" };
  
  // 🍰 Desserts & Sweets
  if (name.includes("dessert") || name.includes("حلى") || name.includes("حلويات") || name.includes("sweet")) 
    return { icon: Dessert, color: "text-pink-500", bgColor: "bg-pink-100" };
  if (name.includes("ice") || name.includes("آيس") || name.includes("مثلج") || name.includes("gelato")) 
    return { icon: IceCreamCone, color: "text-pink-400", bgColor: "bg-pink-100" };
  if (name.includes("cake") || name.includes("كيك") || name.includes("تورت")) 
    return { icon: Cake, color: "text-rose-500", bgColor: "bg-rose-100" };
  if (name.includes("pastry") || name.includes("معجنات") || name.includes("فطائر")) 
    return { icon: Croissant, color: "text-amber-500", bgColor: "bg-amber-100" };
  if (name.includes("cookie") || name.includes("بسكويت")) 
    return { icon: Cookie, color: "text-yellow-700", bgColor: "bg-yellow-100" };
  
  // 🍎 Appetizers & Sides
  if (name.includes("appetizer") || name.includes("مقبلات") || name.includes("starter")) 
    return { icon: Cherry, color: "text-red-500", bgColor: "bg-red-100" };
  if (name.includes("extra") || name.includes("إضافات") || name.includes("اضافات") || name.includes("additions")) 
    return { icon: Package, color: "text-violet-500", bgColor: "bg-violet-100" };
  if (name.includes("side") || name.includes("جانبي")) 
    return { icon: Apple, color: "text-green-500", bgColor: "bg-green-100" };
  if (name.includes("snack") || name.includes("سناك")) 
    return { icon: Popcorn, color: "text-yellow-500", bgColor: "bg-yellow-100" };
  
  // ⭐ Main & Special
  if (name.includes("main") || name.includes("رئيسي") || name.includes("أطباق")) 
    return { icon: ChefHat, color: "text-slate-700", bgColor: "bg-slate-100" };
  if (name.includes("special") || name.includes("خاص") || name.includes("مميز")) 
    return { icon: Star, color: "text-yellow-500", bgColor: "bg-yellow-100" };
  if (name.includes("offer") || name.includes("عرض") || name.includes("deal")) 
    return { icon: Tag, color: "text-emerald-500", bgColor: "bg-emerald-100" };
  
  // Default
  return { icon: UtensilsCrossed, color: "text-gray-600", bgColor: "bg-gray-100" };
};

/* =======================
   Translations
======================= */
const translations = {
  ar: {
    menu: "القائمة",
    table: "الطاولة",
    add: "أضف",
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
    invalidRestaurant: "معرف المطعم غير صالح",
    categoriesError: "فشل تحميل التصنيفات",
    itemsError: "فشل تحميل الأصناف",
    close: "إغلاق",
    currency: "د.أ",
    items: "أصناف",
    remove: "إزالة",
  },
  en: {
    menu: "Menu",
    table: "Table",
    add: "Add",
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
    currency: "JOD",
    items: "items",
    remove: "Remove",
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

  // Cart state (local only) - now tracks quantities per item
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
  const getItemQuantity = (itemId: string) => {
    const cartItem = cart.find((i) => i.item_id === itemId);
    return cartItem?.quantity || 0;
  };

  const incrementItem = (item: Item) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          notes: "",
        },
      ];
    });
  };

  const decrementItem = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item_id === itemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((i) => i.item_id !== itemId);
      }
      return prev.map((i) =>
        i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i
      );
    });
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
        `💰 ${t.total}: ${cartTotal.toFixed(2)} ${t.currency}`
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
    <div className="min-h-screen bg-background pb-24" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6 flex justify-between items-start">
          <div className="flex items-center gap-3">
            {restaurant?.logo_url && (
              <img 
                src={restaurant.logo_url} 
                alt={`${restaurant.name || 'Restaurant'} logo`}
                className="w-12 h-12 object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{restaurant?.name ?? "Restaurant"}</h1>
              <p className="text-sm text-muted-foreground">{t.table}: {tableCode}</p>
            </div>
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
        <div className="space-y-3">
          {categoriesWithItems.map((category) => {
            const isOpen = openCategoryId === category.id;
            const iconInfo = getCategoryIcon(category.name);
            const IconComponent = iconInfo.icon;

            return (
              <div key={category.id} className="border rounded-xl overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setOpenCategoryId(isOpen ? null : category.id)}
                  className="w-full flex justify-between items-center p-4 font-semibold bg-gradient-to-r from-muted/80 to-muted/40 hover:from-muted hover:to-muted/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${iconInfo.bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${iconInfo.color}`} />
                    </div>
                    <span>{category.name}</span>
                  </div>
                  <span className="text-lg">{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <div className="p-4">
                    {category.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.noItems}</p>
                    ) : (
                      <div className="space-y-3">
                        {category.items.map((item) => {
                          const qty = getItemQuantity(item.id);
                          return (
                            <div
                              key={item.id}
                              className="flex justify-between items-center p-2 rounded-lg bg-muted/30"
                            >
                              <div className="flex-1">
                                <p className="font-medium">
                                  {item.name} {item.is_offer && <span className="ml-1 text-xs">🔥</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} {t.currency}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {qty > 0 ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => decrementItem(item.id)}
                                    >
                                      <Minus className="h-4 w-4" />
                                    </Button>
                                    <span className="w-6 text-center font-semibold">{qty}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => incrementItem(item)}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => incrementItem(item)}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    {t.add}
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>


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
                  <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} {t.currency}</span>
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
              <span>{cartTotal.toFixed(2)} {t.currency}</span>
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
              {t.confirmOrder} ({cart.length}) - {cartTotal.toFixed(2)} {t.currency}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
