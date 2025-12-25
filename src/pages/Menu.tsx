import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/* =====================
   Types (LOCAL – UI only)
===================== */
type Restaurant = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  sort_order: number;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category_id: string;
};

type CartItem = {
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function Menu() {
  const params = useParams();
  const restaurantId = (params as any).restaurantId as string;
  const tableCode = (params as any).tableCode as string;

  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* =====================
     Load menu (PUBLIC SAFE)
  ===================== */
  useEffect(() => {
    const loadMenu = async () => {
      if (!restaurantId) return;

      setLoading(true);

      // 1️⃣ Restaurant (via RPC – untyped)
      const { data: restaurantData } = await supabase.rpc("get_restaurant_public_info", {
        p_restaurant_id: restaurantId,
      });

      if (!Array.isArray(restaurantData) || restaurantData.length === 0) {
        setRestaurant(null);
        setLoading(false);
        return;
      }

      setRestaurant({
        id: restaurantData[0].id,
        name: restaurantData[0].name,
      });

      // 2️⃣ Categories
      const { data: cats } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");

      setCategories(cats ?? []);

      const catIds = (cats ?? []).map((c: any) => c.id);

      // 3️⃣ Items
      const { data: its } = catIds.length
        ? await supabase
            .from("menu_items")
            .select("id, name, price, category_id")
            .in("category_id", catIds)
            .order("name")
        : { data: [] };

      setItems(its ?? []);
      setLoading(false);
    };

    loadMenu();
  }, [restaurantId]);

  /* =====================
     Cart helpers
  ===================== */
  const addItem = (item: MenuItem) => {
    setCart((prev) => {
      const found = prev.find((i) => i.menu_item_id === item.id);
      if (found) {
        return prev.map((i) => (i.menu_item_id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          name: item.name,
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
     Submit order (PENDING)
  ===================== */
  const submitOrder = async () => {
    if (!restaurant || cart.length === 0) return;

    setSubmitting(true);

    try {
      // 1️⃣ create order
      const { data: order } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          table_code: tableCode,
          status: "pending",
          notes: null,
        })
        .select("id")
        .single();

      if (!order) throw new Error("order failed");

      // 2️⃣ order items (MATCH SCHEMA)
      const orderItems = cart.map((c) => ({
        order_id: order.id,
        restaurant_id: restaurant.id,
        menu_item_id: c.menu_item_id,
        name: c.name,
        price: c.price,
        quantity: c.quantity,
      }));

      await supabase.from("order_items").insert(orderItems);

      setSubmitted(true);
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  /* =====================
     UI
  ===================== */
  if (loading) return <div className="p-6 text-center">جاري التحميل…</div>;
  if (!restaurant) return <div className="p-6 text-center">المطعم غير موجود</div>;

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

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="border-b p-4">
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      <main className="p-4 space-y-6">
        {categories.map((cat) => (
          <section key={cat.id}>
            <h2 className="font-bold mb-2">{cat.name}</h2>
            {items
              .filter((i) => i.category_id === cat.id)
              .map((item) => {
                const inCart = cart.find((c) => c.menu_item_id === item.id);
                return (
                  <div key={item.id} className="flex justify-between border p-3 mb-2">
                    <span>{item.name}</span>
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
