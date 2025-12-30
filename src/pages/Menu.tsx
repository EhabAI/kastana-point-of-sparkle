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
  Tag,
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
    return { icon: Flame, color: "text-orange-500", bgColor: "bg-orange-100" };

  // Default
  return { icon: UtensilsCrossed, color: "text-gray-600", bgColor: "bg-gray-100" };
};

/* =======================
   Category Name Translations
======================= */
const categoryTranslations: Record<string, { en: string; ar: string }> = {
  // Your specific categories
  bakery: { en: "Bakery", ar: "مخبوزات" },
  "cold coffee": { en: "Cold Coffee", ar: "قهوة باردة" },
  desserts: { en: "Desserts", ar: "حلويات" },
  extras: { en: "Extras", ar: "إضافات" },
  "hot drinks": { en: "Hot Drinks", ar: "مشروبات ساخنة" },
  "signature drinks": { en: "Signature Drinks", ar: "مشروبات مميزة" },
  tea: { en: "Tea", ar: "شاي" },
  العروض: { en: "Offers", ar: "العروض" },

  // Hot Drinks
  coffee: { en: "Coffee", ar: "قهوة" },
  قهوة: { en: "Coffee", ar: "قهوة" },
  شاي: { en: "Tea", ar: "شاي" },
  "مشروبات ساخنة": { en: "Hot Drinks", ar: "مشروبات ساخنة" },
  "hot coffee": { en: "Hot Coffee", ar: "قهوة ساخنة" },
  "قهوة ساخنة": { en: "Hot Coffee", ar: "قهوة ساخنة" },
  "قهوة باردة": { en: "Cold Coffee", ar: "قهوة باردة" },
  "مشروبات مميزة": { en: "Signature Drinks", ar: "مشروبات مميزة" },

  // Cold Drinks
  "cold drinks": { en: "Cold Drinks", ar: "مشروبات باردة" },
  "مشروبات باردة": { en: "Cold Drinks", ar: "مشروبات باردة" },
  juice: { en: "Juice", ar: "عصائر" },
  juices: { en: "Juices", ar: "عصائر" },
  عصائر: { en: "Juices", ar: "عصائر" },
  smoothies: { en: "Smoothies", ar: "سموذي" },
  سموذي: { en: "Smoothies", ar: "سموذي" },
  drinks: { en: "Drinks", ar: "مشروبات" },
  مشروبات: { en: "Drinks", ar: "مشروبات" },
  milkshakes: { en: "Milkshakes", ar: "ميلك شيك" },
  "ميلك شيك": { en: "Milkshakes", ar: "ميلك شيك" },
  mojitos: { en: "Mojitos", ar: "موهيتو" },
  موهيتو: { en: "Mojitos", ar: "موهيتو" },
  "fresh juice": { en: "Fresh Juice", ar: "عصير طازج" },
  "عصير طازج": { en: "Fresh Juice", ar: "عصير طازج" },

  // Food Categories
  pizza: { en: "Pizza", ar: "بيتزا" },
  بيتزا: { en: "Pizza", ar: "بيتزا" },
  burgers: { en: "Burgers", ar: "برجر" },
  burger: { en: "Burger", ar: "برجر" },
  برجر: { en: "Burgers", ar: "برجر" },
  sandwiches: { en: "Sandwiches", ar: "ساندويشات" },
  sandwich: { en: "Sandwich", ar: "ساندويش" },
  ساندويشات: { en: "Sandwiches", ar: "ساندويشات" },
  ساندويش: { en: "Sandwich", ar: "ساندويش" },
  wraps: { en: "Wraps", ar: "راب" },
  راب: { en: "Wraps", ar: "راب" },
  pasta: { en: "Pasta", ar: "باستا" },
  باستا: { en: "Pasta", ar: "باستا" },

  // Salads & Healthy
  salads: { en: "Salads", ar: "سلطات" },
  salad: { en: "Salad", ar: "سلطة" },
  سلطات: { en: "Salads", ar: "سلطات" },
  سلطة: { en: "Salad", ar: "سلطة" },
  soup: { en: "Soup", ar: "شوربة" },
  soups: { en: "Soups", ar: "شوربات" },
  شوربة: { en: "Soup", ar: "شوربة" },
  شوربات: { en: "Soups", ar: "شوربات" },

  // Meat & Protein
  grill: { en: "Grill", ar: "مشاوي" },
  grills: { en: "Grills", ar: "مشاوي" },
  مشاوي: { en: "Grills", ar: "مشاوي" },
  meat: { en: "Meat", ar: "لحوم" },
  لحوم: { en: "Meat", ar: "لحوم" },
  chicken: { en: "Chicken", ar: "دجاج" },
  دجاج: { en: "Chicken", ar: "دجاج" },
  fish: { en: "Fish", ar: "أسماك" },
  seafood: { en: "Seafood", ar: "مأكولات بحرية" },
  أسماك: { en: "Fish", ar: "أسماك" },
  "مأكولات بحرية": { en: "Seafood", ar: "مأكولات بحرية" },

  // Breakfast & Bakery
  breakfast: { en: "Breakfast", ar: "فطور" },
  فطور: { en: "Breakfast", ar: "فطور" },
  مخبوزات: { en: "Bakery", ar: "مخبوزات" },
  bread: { en: "Bread", ar: "خبز" },
  خبز: { en: "Bread", ar: "خبز" },
  croissants: { en: "Croissants", ar: "كرواسون" },
  كرواسون: { en: "Croissants", ar: "كرواسون" },

  // Desserts
  dessert: { en: "Dessert", ar: "حلى" },
  حلويات: { en: "Desserts", ar: "حلويات" },
  حلى: { en: "Dessert", ar: "حلى" },
  sweets: { en: "Sweets", ar: "حلويات" },
  "ice cream": { en: "Ice Cream", ar: "آيس كريم" },
  "آيس كريم": { en: "Ice Cream", ar: "آيس كريم" },
  cake: { en: "Cake", ar: "كيك" },
  cakes: { en: "Cakes", ar: "كيك" },
  كيك: { en: "Cakes", ar: "كيك" },
  pastries: { en: "Pastries", ar: "معجنات" },
  pastry: { en: "Pastry", ar: "معجنات" },
  معجنات: { en: "Pastries", ar: "معجنات" },
  waffles: { en: "Waffles", ar: "وافل" },
  وافل: { en: "Waffles", ar: "وافل" },
  pancakes: { en: "Pancakes", ar: "بان كيك" },
  "بان كيك": { en: "Pancakes", ar: "بان كيك" },
  crepes: { en: "Crepes", ar: "كريب" },
  كريب: { en: "Crepes", ar: "كريب" },

  // Appetizers & Sides
  appetizers: { en: "Appetizers", ar: "مقبلات" },
  مقبلات: { en: "Appetizers", ar: "مقبلات" },
  starters: { en: "Starters", ar: "مقبلات" },
  sides: { en: "Sides", ar: "أطباق جانبية" },
  "أطباق جانبية": { en: "Sides", ar: "أطباق جانبية" },
  extra: { en: "Extra", ar: "إضافات" },
  إضافات: { en: "Extras", ar: "إضافات" },
  snacks: { en: "Snacks", ar: "سناكات" },
  سناكات: { en: "Snacks", ar: "سناكات" },
  additions: { en: "Additions", ar: "إضافات" },

  // Main & Special
  "main dishes": { en: "Main Dishes", ar: "أطباق رئيسية" },
  "main course": { en: "Main Course", ar: "الطبق الرئيسي" },
  "أطباق رئيسية": { en: "Main Dishes", ar: "أطباق رئيسية" },
  specials: { en: "Specials", ar: "عروض خاصة" },
  special: { en: "Special", ar: "خاص" },
  "عروض خاصة": { en: "Specials", ar: "عروض خاصة" },
  offers: { en: "Offers", ar: "عروض" },
  عروض: { en: "Offers", ar: "عروض" },
};

