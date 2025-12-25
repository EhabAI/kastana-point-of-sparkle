import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/* =====================
   Types (Read Only)
===================== */
type Restaurant = {
  id: string;
  name: string;
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
  // ✅ Avoid deep TS inference from typed generics
  const params = useParams();
  const restaurantId = (params as any).restaurantId as string;
  const tableCode = (params as any).tableCode as string;

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
      if (!restaurantId) {
        setRestaurant(null);
        setCategories([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      // ✅ Break Supabase type inference to avoid TS2589
      const { data: restaurantRows } = (await supabase
        .from("restaurants")
        .select("id, name")
        .eq("id", restaurantId)
        .limit(1)) as any;

      const { data: categoriesRows } = (await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .order("sort_order", { ascending: true })) as any;

      const { data: itemsRows } = (await supabase
        .from("menu_items")
        .select("id, name, price, category_id")
        .eq("restaurant_id", restaurantId)
        .order("name", { ascending: true })) as any;

      // Restaurant
      if (Array.isArray(restaurantRows) && restaurantRows.length > 0) {
        setRestaurant({
          id: restaurantRows[0].id,
          name: restaurantRows[0].name,
        });
      } else {
        setRestaurant(null);
      }

      // Categories + Items mapping
      if (Array.isArray(categoriesRows) && Array.isArray(itemsRows)) {
        const mapped: Category[] = categoriesRows.map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          sort_order: cat.sort_order ?? 9999,
          items: itemsRows
            .filter((it: any) => it.category_id === cat.id)
            .map((it: any) => ({
              id: it.id,
              name: it.name,
              price: Number(it.price ?? 0),
              category_id: it.category_id,
            })),
        }));

        setCategories(mapped);
      } else {
        setCategories([]);
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

  const total = useMemo(() => {
    return orderItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  }, [orderItems]);

  const submitOrder = () => {
    if (orderItems.length === 0) return;
    setStatus("pending");
  };

  /* =====================
     Early Returns (must be here)
  ===================== */
  if (loading) {
    return <div className="p-6 text-center">جاري تحميل القائمة...</div>;
  }

  if (!restaurant) {
    return <div className="p-6 text-center">المطعم غير موجود</div>;
  }

  /* =====================
     UI
  ===================== */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-bold">{restaurant.name}</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      {/* Pending */}
      {status === "pending" ? (
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">الطلب قيد الانتظار</h2>
            <p className="text-muted-foreground">بانتظار تأكيد الكاشيير</p>

            {/* Optional summary (UI only) */}
            <div className="mt-6 border rounded-lg p-4 bg-card text-left">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between mb-2">
                  <span>
                    {item.name} × {item.qty}
                  </span>
                  <span>{(item.price * item.qty).toFixed(2)} د.أ</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-bold">
                <span>الإجمالي</span>
                <span>{total.toFixed(2)} د.أ</span>
              </div>
              {notes?.trim() ? (
                <>
                  <hr className="my-2" />
                  <div className="text-sm">
                    <span className="font-semibold">ملاحظات: </span>
                    <span className="text-muted-foreground">{notes}</span>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </main>
      ) : (
        <>
          {/* Menu */}
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
                          <p className="text-sm text-muted-foreground">{Number(item.price).toFixed(2)} د.أ</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button onClick={() => removeItem(item.id)} className="px-3 py-1 border rounded">
                            −
                          </button>
                          <span className="min-w-6 text-center">{inOrder?.qty ?? 0}</span>
                          <button onClick={() => addItem(item)} className="px-3 py-1 border rounded">
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات على الطلب (اختياري)"
              className="w-full border rounded-lg p-3"
            />
          </main>

          {/* Summary */}
          <footer className="border-t bg-card p-4">
            <div className="flex justify-between mb-2">
              <span>الإجمالي</span>
              <span className="font-bold">{total.toFixed(2)} د.أ</span>
            </div>

            <button
              onClick={submitOrder}
              disabled={orderItems.length === 0}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
            >
              تثبيت الطلب
            </button>
          </footer>
        </>
      )}
    </div>
  );
}
