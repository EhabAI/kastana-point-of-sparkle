import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* =====================
   Types (Read Only)
===================== */
type Restaurant = {
  id: string;
  name: string;
  logo_url: string | null;
};

type MenuItem = {
  id: string;
  name: string;
  price: number;
  category_id: string;
};

type Category = {
  id: string;
  name: string;
  sort_order: number;
  items: MenuItem[];
};

type OrderItem = MenuItem & { qty: number };
type OrderStatus = "draft" | "pending";

export default function Menu() {
  const { restaurantId, tableCode } = useParams<{
    restaurantId: string;
    tableCode: string;
  }>();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OrderStatus>("draft");
  const [loading, setLoading] = useState(true);

  /* =====================
     Fetch Data (READ ONLY)
  ===================== */
  useEffect(() => {
    const loadMenu = async () => {
      setLoading(true);

      // Restaurant (no single)
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("id, name, logo_url")
        .eq("id", restaurantId)
        .limit(1);

      // Categories
      const { data: categoriesData } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order");

      // Items
      const { data: itemsData } = await supabase
        .from("menu_items")
        .select("id, name, price, category_id")
        .eq("restaurant_id", restaurantId);

      if (restaurantData?.length && categoriesData?.length && itemsData) {
        setRestaurant(restaurantData[0]);

        const mapped: Category[] = categoriesData.map((cat) => ({
          ...cat,
          items: itemsData.filter((item) => item.category_id === cat.id),
        }));

        setCategories(mapped);
      }

      setLoading(false);
    };

    loadMenu();
  }, [restaurantId]);

  /* =====================
     Order Helpers
  ===================== */
  const addItem = (item: MenuItem) => {
    if (status === "pending") return;
    setOrderItems((prev) => {
      const found = prev.find((i) => i.id === item.id);
      if (found) {
        return prev.map((i) => (i.id === item.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { ...item, qty: 1 }];
    });
  };

  const removeItem = (id: string) => {
    if (status === "pending") return;
    setOrderItems((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0));
  };

  const total = orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);

  const submitOrder = () => {
    if (!orderItems.length) return;
    setStatus("pending");
  };

  /* =====================
     UI
  ===================== */
  if (loading) {
    return <div className="p-6 text-center">جاري تحميل القائمة…</div>;
  }

  if (!restaurant) {
    return <div className="p-6 text-center">المطعم غير موجود</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      {status === "pending" ? (
        <main className="flex-1 flex items-center justify-center">الطلب قيد الانتظار</main>
      ) : (
        <>
          <main className="flex-1 p-4 space-y-6">
            {categories.map((cat) => (
              <section key={cat.id}>
                <h2 className="font-bold mb-2">{cat.name}</h2>
                {cat.items.map((item) => {
                  const inOrder = orderItems.find((i) => i.id === item.id);
                  return (
                    <div key={item.id} className="flex justify-between border p-3 mb-2">
                      <span>{item.name}</span>
                      <div className="flex gap-2">
                        <button onClick={() => removeItem(item.id)}>−</button>
                        <span>{inOrder?.qty ?? 0}</span>
                        <button onClick={() => addItem(item)}>+</button>
                      </div>
                    </div>
                  );
                })}
              </section>
            ))}
          </main>

          <footer className="border-t p-4">
            <div className="flex justify-between mb-2">
              <span>الإجمالي</span>
              <span>{total.toFixed(2)} د.أ</span>
            </div>
            <button onClick={submitOrder} className="w-full bg-primary text-white py-3">
              تثبيت الطلب
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
