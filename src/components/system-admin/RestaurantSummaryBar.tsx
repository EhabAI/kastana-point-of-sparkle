import { useLanguage } from "@/contexts/LanguageContext";
import { Store, CheckCircle2, XCircle, AlertTriangle, CreditCard, Clock, CalendarX2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type SummaryFilter = 'all' | 'active' | 'inactive' | 'incomplete' | 'subscription_issue' | 'near_expiry' | 'expired_sub';

interface SummaryItem {
  key: SummaryFilter;
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  tooltip?: string;
}

interface RestaurantSummaryBarProps {
  total: number;
  active: number;
  inactive: number;
  incomplete: number;
  subscriptionIssue: number;
  nearExpiry: number;
  expiredSub: number;
  activeFilter: SummaryFilter;
  onFilterChange: (filter: SummaryFilter) => void;
}

export function RestaurantSummaryBar({
  total,
  active,
  inactive,
  incomplete,
  subscriptionIssue,
  nearExpiry,
  expiredSub,
  activeFilter,
  onFilterChange,
}: RestaurantSummaryBarProps) {
  const { t } = useLanguage();

  const items: SummaryItem[] = [
    {
      key: 'all',
      label: t('sa_summary_total'),
      count: total,
      icon: Store,
      colorClass: 'text-slate-600 dark:text-slate-400',
      bgClass: 'bg-slate-100 dark:bg-slate-800',
    },
    {
      key: 'active',
      label: t('sa_summary_active'),
      count: active,
      icon: CheckCircle2,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-950/40',
    },
    {
      key: 'inactive',
      label: t('sa_summary_inactive'),
      count: inactive,
      icon: XCircle,
      colorClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-50 dark:bg-red-950/40',
    },
    {
      key: 'incomplete',
      label: t('sa_summary_incomplete'),
      count: incomplete,
      icon: AlertTriangle,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
    },
    {
      key: 'near_expiry',
      label: t('sa_summary_near_expiry'),
      count: nearExpiry,
      icon: Clock,
      colorClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-50 dark:bg-orange-950/40',
      tooltip: t('sa_summary_near_expiry_tooltip'),
    },
    {
      key: 'expired_sub',
      label: t('sa_summary_expired_sub'),
      count: expiredSub,
      icon: CalendarX2,
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/40',
      tooltip: t('sa_summary_expired_sub_tooltip'),
    },
    {
      key: 'subscription_issue',
      label: t('sa_summary_sub_issue'),
      count: subscriptionIssue,
      icon: CreditCard,
      colorClass: 'text-purple-600 dark:text-purple-400',
      bgClass: 'bg-purple-50 dark:bg-purple-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = activeFilter === item.key;
        
        const buttonContent = (
          <button
            key={item.key}
            onClick={() => onFilterChange(item.key)}
            className={`
              flex items-center gap-2 px-2.5 py-1.5 rounded-lg border transition-all w-full
              ${isSelected 
                ? `${item.bgClass} border-current ring-2 ring-offset-1 ring-current/20` 
                : 'bg-card border-border/60 hover:border-border hover:bg-muted/30'
              }
            `}
          >
            <div className={`p-1 rounded-md ${item.bgClass}`}>
              <Icon className={`h-3.5 w-3.5 ${item.colorClass}`} strokeWidth={2} />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className={`text-base font-bold leading-tight ${item.colorClass}`}>
                {item.count}
              </span>
              <span className="text-[9px] text-muted-foreground truncate">
                {item.label}
              </span>
            </div>
          </button>
        );

        if (item.tooltip) {
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                {buttonContent}
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          );
        }

        return buttonContent;
      })}
    </div>
  );
}
