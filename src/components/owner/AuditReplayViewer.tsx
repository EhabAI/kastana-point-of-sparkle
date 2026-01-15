/**
 * Audit Replay Viewer Component
 * Lightweight training replay showing cashier action sequences
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { startOfDay, endOfDay, format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  Clock, 
  User,
  ShoppingCart,
  CreditCard,
  XCircle,
  RefreshCw,
  Pause,
  DollarSign
} from "lucide-react";

interface AuditReplayViewerProps {
  restaurantId: string;
}

interface AuditEntry {
  id: string;
  action: string;
  entity_type: string;
  created_at: string;
  user_id: string;
  details: Record<string, any> | null;
}

export function AuditReplayViewer({ restaurantId }: AuditReplayViewerProps) {
  const { t, language } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedCashier, setSelectedCashier] = useState<string>("all");
  
  const startDate = startOfDay(new Date(selectedDate)).toISOString();
  const endDate = endOfDay(new Date(selectedDate)).toISOString();
  
  // Get cashiers for filter
  const { data: cashiers } = useQuery({
    queryKey: ["audit-cashiers", restaurantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("user_id, profiles!inner(email)")
        .eq("restaurant_id", restaurantId)
        .eq("role", "cashier")
        .eq("is_active", true);
      
      return data?.map(c => ({
        id: c.user_id,
        email: (c.profiles as any)?.email || "Unknown",
      })) || [];
    },
    enabled: !!restaurantId,
  });
  
  // Get audit logs
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["audit-replay", restaurantId, startDate, selectedCashier],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs")
        .select("id, action, entity_type, created_at, user_id, details")
        .eq("restaurant_id", restaurantId)
        .gte("created_at", startDate)
        .lt("created_at", endDate)
        .order("created_at", { ascending: true })
        .limit(100);
      
      if (selectedCashier !== "all") {
        query = query.eq("user_id", selectedCashier);
      }
      
      const { data } = await query;
      return (data as AuditEntry[]) || [];
    },
    enabled: !!restaurantId,
  });
  
  const getActionIcon = (action: string) => {
    if (action.includes("ORDER") || action.includes("order")) return ShoppingCart;
    if (action.includes("PAYMENT") || action.includes("payment")) return CreditCard;
    if (action.includes("VOID") || action.includes("void")) return XCircle;
    if (action.includes("REFUND") || action.includes("refund")) return RefreshCw;
    if (action.includes("SHIFT")) return Clock;
    if (action.includes("CASH")) return DollarSign;
    return Play;
  };
  
  const getActionLabel = (action: string): { ar: string; en: string } => {
    const labels: Record<string, { ar: string; en: string }> = {
      ORDER_CREATE: { ar: "إنشاء طلب", en: "Order Created" },
      ORDER_UPDATE: { ar: "تحديث طلب", en: "Order Updated" },
      PAYMENT_COMPLETE: { ar: "دفع مكتمل", en: "Payment Complete" },
      ITEM_VOID: { ar: "إلغاء صنف", en: "Item Voided" },
      ORDER_VOID: { ar: "إلغاء طلب", en: "Order Voided" },
      REFUND: { ar: "استرداد", en: "Refund" },
      SHIFT_OPEN: { ar: "فتح وردية", en: "Shift Opened" },
      SHIFT_CLOSE: { ar: "إغلاق وردية", en: "Shift Closed" },
      CASH_MOVEMENT: { ar: "حركة نقدية", en: "Cash Movement" },
      ORDER_HOLD: { ar: "تعليق طلب", en: "Order Held" },
      ORDER_RESUME: { ar: "استئناف طلب", en: "Order Resumed" },
    };
    return labels[action] || { ar: action, en: action };
  };
  
  const getActionColor = (action: string) => {
    if (action.includes("VOID") || action.includes("REFUND")) return "text-amber-600";
    if (action.includes("PAYMENT")) return "text-green-600";
    if (action.includes("SHIFT_OPEN")) return "text-blue-600";
    if (action.includes("SHIFT_CLOSE")) return "text-purple-600";
    return "text-muted-foreground";
  };
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" />
          {t("training_replay")}
        </CardTitle>
        <CardDescription className="text-xs">
          {language === "ar" 
            ? "عرض تسلسل الإجراءات للتدريب والمراجعة"
            : "View action sequences for training and review"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filters */}
        <div className="flex gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Select value={selectedCashier} onValueChange={setSelectedCashier}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={language === "ar" ? "كل الكاشيرين" : "All Cashiers"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === "ar" ? "كل الكاشيرين" : "All Cashiers"}
              </SelectItem>
              {cashiers?.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        {/* Timeline */}
        <ScrollArea className="h-[300px] pr-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {language === "ar" ? "جار التحميل..." : "Loading..."}
            </div>
          ) : auditLogs && auditLogs.length > 0 ? (
            <div className="space-y-2">
              {auditLogs.map((log, idx) => {
                const Icon = getActionIcon(log.action);
                const label = getActionLabel(log.action);
                const color = getActionColor(log.action);
                
                return (
                  <div 
                    key={log.id}
                    className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex flex-col items-center">
                      <div className={`p-1.5 rounded-full bg-muted ${color}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      {idx < auditLogs.length - 1 && (
                        <div className="w-px h-6 bg-border mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {label[language]}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {log.entity_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(new Date(log.created_at), "HH:mm:ss")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {language === "ar" 
                ? "لا توجد إجراءات مسجلة لهذا اليوم"
                : "No actions recorded for this day"
              }
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
