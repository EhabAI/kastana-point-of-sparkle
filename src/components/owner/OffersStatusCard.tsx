import { useLanguage } from "@/contexts/LanguageContext";
import { useMenuCategories, CategoryPromoStatus } from "@/hooks/useMenuCategories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Target, Flame, CalendarClock, Clock, Ban, HelpCircle, CheckCircle, Hourglass, XCircle, Info } from "lucide-react";
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
      <Card className="bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/30">
        <CardContent className="p-2">
          <Skeleton className="h-12 w-full" />
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

  // Status configuration with accent colors and icons
  const statusConfig: Record<CategoryPromoStatus | "disabled", {
    label: string;
    icon: typeof Flame;
    titleIcon: typeof CheckCircle;
    textColor: string;
    bgColor: string;
    borderColor: string;
    cardBg: string;
    accentColor: string;
    helperText: string;
  }> = {
    active: {
      label: t("offer_status_active"),
      icon: Flame,
      titleIcon: CheckCircle,
      textColor: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      cardBg: "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30",
      accentColor: "bg-emerald-500",
      helperText: language === "ar" ? "جميع العروض مفعّلة حاليًا للزبائن" : "All offers are currently active for customers",
    },
    scheduled: {
      label: t("offer_status_scheduled"),
      icon: CalendarClock,
      titleIcon: Hourglass,
      textColor: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
      borderColor: "border-blue-200 dark:border-blue-800",
      cardBg: "bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30",
      accentColor: "bg-blue-500",
      helperText: language === "ar" ? "سيتم تفعيل العروض تلقائيًا عند بدء المدة" : "Offers will be activated automatically when the period starts",
    },
    expired: {
      label: t("offer_status_expired"),
      icon: Clock,
      titleIcon: XCircle,
      textColor: "text-gray-500 dark:text-gray-400",
      bgColor: "bg-gray-100 dark:bg-gray-800/30",
      borderColor: "border-gray-200 dark:border-gray-700",
      cardBg: "bg-gray-50/50 dark:bg-gray-950/10 border-gray-200 dark:border-gray-800/30",
      accentColor: "bg-gray-400",
      helperText: language === "ar" ? "انتهت مدة العروض ولم تعد ظاهرة للزبائن" : "Offer period has ended and is no longer visible to customers",
    },
    none: {
      label: t("offer_status_none"),
      icon: Ban,
      titleIcon: Info,
      textColor: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
      cardBg: "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-100 dark:border-indigo-900/30",
      accentColor: "bg-gray-300 dark:bg-gray-600",
      helperText: language === "ar" ? "لا توجد عروض مفعّلة حاليًا" : "No offers are currently active",
    },
    disabled: {
      label: t("offer_status_disabled"),
      icon: Ban,
      titleIcon: Info,
      textColor: "text-muted-foreground",
      bgColor: "bg-muted/50",
      borderColor: "border-muted",
      cardBg: "bg-gray-50/50 dark:bg-gray-950/10 border-gray-200 dark:border-gray-800/30",
      accentColor: "bg-gray-300 dark:bg-gray-600",
      helperText: language === "ar" ? "لا توجد عروض مفعّلة حاليًا" : "No offers are currently active",
    },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;
  const TitleIcon = currentStatus.titleIcon;

  return (
    <Card className={`${currentStatus.cardBg} relative overflow-hidden`}>
      {/* Accent bar on the right (RTL) */}
      <div className={`absolute top-0 end-0 w-1.5 h-full ${currentStatus.accentColor}`} />
      
      <CardHeader className="pb-1 pt-2 px-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-indigo-500/70" />
            <CardTitle className="text-xs font-medium text-indigo-700/80 dark:text-indigo-400/80">
              {t("offers_status_title")}
            </CardTitle>
            <TitleIcon className={`h-3 w-3 ${currentStatus.textColor}`} />
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-[220px]">
                <p className="text-xs">{t("offers_status_tooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="px-3 pb-2 pt-0.5">
        {/* Status Badge */}
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${currentStatus.bgColor} ${currentStatus.textColor} border ${currentStatus.borderColor}`}
          >
            <StatusIcon className="h-3 w-3" />
            {currentStatus.label}
          </span>
        </div>

        {/* Date Details */}
        {status !== "none" && (promoStart || promoEnd) && (
          <div className="space-y-0.5 text-xs mb-1">
            {promoStart && (
              <div className="flex items-center gap-1.5 text-foreground/60">
                <span className="text-muted-foreground">{t("starts_from")}:</span>
                <span className="font-medium tabular-nums">{formatDate(promoStart)}</span>
              </div>
            )}
            {promoEnd && (
              <div className="flex items-center gap-1.5 text-foreground/60">
                <span className="text-muted-foreground">{t("ends_at")}:</span>
                <span className="font-medium tabular-nums">{formatDate(promoEnd)}</span>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Helper Text */}
        <p className="text-[10px] text-muted-foreground/70 leading-relaxed">
          {currentStatus.helperText}
        </p>
      </CardContent>
    </Card>
  );
}
