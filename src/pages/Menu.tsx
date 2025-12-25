import { useParams } from "react-router-dom";
import { useState } from "react";

/* =====================
   Types (Local only)
===================== */
type MenuItem = {
  id: string;
  name: string;
  price: number;
};

type Category = {
  id: string;
  name: string;
  items: MenuItem[];
};

type OrderItem = MenuItem & {
  qty: number;
};

type OrderStatus = "draft" | "pending";

/* =====================
   MOCK DATA (واضح ومؤقت)
   سيتم استبداله لاحقًا
===================== */
const RESTAURANT_NAME = "Kastana Café";

const CATEGORIES: Category[] = [
  {
    id: "offers",
    name: "🔥 العروض",
    items: [{ id: "o1", name: "فطور عربي", price: 3.5 }],
  },
  {
    id: "hot-coffee",
    name: "☕ قهوة ساخنة",
    items: [
      { id: "h1", name: "قهوة تركية", price: 1.0 },
      { id: "h2", name: "كابتشينو", price: 2.5 },
    ],
  },
  {
    id: "cold-coffee",
    name: "🧊 قهوة باردة",
    items: [{ id: "c1", name: "آيس لاتيه", price: 3.0 }],
  },
];

export default function Menu() {
  const { tableCode } = useParams<{ tableCode: string }>();

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OrderStatus>("draft");

  /* =====================
     Helpers
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

  const removeItem = (itemId: string) => {
    if (status === "pending") return;

    setOrderItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, qty: i.qty - 1 } : i)).filter((i) => i.qty > 0));
  };

  const total = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  const submitOrder = () => {
    if (orderItems.length === 0) return;
    setStatus("pending");
  };

  /* =====================
     UI
  ===================== */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-bold">{RESTAURANT_NAME}</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      {/* Pending */}
      {status === "pending" && (
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <h2 className="text-2xl font-bold mb-4">الطلب قيد الانتظار</h2>
            <p className="text-muted-foreground mb-6">بانتظار تأكيد الكاشيير</p>

            <div className="border rounded-lg p-4 bg-card text-left">
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
            </div>
          </div>
        </main>
      )}

      {/* Menu */}
      {status === "draft" && (
        <>
          <main className="flex-1 p-4 space-y-6">
            {CATEGORIES.map((cat) => (
              <section key={cat.id}>
                <h2 className="text-lg font-bold mb-3">{cat.name}</h2>

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
                          <button onClick={() => removeItem(item.id)} className="px-3 py-1 border rounded">
                            −
                          </button>
                          <span>{inOrder?.qty ?? 0}</span>
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
