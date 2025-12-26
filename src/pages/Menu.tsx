import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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

export default function Menu() {
  const { restaurantId, tableCode } = useParams<{
    restaurantId: string;
    tableCode: string;
  }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  // SEO بسيط
  useEffect(() => {
    document.title = "Menu";

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = "Restaurant menu";

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, []);

  // جلب البيانات
  useEffect(() => {
    async function loadMenu() {
      setLoading(true);
      setError(null);

      if (!restaurantId) {
        setError("Restaurant غير صالح");
        setLoading(false);
        return;
      }

      // 1️⃣ Categories
      const catResult = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (catResult.error) {
        setError("فشل تحميل التصنيفات");
        setLoading(false);
        return;
      }

      const catRows = catResult.data as Category[];
      const categoryIds = catRows.map((c) => c.id);

      if (categoryIds.length === 0) {
        setCategories([]);
        setItems([]);
        setLoading(false);
        return;
      }

      // 2️⃣ Items (filter by category_id since menu_items doesn't have restaurant_id)
      const itemResult = await supabase
        .from("menu_items")
        .select("id, name, price, category_id, is_offer")
        .in("category_id", categoryIds)
        .eq("is_available", true)
        .order("name", { ascending: true });

      if (itemResult.error) {
        setError("فشل تحميل الأصناف");
        setLoading(false);
        return;
      }

      setCategories(catRows);
      setItems(itemResult.data as Item[]);
      setLoading(false);
    }

    loadMenu();
  }, [restaurantId]);

  // ربط الأصناف بالتصنيفات
  const categoriesWithItems = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      items: items.filter((item) => item.category_id === cat.id),
    }));
  }, [categories, items]);

  /* ================= UI ================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl p-4">
          <div className="h-6 w-40 bg-slate-200 rounded mb-4" />
          <div className="h-24 bg-slate-200 rounded mb-4" />
          <div className="h-24 bg-slate-200 rounded" />
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <section className="mx-auto max-w-3xl p-4 text-center">
          <div className="border rounded p-6">
            <h2 className="font-bold mb-2">تعذر فتح القائمة</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto w-full max-w-3xl p-4">
          <h1 className="text-lg font-semibold">Menu</h1>
          <p className="text-sm text-muted-foreground">Table: {tableCode}</p>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl p-4 space-y-4">
        {categoriesWithItems.map((category) => (
          <div key={category.id} className="border rounded p-4">
            <h2 className="font-semibold mb-3">{category.name}</h2>

            {category.items.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا يوجد أصناف</p>
            ) : (
              <div className="space-y-3">
                {category.items.map((item: Item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {item.name}
                      {item.is_offer && <span className="ml-1 text-xs">🔥</span>}
                    </div>
                    <div className="text-sm font-semibold">{Number(item.price).toFixed(2)} JOD</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </main>
  );
}
