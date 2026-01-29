import { useLanguage } from "@/contexts/LanguageContext";
import { Store, CheckCircle2, XCircle, AlertTriangle, CreditCard } from "lucide-react";

export type SummaryFilter = 'all' | 'active' | 'inactive' | 'incomplete' | 'subscription_issue';

interface SummaryItem {
  key: SummaryFilter;
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

interface RestaurantSummaryBarProps {
  total: number;
  active: number;
  inactive: number;
  incomplete: number;
  subscriptionIssue: number;
  activeFilter: SummaryFilter;
  onFilterChange: (filter: SummaryFilter) => void;
}

export function RestaurantSummaryBar({
  total,
  active,
  inactive,
  incomplete,
  subscriptionIssue,
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
      key: 'subscription_issue',
      label: t('sa_summary_sub_issue'),
      count: subscriptionIssue,
      icon: CreditCard,
      colorClass: 'text-rose-600 dark:text-rose-400',
      bgClass: 'bg-rose-50 dark:bg-rose-950/40',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const isSelected = activeFilter === item.key;
        
        return (
          <button
            key={item.key}
            onClick={() => onFilterChange(item.key)}
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg border transition-all
              ${isSelected 
                ? `${item.bgClass} border-current ring-2 ring-offset-1 ring-current/20` 
                : 'bg-card border-border hover:bg-muted/50'
              }
            `}
          >
            <div className={`p-1.5 rounded-md ${item.bgClass}`}>
              <Icon className={`h-4 w-4 ${item.colorClass}`} strokeWidth={2} />
            </div>
            <div className="flex flex-col items-start min-w-0">
              <span className={`text-lg font-bold leading-tight ${item.colorClass}`}>
                {item.count}
              </span>
              <span className="text-[10px] text-muted-foreground truncate">
                {item.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
