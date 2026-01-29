import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Store, ChevronDown, ChevronUp, Package, ChefHat, QrCode, 
  CheckCircle2, XCircle, Power, PowerOff, Pencil, Image, Key, Calendar, MessageCircle, Copy
} from "lucide-react";
import { RestaurantStatusBadge, getRestaurantOperationalState, RestaurantOperationalState } from "./RestaurantStatusBadge";
import { SystemHealthSnapshot } from "./SystemHealthSnapshot";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { Restaurant } from "@/hooks/useRestaurants";
import { RestaurantSubscription } from "@/hooks/useRestaurantSubscriptions";

interface RestaurantListRowProps {
  restaurant: Restaurant;
  subscription: RestaurantSubscription | undefined;
  ownerEmail: string | null;
  ownerUsername: string | null;
  ownerPhone: string | null;
  inventoryEnabled: boolean;
  kdsEnabled: boolean;
  qrEnabled: boolean;
  healthData: { hasOpenShift: boolean } | undefined;
  onToggleActive: (id: string, name: string, currentlyActive: boolean) => void;
  onInventoryToggle: (id: string, name: string, enabled: boolean) => void;
  onKDSToggle: (id: string, name: string, enabled: boolean) => void;
  onQRToggle: (id: string, name: string, enabled: boolean) => void;
  onEditName: (id: string, name: string) => void;
  onEditLogo: (id: string, logoUrl: string | null) => void;
  onEditOwner: (ownerId: string, email: string, username: string | undefined, restaurantId: string) => void;
  onManageSubscription: (id: string, name: string) => void;
  togglesPending: {
    active: boolean;
    inventory: boolean;
    kds: boolean;
    qr: boolean;
  };
}

// Normalize phone for WhatsApp (Jordan format)
function normalizePhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;
  
  // Remove spaces, dashes, parentheses
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // If starts with +, keep it but remove the +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } 
  // If starts with 0 and looks like Jordan mobile (079, 078, 077, etc.)
  else if (cleaned.startsWith('0') && cleaned.length === 10 && /^07[789]/.test(cleaned)) {
    cleaned = '962' + cleaned.substring(1);
  }
  // If starts with 7 and is 9 digits (Jordan mobile without prefix)
  else if (cleaned.startsWith('7') && cleaned.length === 9 && /^7[789]/.test(cleaned)) {
    cleaned = '962' + cleaned;
  }
  
  // Validate: should be numeric and reasonable length
  if (!/^\d{10,15}$/.test(cleaned)) return null;
  
  return cleaned;
}

