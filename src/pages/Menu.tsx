import { useParams } from "react-router-dom";
import { useState } from "react";

/**
 * ================================
 * Types (Local only – no DB)
 * ================================
 */
type MenuItem = {
  id: string;
  name: string;
  price: number;
};

type OrderItem = MenuItem & {
  qty: number;
};

type OrderStatus = "draft" | "pending";

/**
 * ================================
 * Mock Data (PLACEHOLDER)
 * ⚠️ سيتم استبداله لاحقًا بقراءة حقيقية
 * ================================
 */
const MOCK_ITEMS: MenuItem[] = [
  { id: "1", name: "قهوة تركية", price: 1.0 },
  { id: "2", name: "كابتشينو", price: 2.5 },
  { id: "3", name: "لاتيه", price: 2.75 },
];

const Menu = () => {
  /**
   * ================================
   * Route Params
   * ================================
   */
  const { restaurantId, tableCode } = useParams<{
    restaurantId: string;
    tableCode: string;
  }>();

  /**
   * ================================
   * Local State
   * ================================
   */
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<OrderStatus>("draft");

  /**
   * ================================
   * Helpers
   * ================================
   */
  const addItem = (item: MenuItem) => {
    if (status === "pending") return;

    setOrderItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
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

  /**
   * ================================
   * UI
   * ================================
   */
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ================= Header ================= */}
      <header className="border-b bg-card px-4 py-4">
        <h1 className="text-xl font-bold">اسم المطعم</h1>
        <p className="text-sm text-muted-foreground">طاولة: {tableCode}</p>
      </header>

      {/* ================= Pending Screen ================= */}
      {status === "pending" && (
        <main className="flex-1 flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <h2 className="text-2xl font-bold mb-4">الطلب قيد الانتظار</h2>
            <p className="text-muted-foreground mb-6">يرجى الانتظار حتى يقوم الكاشيير بتأكيد الطلب</p>

            <div className="border rounded-lg p-4 text-left bg-card">
              {orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-sm mb-2">
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

      {/* ================= Menu Browsing ================= */}
      {status === "draft" && (
        <>
          <main className="flex-1 p-4 space-y-4">
            {MOCK_ITEMS.map((item) => {
              const inOrder = orderItems.find((i) => i.id === item.id);
              return (
                <div key={item.id} className="flex items-center justify-between border rounded-lg p-3 bg-card">
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

            {/* Notes */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات على الطلب (اختياري)"
              className="w-full border rounded-lg p-3"
            />
          </main>

          {/* ================= Order Summary ================= */}
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
};

export default Menu;
