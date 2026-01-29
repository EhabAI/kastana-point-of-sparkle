import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Package, ChefHat, QrCode, X } from "lucide-react";

export type StatusFilter = 'all' | 'active' | 'inactive';
export type SubscriptionFilter = 'all' | 'active' | 'expired' | 'none';
export type SortOption = 'newest' | 'oldest' | 'last_activity' | 'expiry_nearest';
export type FeatureFilter = 'qr' | 'kds' | 'inventory';

interface RestaurantFilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  subscriptionFilter: SubscriptionFilter;
  onSubscriptionChange: (sub: SubscriptionFilter) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  activeFeatures: FeatureFilter[];
  onFeatureToggle: (feature: FeatureFilter) => void;
}

export function RestaurantFilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  subscriptionFilter,
  onSubscriptionChange,
  sortOption,
  onSortChange,
  activeFeatures,
  onFeatureToggle,
}: RestaurantFilterBarProps) {
  const { t } = useLanguage();

  const featureChips: { key: FeatureFilter; label: string; icon: React.ElementType }[] = [
    { key: 'qr', label: t('sa_addon_qr'), icon: QrCode },
    { key: 'kds', label: t('sa_addon_kds'), icon: ChefHat },
    { key: 'inventory', label: t('sa_addon_inventory'), icon: Package },
  ];

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || subscriptionFilter !== 'all' || activeFeatures.length > 0;

  const clearAllFilters = () => {
    onSearchChange('');
    onStatusChange('all');
    onSubscriptionChange('all');
    activeFeatures.forEach(f => onFeatureToggle(f));
  };

  return (
    <div className="space-y-3 p-3 bg-muted/20 rounded-lg border border-border/60">
      {/* Row 1: Search + Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={t('sa_filter_search_placeholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8 h-9 border-border/60 focus:border-border"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={(v) => onStatusChange(v as StatusFilter)}>
          <SelectTrigger className="w-[130px] h-9 border-border/60 hover:border-border">
            <SelectValue placeholder={t('status')} />
          </SelectTrigger>
          <SelectContent className="border-border/60">
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="active">{t('active')}</SelectItem>
            <SelectItem value="inactive">{t('inactive')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Subscription Filter */}
        <Select value={subscriptionFilter} onValueChange={(v) => onSubscriptionChange(v as SubscriptionFilter)}>
          <SelectTrigger className="w-[150px] h-9 border-border/60 hover:border-border">
            <SelectValue placeholder={t('sub_subscription')} />
          </SelectTrigger>
          <SelectContent className="border-border/60">
            <SelectItem value="all">{t('all')}</SelectItem>
            <SelectItem value="active">{t('sa_sub_active')}</SelectItem>
            <SelectItem value="expired">{t('sa_sub_expired')}</SelectItem>
            <SelectItem value="none">{t('sa_sub_none')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort */}
        <Select value={sortOption} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-[160px] h-9 border-border/60 hover:border-border">
            <SelectValue placeholder={t('sa_sort_by')} />
          </SelectTrigger>
          <SelectContent className="border-border/60">
            <SelectItem value="newest">{t('sa_sort_newest')}</SelectItem>
            <SelectItem value="oldest">{t('sa_sort_oldest')}</SelectItem>
            <SelectItem value="last_activity">{t('sa_sort_last_activity')}</SelectItem>
            <SelectItem value="expiry_nearest">{t('sa_sort_expiry_nearest')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Row 2: Feature Chips + Clear */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">{t('sa_filter_features')}:</span>
        {featureChips.map((chip) => {
          const Icon = chip.icon;
          const isActive = activeFeatures.includes(chip.key);
          
          return (
            <button
              key={chip.key}
              onClick={() => onFeatureToggle(chip.key)}
              className={`
                inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
                transition-all border
                ${isActive 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background text-muted-foreground border-border/60 hover:border-border hover:text-foreground'
                }
              `}
            >
              <Icon className="h-3 w-3" />
              {chip.label}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            {t('sa_filter_clear')}
          </button>
        )}
      </div>
    </div>
  );
}
