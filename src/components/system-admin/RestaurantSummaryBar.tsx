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
      tooltip: t('sa_summary_total_tooltip'),
    },
    {
      key: 'active',
      label: t('sa_summary_active'),
      count: active,
      icon: CheckCircle2,
      colorClass: 'text-green-600 dark:text-green-400',
      bgClass: 'bg-green-50 dark:bg-green-950/40',
      tooltip: t('sa_summary_active_tooltip'),
    },
    {
      key: 'inactive',
      label: t('sa_summary_inactive'),
      count: inactive,
      icon: XCircle,
      colorClass: 'text-red-600 dark:text-red-400',
      bgClass: 'bg-red-50 dark:bg-red-950/40',
      tooltip: t('sa_summary_inactive_tooltip'),
    },
    {
      key: 'incomplete',
      label: t('sa_summary_incomplete'),
      count: incomplete,
      icon: AlertTriangle,
      colorClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-50 dark:bg-amber-950/40',
      tooltip: t('sa_summary_incomplete_tooltip'),
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
      tooltip: t('sa_summary_sub_issue_tooltip'),
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = activeFilter === item.key;
        
        return (
          <Tooltip key={item.key}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onFilterChange(item.key)}
                className={`
                  flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all w-full
                  ${isSelected 
                    ? `${item.bgClass} border-current ring-2 ring-offset-1 ring-current/20` 
                    : 'bg-card border-border/60 hover:border-border hover:bg-muted/30'
                  }
                `}
              >
                <div className={`p-1.5 rounded-md ${item.bgClass}`}>
                  <Icon className={`h-4 w-4 ${item.colorClass}`} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col items-start min-w-0">
                  <span className={`text-lg font-extrabold leading-tight ${item.colorClass}`}>
                    {item.count}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground truncate">
                    {item.label}
                  </span>
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs max-w-[220px] leading-relaxed">
              {item.tooltip}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
