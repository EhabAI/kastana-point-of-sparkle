const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ErrorCode =
  | "not_authorized"
  | "not_cashier"
  | "order_not_found"
  | "missing_table"
  | "branch_mismatch"
  | "invalid_state"
  | "unexpected";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(code: ErrorCode, message: string, status = 400) {
  return json({ error: { code, message } }, status);
}

interface Body {
  order_id?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader) {
      return errorResponse("not_authorized", "Missing Authorization header.", 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client to validate the caller (JWT)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return errorResponse("not_authorized", "Invalid session. Please sign in again.", 401);
    }
    const callerId = userData.user.id;

    // Service client to bypass RLS for the update (mandatory for production-safe)
    const service = createClient(supabaseUrl, serviceKey);

    // Parse body
    const body: Body = await req.json();
    const orderId = body.order_id?.trim();
    if (!orderId) {
      return errorResponse("unexpected", "Missing order_id.", 400);
    }

    // 1) Confirm caller is a cashier and get branch_id + restaurant_id
    const { data: roleRow, error: roleErr } = await service
      .from("user_roles")
      .select("branch_id, restaurant_id")
      .eq("user_id", callerId)
      .eq("role", "cashier")
      .maybeSingle();

    if (roleErr) {
      console.error("Role lookup error:", roleErr);
      return errorResponse("unexpected", "Failed to verify cashier role.", 500);
    }

    if (!roleRow?.branch_id || !roleRow?.restaurant_id) {
      return errorResponse("not_cashier", "Only cashiers can confirm QR orders.", 403);
    }

    const cashierBranchId = roleRow.branch_id;
    const cashierRestaurantId = roleRow.restaurant_id;

    // 2) Fetch the QR pending order (must have table_id)
    const { data: order, error: orderErr } = await service
      .from("orders")
      .select("id, restaurant_id, branch_id, table_id, status, source")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr) {
      console.error("Order fetch error:", orderErr);
      return errorResponse("unexpected", "Failed to load order.", 500);
    }

    if (!order) {
      return errorResponse("order_not_found", "Order not found.", 404);
    }

    // Hard rules (NO variations)
    if (order.source !== "qr") {
      return errorResponse("invalid_state", "This function only confirms QR orders.", 400);
    }

    if (order.status !== "pending") {
      return errorResponse("invalid_state", "Order is not pending.", 400);
    }

    if (!order.table_id) {
      return errorResponse("missing_table", "QR order must be linked to a table.", 400);
    }

    if (order.restaurant_id !== cashierRestaurantId) {
      return errorResponse("invalid_state", "Order restaurant mismatch.", 403);
    }

    if (order.branch_id !== cashierBranchId) {
      return errorResponse("branch_mismatch", "Order branch does not match cashier branch.", 403);
    }

    // 3) Atomic update: pending -> confirmed (this matches your POS flow)
    const { data: updated, error: updErr } = await service
      .from("orders")
      .update({ status: "confirmed" })
      .eq("id", orderId)
      .eq("source", "qr")
      .eq("status", "pending")
      .select("id, status, order_number")
      .single();

    if (updErr) {
      console.error("Update error:", updErr);
      return errorResponse("unexpected", "Failed to confirm order.", 500);
    }

    return json({ ok: true, order: updated }, 200);
  } catch (e) {
    console.error("confirm-qr-order unexpected:", e);
    return errorResponse("unexpected", "Unexpected error.", 500);
  }
});
