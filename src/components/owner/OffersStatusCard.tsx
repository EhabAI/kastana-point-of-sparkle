import { useLanguage } from "@/contexts/LanguageContext";
import { useMenuCategories, CategoryPromoStatus } from "@/hooks/useMenuCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Flame, CalendarClock, Clock, Ban, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";

interface OffersStatusCardProps {
  restaurantId: string;
}

// Helper to check if category is "العروض" or "Offers"
function isOfferCategory(name: string): boolean {
  return name === "العروض" || name?.toLowerCase() === "offers";
}

export function OffersStatusCard({ restaurantId }: OffersStatusCardProps) {
  const { t, language } = useLanguage();
  const { data: categories = [], isLoading } = useMenuCategories(restaurantId);

  // Find the Offers category
  const offersCategory = categories.find((cat) => isOfferCategory(cat.name));

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-indigo-400/90 to-violet-400/80 border-indigo-300/50">
        <CardContent className="p-4">
          <Skeleton className="h-12 w-full bg-white/20" />
        </CardContent>
      </Card>
    );
  }

  // Compute status
  let status: CategoryPromoStatus = "none";
  let promoStart: Date | null = null;
  let promoEnd: Date | null = null;

  if (offersCategory) {
    status = offersCategory.promo_status || "none";
    promoStart = offersCategory.promo_start ? new Date(offersCategory.promo_start) : null;
    promoEnd = offersCategory.promo_end ? new Date(offersCategory.promo_end) : null;
    
    // If category is disabled (is_active = false), override status
    if (!offersCategory.is_active) {
      status = "none";
    }
  }

  const dateLocale = language === "ar" ? ar : enUS;

  // Format dates as DD/MM/YYYY only
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return format(date, "dd/MM/yyyy", { locale: dateLocale });
  };

  // Status configuration with accent colors
  const statusConfig: Record<CategoryPromoStatus | "disabled", {
    label: string;
    icon: typeof Flame;
    accentColor: string;
    badgeBg: string;
    helperText: string;
  }> = {
    active: {
      label: t("offer_status_active"),
      icon: Flame,
      accentColor: "bg-emerald-400",
      badgeBg: "bg-emerald-500/90 text-white",
      helperText: language === "ar" ? "جميع العروض مفعّلة حاليًا للزبائن" : "All offers are currently active for customers",
    },
    scheduled: {
      label: t("offer_status_scheduled"),
      icon: CalendarClock,
      accentColor: "bg-cyan-400",
      badgeBg: "bg-cyan-500/90 text-white",
      helperText: language === "ar" ? "سيتم تفعيل العروض تلقائيًا عند بدء المدة" : "Offers will be activated automatically when the period starts",
    },
    expired: {
      label: t("offer_status_expired"),
      icon: Clock,
      accentColor: "bg-red-400",
      badgeBg: "bg-red-500/80 text-white",
      helperText: language === "ar" ? "انتهت مدة العروض ولم تعد ظاهرة للزبائن" : "Offer period has ended and is no longer visible to customers",
    },
    none: {
      label: t("offer_status_none"),
      icon: Ban,
      accentColor: "bg-gray-300/80",
      badgeBg: "bg-white/25 text-white/90",
      helperText: language === "ar" ? "لا توجد عروض مفعّلة حاليًا" : "No offers are currently active",
    },
    disabled: {
      label: t("offer_status_disabled"),
      icon: Ban,
      accentColor: "bg-gray-300/80",
      badgeBg: "bg-white/25 text-white/90",
      helperText: language === "ar" ? "لا توجد عروض مفعّلة حاليًا" : "No offers are currently active",
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  return (
    <Card className="relative overflow-hidden bg-gradient-to-br from-indigo-400/90 to-violet-400/80 border-indigo-300/50 shadow-md">
      {/* Thick accent bar on the right (RTL) */}
      <div className={`absolute top-0 end-0 w-2 h-full ${currentStatus.accentColor}`} />
      
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-white/90" />
            <CardTitle className="text-sm font-semibold text-white">
              {t("offers_status_title")}
            </CardTitle>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-white/50 cursor-help hover:text-white/70 transition-colors" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <p className="text-xs">{t("offers_status_tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        {/* Large Status Badge */}
        <div className="mb-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-medium ${currentStatus.badgeBg} shadow-sm`}
          >
            <StatusIcon className="h-3.5 w-3.5" />
            {currentStatus.label}
          </span>
        </div>

        {/* Date Range - Single Line */}
        {status !== "none" && (promoStart || promoEnd) && (
          <div className="text-xs text-white/90 mb-2">
            <span className="text-white/70">{language === "ar" ? "المدة:" : "Period:"}</span>{" "}
            <span className="font-medium tabular-nums">
              {formatDate(promoStart) || "—"} → {formatDate(promoEnd) || "—"}
            </span>
          </div>
        )}

        {/* Dynamic Helper Text */}
        <p className="text-xs text-white/70 leading-relaxed">
          {currentStatus.helperText}
        </p>
      </CardContent>
    </Card>
  );
}
