import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

// UI (عدّل الاستيرادات حسب مشروعك لو اختلفت)
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type RestaurantPublic = {
  id: string;
  name: string | null;
  logo_url: string | null;
};

type TableWithRestaurant = {
  id: string;
  code: string;
  restaurant_id: string;
  restaurant: RestaurantPublic | null;
};

function isUuid(v?: string) {
  if (!v) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function safeText(v: unknown, fallback = "") {
  return typeof v === "string" && v.trim().length > 0 ? v : fallback;
}

function getInitials(name: string) {
  const clean = (name || "").trim();
  if (!clean) return "R";
  const parts = clean.split(/\s+/).slice(0, 2);
  const letters = parts.map((p) => p[0]?.toUpperCase()).filter(Boolean);
  return letters.join("") || "R";
}

export default function Menu() {
  const params = useParams();
  const restaurantId = params.restaurantId;
  const tableCode = params.tableCode;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [restaurant, setRestaurant] = useState<RestaurantPublic | null>(null);
  const [table, setTable] = useState<{ id: string; code: string; restaurant_id: string } | null>(null);

  const logoInitials = useMemo(() => getInitials(safeText(restaurant?.name, "Restaurant")), [restaurant?.name]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setErrorMsg(null);
      setRestaurant(null);
      setTable(null);

      // 1) Validate params early (تفادي طلبات Supabase غير لازمة)
      if (!isUuid(restaurantId)) {
        setLoading(false);
        setErrorMsg("الرابط غير صالح (Restaurant ID).");
        return;
      }
      if (!tableCode || tableCode.trim().length < 3) {
        setLoading(false);
        setErrorMsg("الرابط غير صالح (Table Code).");
        return;
      }

      // 2) Fetch table + restaurant using OPTION B (restaurant_id + code)
      const { data, error } = await supabase
        .from("tables")
        .select(
          `
          id,
          code,
          restaurant_id,
          restaurant:restaurants (
            id,
            name,
            logo_url
          )
        `,
        )
        .eq("restaurant_id", restaurantId)
        .eq("code", tableCode)
        .eq("is_active", true)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        // أخطاء شائعة: RLS، أو اسم جدول/عمود غلط، أو مشكلة اتصال
        setLoading(false);
        setErrorMsg("تعذر تحميل بيانات الطاولة. تأكد من الصلاحيات (RLS) أو وجود البيانات.");
        return;
      }

      if (!data || !data.restaurant) {
        setLoading(false);
        setErrorMsg("هذا الرابط غير صالح أو الطاولة غير مفعّلة.");
        return;
      }

      const row = data as unknown as TableWithRestaurant;

      setTable({ id: row.id, code: row.code, restaurant_id: row.restaurant_id });
      setRestaurant({
        id: row.restaurant?.id || restaurantId,
        name: row.restaurant?.name ?? "Restaurant",
        logo_url: row.restaurant?.logo_url ?? null,
      });

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, tableCode]);

  // =========================
  // UI STATES
  // =========================
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="mt-2 h-4 w-32" />
            </div>
          </div>

          <Card className="mt-6 p-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
          </Card>

          <Card className="mt-4 p-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="mt-3 h-24 w-full" />
          </Card>
        </div>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-10">
          <Card className="p-6">
            <div className="text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-base font-semibold">
                !
              </div>
              <h1 className="text-lg font-bold">تعذر فتح القائمة</h1>
              <p className="mt-2 text-sm text-muted-foreground">{errorMsg}</p>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
                <Button variant="outline" asChild>
                  <Link to="/">العودة للرئيسية</Link>
                </Button>
              </div>

              <div className="mt-6 text-xs text-muted-foreground">
                إذا هذا الرابط من QR داخل لوحة المالك، تأكد أن الطاولة <b>Active</b> وأن سياسات RLS تسمح بالقراءة للـ
                anon على جدول <b>tables</b>.
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // =========================
  // SUCCESS UI
  // =========================
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full bg-slate-200 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
            {restaurant?.logo_url ? (
              <img
                src={restaurant.logo_url}
                alt={safeText(restaurant.name, "Restaurant")}
                className="h-full w-full object-cover"
                onError={(e) => {
                  // fallback لو الصورة فشلت
                  const target = e.currentTarget;
                  target.style.display = "none";
                }}
              />
            ) : (
              <span className="text-sm font-semibold">{logoInitials}</span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-lg font-bold">{safeText(restaurant?.name, "Restaurant")}</h1>
            <p className="text-sm text-muted-foreground">
              طاولة: <span className="font-medium">{table?.code}</span>
            </p>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mt-6 p-4">
          <h2 className="text-base font-semibold">القائمة</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            سيتم هنا عرض الأصناف حسب التصنيفات. (هذه الصفحة الآن تركّز على إصلاح جلب بيانات المطعم/الطاولة بشكل صحيح
            وآمن)
          </p>
        </Card>

        {/* Placeholder for menu items */}
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">حالة الطلب</h3>
              <p className="text-xs text-muted-foreground">قريبًا: إضافة سلة + تثبيت الطلب + الإرسال للكاشيير</p>
            </div>
            <Button variant="outline" disabled>
              تثبيت الطلب (قريبًا)
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