const translateCategoryName = (name: string, lang: Language): string => {
  const lowerName = name.toLowerCase().trim();
  const translation = categoryTranslations[lowerName];
  if (translation) {
    return translation[lang];
  }
  return name;
};

/* =======================
   Menu Item Translations
======================= */
const itemTranslations: Record<string, { en: string; ar: string }> = {
  // Coffee Items
  "americano breakfast": { en: "Americano Breakfast", ar: "فطور أمريكانو" },
  "arabic coffee": { en: "Arabic Coffee", ar: "قهوة عربية" },
  "cold brew": { en: "Cold Brew", ar: "كولد برو" },
  "flat white": { en: "Flat White", ar: "فلات وايت" },
  frappuccino: { en: "Frappuccino", ar: "فرابتشينو" },
  "iced americano": { en: "Iced Americano", ar: "أمريكانو مثلج" },
  "pistachio latte": { en: "Pistachio Latte", ar: "لاتيه فستق" },
  "saffron latte": { en: "Saffron Latte", ar: "لاتيه زعفران" },
  "spanish latte": { en: "Spanish Latte", ar: "لاتيه إسباني" },
  "turkish coffee": { en: "Turkish Coffee", ar: "قهوة تركية" },
  "white mocha": { en: "White Mocha", ar: "وايت موكا" },

  // Tea Items
  "black tea": { en: "Black Tea", ar: "شاي أسود" },
  "karak tea": { en: "Karak Tea", ar: "شاي كرك" },
  "masala tea": { en: "Masala Tea", ar: "شاي ماسالا" },

  // Desserts
  cheesecake: { en: "Cheesecake", ar: "تشيز كيك" },
  "chocolate muffin": { en: "Chocolate Muffin", ar: "مافن شوكولاتة" },
  "cinnamon roll": { en: "Cinnamon Roll", ar: "سينابون" },
  "red velvet cake": { en: "Red Velvet Cake", ar: "كيكة ريد فيلفت" },
  tiramisu: { en: "Tiramisu", ar: "تيراميسو" },

  // Bakery
  "croissant plain": { en: "Croissant Plain", ar: "كرواسون سادة" },

  // Extras
  "extra espresso shot": { en: "Extra Espresso Shot", ar: "شوت إسبريسو إضافي" },
  "oat milk": { en: "Oat Milk", ar: "حليب شوفان" },
  "whipped cream": { en: "Whipped Cream", ar: "كريمة مخفوقة" },

  // Combos & Deals
  "breakfast combo": { en: "Breakfast Combo", ar: "كومبو فطور" },
  "coffee & muffin breakfast": { en: "Coffee & Muffin Breakfast", ar: "فطور قهوة ومافن" },
  "morning latte deal": { en: "Morning Latte Deal", ar: "عرض لاتيه الصباح" },

  // Happy Hour
  "happy hour cappuccino": { en: "Happy Hour Cappuccino", ar: "كابتشينو الساعة السعيدة" },
  "happy hour coffee & cookie": { en: "Happy Hour Coffee & Cookie", ar: "قهوة وكوكيز الساعة السعيدة" },
  "happy hour cold brew": { en: "Happy Hour Cold Brew", ar: "كولد برو الساعة السعيدة" },
  "happy hour iced latte": { en: "Happy Hour Iced Latte", ar: "لاتيه مثلج الساعة السعيدة" },
};

