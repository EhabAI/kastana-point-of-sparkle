import { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* =====================
   Types
===================== */
type MenuItem = {
  id: string;
  name_ar: string;
  name_en: string;
  price: number;
  category_id: string;
};

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
  items: MenuItem[];
};

type Restaurant = {
  id: string;
  name: string;
};

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
};

export default function Menu() {
  const { restaurantId, tableCode } = useParams<{ restaurantId: string; tableCode: string }>();

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* =====================
     Init (PUBLIC SAFE)
  ===================== */
  useEffect(() => {
    const loadMenu = async () => {
      if (!restaurantId || !tableCode) {
        setLoading(false);
        return;
      }

      setLoading(true);

      /* 1️⃣ Restaurant via PUBLIC RPC */
      const { data: restaurantData } = await supabase.rpc("get_restaurant_public_info", {
        p_restaurant_id: restaurantId,
      });

      if (!restaurantData || restaurantData.length === 0) {
        setRestaurant(null);
        setLoading(false);
        return;
      }

      setRestaurant({
        id: restaurantData[0].id,
        name: restaurantData[0].name,
      });

      /* 2️⃣ Categories */
      const { data: categoriesData } = await supabase
        .from("menu_categories")
        .select("id, name_ar, name_en, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order");

      const categoryIds = (categoriesData || []).map((c) => c.id);

      /* 3️⃣ Items */
      const { data: itemsData } = categoryIds.length
        ? await supabase
            .from("menu_items")
            .select("id, name_ar, name_en, price, category_id")
            .in("category_id", categoryIds)
            .eq("is_available", true)
            .order("sort_order")
        : { data: [] };

      const mapped: Category[] = (categoriesData || []).map((cat) => ({
        ...cat,
        items: (itemsData || []).filter((item) => item.category_id === cat.id),
      }));

      setCategories(mapped);
      setLoading(false);
    };

    loadMenu();
  }, [restaurantId, tableCode]);

  /* =====================
     Cart helpers
  ===================== */
  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.menu_item_id === item.id);
      if (existing) {
        return prev.map((i) => (i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name_ar,
          price: item.price,
          quantity: 1,
        },
      ];
    });
  };

  const removeItem = (id: string) => {
    setCart((prev) =>
      prev.map((i) => (i.menu_item_id === id ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0),
    );
  };

  const total = useMemo(() => cart.reduce((sum, i) => sum + i.price * i.quantity, 0), [cart]);

  /* =====================
     Submit Order (PENDING)
  ===================== */
  const submitOrder = async () => {
    if (!restaurant || cart.length === 0) return;

    setSubmitting(true);

    try {
      /* 1️⃣ Create order */
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          table_code: tableCode,
          status: "pending",
          total_amount: total,
        })
        .select("id")
        .single();

      if (error || !order) throw error;

      /* 2️⃣ Order items */
      const orderItems = cart.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.notes ?? null,
      }));

      await supabase.from("order_items").insert(orderItems);

      setSubmitted(true);
    } catch {
      // silent fail (حسب الاتفاق)
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================
     UI states
  ===================== */
  if (loading) {
    return <div className="p-6 text-center">جاري تحميل القائمة...</div>;
  }

  if (!restaurant) {
    return <div className="p-6 text-center">المطعم غير موجود</div>;
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <h2 className="text-2xl font-bold mb-2">الطلب قيد الانتظار</h2>
          <p>سيتم تأكيد الطلب من الكاشيير</p>
          <p className="mt-2 text-sm">طاولة: {tableCode}</p>
        </div>
      </div>
    );
  }

  /* =====================
     Main UI
  ===================== */
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      <main className="p-4 space-y-6 pb-32">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="font-bold mb-2">{cat.name_ar}</h2>
            {cat.items.map((item) => {
              const inCart = cart.find((c) => c.menu_item_id === item.id);
              return (
                <div key={item.id} className="flex justify-between border p-3 mb-2">
                  <span>{item.name_ar}</span>
                  <div className="flex gap-2">
                    <button onClick={() => removeItem(item.id)}>−</button>
                    <span>{inCart?.quantity ?? 0}</span>
                    <button onClick={() => addItem(item)}>+</button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="flex justify-between mb-2">
          <span>الإجمالي</span>
          <span className="font-bold">{total.toFixed(2)} د.أ</span>
        </div>
        <button
          disabled={cart.length === 0 || submitting}
          onClick={submitOrder}
          className="w-full py-3 bg-primary text-primary-foreground rounded"
        >
          {submitting ? "جاري الإرسال..." : "تثبيت الطلب"}
        </button>
      </footer>
    </div>
  );
}
