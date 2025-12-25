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

  /* =====================
     State
  ===================== */
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

      // 1️⃣ Restaurant
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("id, name, logo_url")
        .eq("id", restaurantId)
        .single();

      // 2️⃣ Categories
      const { data: categoriesData } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true });

      // 3️⃣ Items
      const { data: itemsData } = await supabase
        .from("menu_items")
        .select("id, name, price, category_id")
        .eq("restaurant_id", restaurantId)
        .order("name");

      if (restaurantData && categoriesData && itemsData) {
        const mappedCategories: Category[] = categoriesData.map((cat) => ({
          ...cat,
          items: itemsData
            .filter((i) => i.category_id === cat.id)
            .map((i) => ({
              id: i.id,
              name: i.name,
              price: i.price,
            })),
        }));

        setRestaurant(restaurantData);
        setCategories(mappedCategories);
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
    if (orderItems.length === 0) return;
    setStatus("pending");
  };

  /* =====================
     UI
  ===================== */
  if (loading) {
    return <div className="p-6 text-center">جاري تحميل القائمة...</div>;
  }

  if (!restaurant) {
    return <div className="p-6 text-center">المطعم غير موجود</div>;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <div className="flex items-center gap-3">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt={restaurant.name} className="h-10 w-10 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-xl font-bold">{restaurant.name}</h1>
            <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
          </div>
        </div>
      </header>

      {/* Pending */}
      {status === "pending" && (
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-4">الطلب قيد الانتظار</h2>
            <p className="text-muted-foreground">بانتظار تأكيد الكاشيير</p>
          </div>
        </main>
      )}

      {/* Menu */}
      {status === "draft" && (
        <>
          <main className="flex-1 p-4 space-y-6">
            {categories.map((cat) => (
              <section key={cat.id}>
                <h2 className="text-lg font-bold mb-2">{cat.name}</h2>
                <div className="space-y-2">
                  {cat.items.map((item) => {
                    const inOrder = orderItems.find((i) => i.id === item.id);
                    return (
                      <div key={item.id} className="flex justify-between items-center border rounded-lg p-3 bg-card">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-muted-foreground">{item.price.toFixed(2)} د.أ</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeItem(item.id)}>−</button>
                          <span>{inOrder?.qty ?? 0}</span>
                          <button onClick={() => addItem(item)}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات على الطلب (اختياري)"
              className="w-full border rounded-lg p-3"
            />
          </main>

          <footer className="border-t bg-card p-4">
            <div className="flex justify-between mb-2">
              <span>الإجمالي</span>
              <span className="font-bold">{total.toFixed(2)} د.أ</span>
            </div>
            <button onClick={submitOrder} className="w-full py-3 rounded-lg bg-primary text-primary-foreground">
              تثبيت الطلب
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