const translateItemName = (name: string, lang: Language): string => {
  const lowerName = name.toLowerCase().trim();
  const translation = itemTranslations[lowerName];
  if (translation) {
    return translation[lang];
  }
  return name;
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
    sendToWhatsApp: "تثبيت الطلب",
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
    sendToWhatsApp: "Place Order",
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

  // Order-level notes (not item notes)
  const [orderNotes, setOrderNotes] = useState("");

  // Clear cart when language changes to avoid mixed language items
  useEffect(() => {
    setCart([]);
  }, [lang]);

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
      const { data: restaurantData, error: restaurantError } = await supabase.rpc("get_public_restaurant", {
        p_restaurant_id: restaurantId,
      });

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
        return prev.map((i) => (i.item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          item_id: item.id,
          name: translateItemName(item.name, lang),
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
      return prev.map((i) => (i.item_id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
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

      // Build message with optional order notes
      let messageContent =
        `🍽️ *${restaurant?.name || "Order"}*\n` +
        `📍 ${t.table}: ${tableCode}\n\n` +
        `${itemsList}\n\n` +
        `💰 ${t.total}: ${cartTotal.toFixed(2)} ${t.currency}`;

      // Append order notes if provided
      if (orderNotes.trim()) {
        messageContent += `\n\n📝 ملاحظات الطلب:\n${orderNotes.trim()}`;
      }

      const message = encodeURIComponent(messageContent);

      // Clear cart, order notes, and show success
      setCart([]);
      setOrderNotes("");
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
      <div className="p-6 max-w-3xl mx-auto" dir={lang === "ar" ? "rtl" : "ltr"}>
        <Skeleton className="h-12 w-48 mb-4" />
        <Skeleton className="h-24 w-full mb-4" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center" dir={lang === "ar" ? "rtl" : "ltr"}>
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
                alt={`${restaurant.name || "Restaurant"} logo`}
                className="w-12 h-12 object-contain rounded-lg"
              />
            )}
            <div>
              <h1 className="text-xl font-bold">{restaurant?.name ?? "Restaurant"}</h1>
              <p className="text-sm text-muted-foreground">
                {t.table}: {tableCode}
              </p>
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
                    <span>{translateCategoryName(category.name, lang)}</span>
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
                            <div key={item.id} className="flex justify-between items-center p-2 rounded-lg bg-muted/30">
                              <div className="flex-1">
                                <p className="font-medium">
                                  {translateItemName(item.name, lang)}{" "}
                                  {item.is_offer && <span className={lang === "ar" ? "mr-1" : "ml-1"}>🔥</span>}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {item.price.toFixed(2)} {t.currency}
                                </p>
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
                                  <Button variant="default" size="sm" onClick={() => incrementItem(item)}>
                                    <Plus className={`h-4 w-4 ${lang === "ar" ? "ml-1" : "mr-1"}`} />
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
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[80vh] overflow-auto"
          dir={lang === "ar" ? "rtl" : "ltr"}
        >
          <SheetHeader>
            <SheetTitle>{t.orderSummary}</SheetTitle>
            <SheetDescription>
              {t.table}: {tableCode}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3">
            {cart.map((item, index) => (
              <div key={index} className="flex justify-between items-start p-3 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium">
                    {item.name} x{item.quantity}
                  </p>
                  {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {(item.price * item.quantity).toFixed(2)} {t.currency}
                  </span>
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

            {/* Order-level notes */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{lang === "ar" ? "ملاحظات على الطلب" : "Order Notes"}</label>
              <Textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value.slice(0, 250))}
                placeholder={lang === "ar" ? "مثال: شاي بالنعنع، القهوة سادة" : "E.g., tea with mint, coffee black"}
                className="resize-none"
                rows={2}
                maxLength={250}
              />
              <p className="text-xs text-muted-foreground text-end">{orderNotes.length}/250</p>
            </div>

            <div className="border-t pt-3 flex justify-between items-center font-bold text-lg">
              <span>{t.total}</span>
              <span>
                {cartTotal.toFixed(2)} {t.currency}
              </span>
            </div>

            <Button className="w-full gap-2" onClick={handleConfirmOrder} disabled={orderLoading}>
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
            <Button className="w-full gap-2" size="lg" onClick={() => setShowConfirm(true)}>
              <ShoppingCart className="h-5 w-5" />
              {t.confirmOrder} ({cart.length}) - {cartTotal.toFixed(2)} {t.currency}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