export function RestaurantListRow({
  restaurant,
  subscription,
  ownerEmail,
  ownerUsername,
  ownerPhone,
  inventoryEnabled,
  kdsEnabled,
  qrEnabled,
  healthData,
  onToggleActive,
  onInventoryToggle,
  onKDSToggle,
  onQRToggle,
  onEditName,
  onEditLogo,
  onEditOwner,
  onManageSubscription,
  togglesPending,
}: RestaurantListRowProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  // WhatsApp link generation
  const normalizedPhone = normalizePhoneForWhatsApp(ownerPhone || '');
  const hasWhatsApp = !!normalizedPhone;
  
  const getWhatsAppMessage = () => {
    // Sanitize restaurant name to prevent any injection (strip control chars)
    const safeName = restaurant.name.replace(/[\x00-\x1F\x7F]/g, '').trim();
    return language === 'ar'
      ? `مرحباً، معك فريق Kastana. بخصوص مطعم: ${safeName}. كيف نقدر نساعدك؟`
      : `Hello, this is Kastana team regarding: ${safeName}. How can we help?`;
  };

  const getWhatsAppUrl = () => {
    if (!normalizedPhone) return '';
    return `https://web.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(getWhatsAppMessage())}`;
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasWhatsApp) return;
    
    try {
      const newWindow = window.open(getWhatsAppUrl(), '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        // Popup blocked or failed - show toast with copy fallback
        toast({
          title: t('wa_open_failed'),
          description: t('wa_open_failed_desc'),
          variant: "destructive",
        });
      }
    } catch {
      // Browser blocked the action
      toast({
        title: t('wa_open_failed'),
        description: t('wa_open_failed_desc'),
        variant: "destructive",
      });
    }
  };

  const handleCopyWhatsAppMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!normalizedPhone) return;
    
    const textToCopy = `+${normalizedPhone}\n\n${getWhatsAppMessage()}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: t('wa_copied'),
        description: t('wa_copied_desc'),
      });
    } catch {
      toast({
        title: t('wa_copy_failed'),
        variant: "destructive",
      });
    }
  };

  // Subscription status calculations
  const hasSubscription = !!subscription;
  const subscriptionEndDate = subscription ? new Date(subscription.end_date) : null;
  const daysLeft = subscriptionEndDate ? differenceInDays(subscriptionEndDate, new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  // Operational state
  const operationalState: RestaurantOperationalState = getRestaurantOperationalState(
    restaurant.is_active,
    hasSubscription && !isExpired,
    !!restaurant.owner_id
  );

  // Border color based on state - both left accent and overall border
  const getBorderClasses = () => {
    if (!restaurant.is_active) return 'border-l-red-400 border-red-200/50 dark:border-red-900/30';
    if (operationalState === 'setup_incomplete') return 'border-l-amber-400 border-amber-200/50 dark:border-amber-900/30';
    if (isExpired || !hasSubscription) return 'border-l-rose-400 border-rose-200/50 dark:border-rose-900/30';
    return 'border-l-green-400 border-green-200/50 dark:border-green-900/30';
  };

  return (
    <div 
      className={`
        bg-card rounded-lg border border-l-[3px] ${getBorderClasses()}
        transition-all hover:shadow-sm hover:border-opacity-80
      `}
    >
      {/* Compact Row - Always Visible */}
      <div 
        className="flex items-center gap-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Logo */}
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
          {restaurant.logo_url ? (
            <img 
              src={restaurant.logo_url} 
              alt={restaurant.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <Store className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Name + Owner */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{restaurant.name}</span>
            <RestaurantStatusBadge state={operationalState} />
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {ownerEmail || t('sa_no_owner')}
          </div>
        </div>

        {/* Feature Chips - Desktop */}
        <div className="hidden md:flex items-center gap-1.5">
          <FeatureChip enabled={qrEnabled} icon={QrCode} label="QR" />
          <FeatureChip enabled={kdsEnabled} icon={ChefHat} label="KDS" />
          <FeatureChip enabled={inventoryEnabled} icon={Package} label="INV" />
        </div>

        {/* Subscription Badge */}
        <div className="hidden sm:block">
          {hasSubscription ? (
            <Badge 
              variant={isExpired ? "destructive" : isExpiringSoon ? "outline" : "secondary"}
              className="text-[10px] whitespace-nowrap"
            >
              {isExpired 
                ? t('sa_sub_expired') 
                : `${daysLeft}d`
              }
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-[10px]">
              {t('sa_sub_none')}
            </Badge>
          )}
        </div>

        {/* WhatsApp Buttons - Only show if phone exists */}
        {hasWhatsApp && (
          <div className="flex items-center gap-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/40 rounded-e-none border-e-0"
                    onClick={handleWhatsAppClick}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('wa_contact_tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground border-green-200 dark:border-green-800 hover:bg-muted/50 rounded-s-none"
                    onClick={handleCopyWhatsAppMessage}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('wa_copy_tooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Manage Button */}
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-3 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {t('manage')}
          {isExpanded ? (
            <ChevronUp className="h-3.5 w-3.5 ms-1" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 ms-1" />
          )}
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t px-3 py-3 space-y-3 bg-muted/20">
          {/* Power Toggle + Actions Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Power Toggle */}
            <button
              onClick={() => onToggleActive(restaurant.id, restaurant.name, restaurant.is_active)}
              disabled={togglesPending.active}
              className={`
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all
                ${restaurant.is_active 
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/60' 
                  : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/60'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              {restaurant.is_active ? (
                <Power className="h-4 w-4" strokeWidth={2.5} />
              ) : (
                <PowerOff className="h-4 w-4" strokeWidth={2.5} />
              )}
              <span className="text-xs font-semibold">
                {restaurant.is_active ? t('sa_status_on') : t('sa_status_off')}
              </span>
            </button>

            {/* Edit Actions */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onEditName(restaurant.id, restaurant.name)}
            >
              <Pencil className="h-3.5 w-3.5 me-1.5" />
              {t('edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => onEditLogo(restaurant.id, restaurant.logo_url)}
            >
              <Image className="h-3.5 w-3.5 me-1.5" />
              {t('sa_logo')}
            </Button>
            {restaurant.owner_id && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => onEditOwner(restaurant.owner_id!, ownerEmail || '', ownerUsername || undefined, restaurant.id)}
              >
                <Key className="h-3.5 w-3.5 me-1.5" />
                {t('sa_owner_label')}
              </Button>
            )}
            
            {/* WhatsApp Buttons in Expanded Section */}
            {hasWhatsApp ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                  onClick={handleWhatsAppClick}
                >
                  <MessageCircle className="h-3.5 w-3.5 me-1.5" />
                  {t('wa_contact')}
                </Button>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:bg-muted/50"
                        onClick={handleCopyWhatsAppMessage}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('wa_copy_tooltip')}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </>
            ) : (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground opacity-60">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {t('wa_no_number')}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('wa_no_number_hint')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Add-ons Row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {t('sa_addons')}
            </span>
            
            <ModuleToggle
              enabled={inventoryEnabled}
              icon={Package}
              label={t('sa_addon_inventory')}
              onClick={() => onInventoryToggle(restaurant.id, restaurant.name, inventoryEnabled)}
              disabled={togglesPending.inventory}
            />
            <ModuleToggle
              enabled={kdsEnabled}
              icon={ChefHat}
              label={t('sa_addon_kds')}
              onClick={() => onKDSToggle(restaurant.id, restaurant.name, kdsEnabled)}
              disabled={togglesPending.kds}
            />
            <ModuleToggle
              enabled={qrEnabled}
              icon={QrCode}
              label={t('sa_addon_qr')}
              onClick={() => onQRToggle(restaurant.id, restaurant.name, qrEnabled)}
              disabled={togglesPending.qr}
            />
          </div>

          {/* Subscription Row */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('sub_subscription')}
              </span>
              {subscription ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge 
                    variant={isExpired ? "destructive" : isExpiringSoon ? "outline" : "secondary"} 
                    className="text-xs whitespace-nowrap"
                  >
                    {t(`period_${subscription.period.toLowerCase()}` as any)}
                    {subscription.bonus_months > 0 && (
                      <span className="ms-1">
                        + {subscription.bonus_months === 1 
                          ? t('sub_free_month') 
                          : t('sub_free_months').replace('{{count}}', String(subscription.bonus_months))}
                      </span>
                    )}
                  </Badge>
                  <span className={`text-xs ${
                    isExpired ? 'text-destructive font-medium' : 
                    isExpiringSoon ? 'text-amber-600 font-medium' : 
                    'text-muted-foreground'
                  }`}>
                    {isExpired 
                      ? t('sub_expired_ago').replace('{days}', String(Math.abs(daysLeft!)))
                      : `${t('sub_expires_on')} ${format(subscriptionEndDate!, 'MMM d, yyyy')} (${daysLeft} ${t('days')})`
                    }
                  </span>
                </div>
              ) : (
                <Badge variant="destructive" className="text-xs">{t('sub_no_subscription')}</Badge>
              )}
            </div>
            <Button 
              size="sm" 
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onManageSubscription(restaurant.id, restaurant.name)}
            >
              <Calendar className="h-3.5 w-3.5 me-1" />
              {t('sub_manage')}
            </Button>
          </div>

          {/* Health Snapshot */}
          <div className="pt-2 border-t border-border/50">
            <SystemHealthSnapshot
              isActive={restaurant.is_active}
              inventoryEnabled={inventoryEnabled}
              hasOpenShift={healthData?.hasOpenShift ?? false}
              qrEnabled={qrEnabled}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Small helper components
function FeatureChip({ enabled, icon: Icon, label }: { enabled: boolean; icon: React.ElementType; label: string }) {
  return (
    <div className={`
      flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium
      ${enabled 
        ? 'bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300' 
        : 'bg-muted text-muted-foreground'
      }
    `}>
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function ModuleToggle({ 
  enabled, 
  icon: Icon, 
  label, 
  onClick, 
  disabled 
}: { 
  enabled: boolean; 
  icon: React.ElementType; 
  label: string; 
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all cursor-pointer hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed ${
        enabled 
          ? 'bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-950/60' 
          : 'bg-muted/30 hover:bg-muted/50'
      }`}
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 ${enabled ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'}`} />
      <span className={`text-xs font-semibold ${enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
        {label}
      </span>
      {enabled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" strokeWidth={2.5} />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" strokeWidth={2.5} />
      )}
    </button>
  );
}
