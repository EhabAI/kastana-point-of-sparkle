import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* =======================
   Types (بسيطة وآمنة)
======================= */
type Restaurant = {
  id: string;
  name: string | null;
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

/* =======================
   Helpers
======================= */
function getInitials(name?: string | null) {
  if (!name) return "R";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

/* =======================
   Component
======================= */
export default function Menu() {
  const { restaurantId, tableCode } = useParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<Item[]>([]);

  /* =======================
     Load Data
  ======================= */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      if (!restaurantId) {
        setError("Restaurant غير صالح");
        setLoading(false);
        return;
      }

      /* 1️⃣ Restaurant */
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name")
        .eq("id", restaurantId)
        .single();

      if (restaurantError || !restaurantData) {
        setError("المطعم غير موجود");
        setLoading(false);
        return;
      }

      setRestaurant(restaurantData);

      /* 2️⃣ Categories */
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (categoriesError) {
        setError("فشل تحميل التصنيفات");
        setLoading(false);
        return;
      }

      setCategories(categoriesData || []);

      /* 3️⃣ Items */
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select("id, name, price, category_id, is_offer")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("name", { ascending: true });

      if (itemsError) {
        setError("فشل تحميل الأصناف");
        setLoading(false);
        return;
      }

      setItems(itemsData || []);
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
          <h2 className="font-bold text-lg mb-2">تعذر فتح القائمة</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  /* =======================
     Success UI
  ======================= */
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="mb-4">
            <h1 className="text-xl font-bold">{restaurant?.name ?? "Restaurant"}</h1>
            <p className="text-sm text-muted-foreground">Table: {tableCode}</p>
          </div>

          <div>
            <h1 className="text-lg font-bold">{restaurant?.name ?? "Restaurant"}</h1>
            <p className="text-sm text-muted-foreground">Table: {tableCode}</p>
          </div>
        </div>

        {/* Menu */}
        {categoriesWithItems.map((category) => {
  const isOpen = openCategoryId === category.id;

  return (
    <div key={category.id} className="border rounded">
      <button
        type="button"
        onClick={() =>
          setOpenCategoryId(isOpen ? null : category.id)
        }
        className="w-full flex justify-between items-center p-4 font-semibold"
      >
        <span>{category.name}</span>
        <span className="text-sm">{isOpen ? "−" : "+"}</span>
      </button>


            {isOpen && (
  category.items.length === 0 ? 
              <p className="text-sm text-muted-foreground">لا يوجد أصناف</p>
            ) : (
              <div className="space-y-3">
                {category.items.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">
                        {item.name} {item.is_offer && <span className="ml-1 text-xs">🔥</span>}
                      </p>
                    </div>
                    <div className="text-sm font-semibold">{item.price.toFixed(2)} JOD</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
