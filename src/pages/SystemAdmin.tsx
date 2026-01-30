import { useState, useRef, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRestaurants, useAssignOwner, useUpdateRestaurant } from "@/hooks/useRestaurants";
import { useOwners, useCreateOwner } from "@/hooks/useOwners";
import { useToggleRestaurantActive } from "@/hooks/useToggleRestaurantActive";
import { useAllRestaurantsInventoryStatus, useToggleInventoryModule } from "@/hooks/useInventoryModuleToggle";
import { useAllRestaurantsKDSStatus, useToggleKDSModule } from "@/hooks/useKDSModuleToggle";
import { useAllRestaurantsQRStatus, useToggleQRModule } from "@/hooks/useQRModuleToggle";
import { useAllRestaurantsHealthData } from "@/hooks/useSystemHealthSnapshot";
import { useAllOwnerPhones } from "@/hooks/useAllOwnerPhones";
import { 
  RestaurantSummaryBar, 
  RestaurantFilterBar, 
  RestaurantListRow, 
  RestaurantListPagination,
  getRestaurantOperationalState,
  SummaryFilter,
  StatusFilter,
  SubscriptionFilter,
  SortOption,
  FeatureFilter,
  ContactRestaurantDialog,
} from "@/components/system-admin";
import { 
  useExpiringSubscriptions, 
  useCreateRestaurantWithSubscription, 
  useRenewSubscription,
  useRestaurantSubscriptions,
  SubscriptionPeriod,
  PERIOD_LABELS,
} from "@/hooks/useRestaurantSubscriptions";
import {
  useSendSubscriptionReminder,
  getApplicableReminderStage,
  getReminderStageLabel,
  canSendReminder,
  type ReminderStage,
} from "@/hooks/useSubscriptionReminder";
import { Store, Users, Plus, Link, Loader2, Upload, Calendar, Mail, AlertCircle, CheckCircle2, Info, CalendarDays } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays, addMonths } from "date-fns";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";


const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

// Constants for localStorage keys
const STORAGE_KEY_PAGE_SIZE = 'sa_restaurants_page_size';
const STORAGE_KEY_SORT = 'sa_restaurants_sort';

export default function SystemAdmin() {
  const { t } = useLanguage();

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants();
  const { data: owners = [], isLoading: loadingOwners } = useOwners();
  const { data: inventoryStatusMap = new Map() } = useAllRestaurantsInventoryStatus();
  const { data: kdsStatusMap = new Map() } = useAllRestaurantsKDSStatus();
  const { data: qrStatusMap = new Map() } = useAllRestaurantsQRStatus();
  const { data: healthDataMap = new Map() } = useAllRestaurantsHealthData();
  const { data: ownerPhoneMap = new Map() } = useAllOwnerPhones();
  const { data: subscriptions = [] } = useRestaurantSubscriptions();
  const { data: expiringSubscriptions = [] } = useExpiringSubscriptions();
  const createRestaurantWithSub = useCreateRestaurantWithSubscription();
  const renewSubscription = useRenewSubscription();
  const sendReminder = useSendSubscriptionReminder();
  const updateRestaurant = useUpdateRestaurant();
  const createOwner = useCreateOwner();
  const assignOwner = useAssignOwner();
  const toggleActive = useToggleRestaurantActive();
  const { toast } = useToast();
  
  // Module toggles with localized toast callbacks
  const toggleInventory = useToggleInventoryModule({
    onSuccessCallback: (enabled) => {
      toast({
        title: enabled ? t('toast_inv_enabled_title') : t('toast_inv_disabled_title'),
        description: enabled ? t('toast_inv_enabled_desc') : t('toast_inv_disabled_desc'),
      });
    },
    onErrorCallback: () => {
      toast({
        title: t('toast_module_error_title'),
        description: t('toast_module_error_desc'),
        variant: "destructive",
      });
    },
  });
  
  const toggleKDS = useToggleKDSModule({
    onSuccessCallback: (enabled) => {
      toast({
        title: enabled ? t('toast_kds_enabled_title') : t('toast_kds_disabled_title'),
        description: enabled ? t('toast_kds_enabled_desc') : t('toast_kds_disabled_desc'),
      });
    },
    onErrorCallback: () => {
      toast({
        title: t('toast_module_error_title'),
        description: t('toast_module_error_desc'),
        variant: "destructive",
      });
    },
  });
  
  const toggleQR = useToggleQRModule({
    onSuccessCallback: (enabled) => {
      toast({
        title: enabled ? t('toast_qr_enabled_title') : t('toast_qr_disabled_title'),
        description: enabled ? t('toast_qr_enabled_desc') : t('toast_qr_disabled_desc'),
      });
    },
    onErrorCallback: () => {
      toast({
        title: t('toast_module_error_title'),
        description: t('toast_module_error_desc'),
        variant: "destructive",
      });
    },
  });
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Filter & Pagination State
  const [summaryFilter, setSummaryFilter] = useState<SummaryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>('all');
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    return (localStorage.getItem(STORAGE_KEY_SORT) as SortOption) || 'newest';
  });
  const [activeFeatures, setActiveFeatures] = useState<FeatureFilter[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    return Number(localStorage.getItem(STORAGE_KEY_PAGE_SIZE)) || 10;
  });

  // Persist preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PAGE_SIZE, String(pageSize));
  }, [pageSize]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SORT, sortOption);
  }, [sortOption]);

  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [assignOwnerPhone, setAssignOwnerPhone] = useState("");
  const [editLogoRestaurantId, setEditLogoRestaurantId] = useState<string | null>(null);
  
  // Subscription form states (create restaurant)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<SubscriptionPeriod>("MONTHLY");
  const [bonusMonths, setBonusMonths] = useState(0);
  const [subscriptionReason, setSubscriptionReason] = useState("");
  
  // Manage subscription dialog states
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState<{id: string; name: string} | null>(null);
  const [managePeriod, setManagePeriod] = useState<SubscriptionPeriod>("MONTHLY");
  const [manageBonusMonths, setManageBonusMonths] = useState(0);
  const [manageStartDate, setManageStartDate] = useState<Date>(new Date());
  const [manageReason, setManageReason] = useState("");
  
  // Edit restaurant name states
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<{id: string; name: string} | null>(null);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  
  // Edit owner states
  const [editOwnerDialogOpen, setEditOwnerDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<{id: string; email: string; username?: string; restaurantId?: string} | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("");
  const [newOwnerDisplayName, setNewOwnerDisplayName] = useState("");
  const [newOwnerPhone, setNewOwnerPhone] = useState("");
  const [loadingOwnerPhone, setLoadingOwnerPhone] = useState(false);
  const [updatingOwner, setUpdatingOwner] = useState(false);

  // Dialog states
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editLogoDialogOpen, setEditLogoDialogOpen] = useState(false);
  
  // Deactivation confirmation dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [restaurantToDeactivate, setRestaurantToDeactivate] = useState<{id: string; name: string} | null>(null);

  // Inventory toggle confirmation dialog
  const [inventoryToggleDialogOpen, setInventoryToggleDialogOpen] = useState(false);
  const [inventoryToggleTarget, setInventoryToggleTarget] = useState<{id: string; name: string; currentEnabled: boolean} | null>(null);

  // KDS toggle confirmation dialog
  const [kdsToggleDialogOpen, setKdsToggleDialogOpen] = useState(false);
  const [kdsToggleTarget, setKdsToggleTarget] = useState<{id: string; name: string; currentEnabled: boolean} | null>(null);

  // QR Order toggle confirmation dialog
  const [qrToggleDialogOpen, setQrToggleDialogOpen] = useState(false);
  const [qrToggleTarget, setQrToggleTarget] = useState<{id: string; name: string; currentEnabled: boolean} | null>(null);

  // Contact restaurant dialog
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [contactTarget, setContactTarget] = useState<{
    restaurant: { id: string; name: string; owner_id: string | null };
    subscription: ReturnType<typeof getSubscription>;
    ownerEmail: string | null;
    ownerPhone: string | null;
  } | null>(null);

  // Helper to get subscription for a restaurant
  const getSubscription = (restaurantId: string) => {
    return subscriptions.find(s => s.restaurant_id === restaurantId);
  };

  // Compute summary stats
  const summaryStats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let incomplete = 0;
    let subscriptionIssue = 0;
    let nearExpiry = 0;
    let expiredSub = 0;

    const now = new Date();

    restaurants.forEach((r) => {
      const sub = getSubscription(r.id);
      const daysUntilExpiry = sub ? differenceInDays(new Date(sub.end_date), now) : -1;
      const hasValidSub = sub && daysUntilExpiry >= 0;
      const state = getRestaurantOperationalState(r.is_active, !!hasValidSub, !!r.owner_id);

      if (!r.is_active) {
        inactive++;
      } else if (state === 'setup_incomplete') {
        incomplete++;
      } else {
        active++;
      }

      // Subscription issue: no sub or expired
      if (!sub || daysUntilExpiry < 0) {
        subscriptionIssue++;
      }

      // Near expiry: within 7 days but not expired
      if (sub && daysUntilExpiry >= 0 && daysUntilExpiry <= 7) {
        nearExpiry++;
      }

      // Expired subscription
      if (sub && daysUntilExpiry < 0) {
        expiredSub++;
      }
    });

    return { total: restaurants.length, active, inactive, incomplete, subscriptionIssue, nearExpiry, expiredSub };
  }, [restaurants, subscriptions]);

  // Filter & Sort restaurants
  const filteredRestaurants = useMemo(() => {
    let result = [...restaurants];

    // Summary filter (quick filter from summary bar)
    if (summaryFilter !== 'all') {
      const now = new Date();
      result = result.filter((r) => {
        const sub = getSubscription(r.id);
        const daysUntilExpiry = sub ? differenceInDays(new Date(sub.end_date), now) : -1;
        const hasValidSub = sub && daysUntilExpiry >= 0;
        const state = getRestaurantOperationalState(r.is_active, !!hasValidSub, !!r.owner_id);

        switch (summaryFilter) {
          case 'active':
            return r.is_active && state === 'ready';
          case 'inactive':
            return !r.is_active;
          case 'incomplete':
            return r.is_active && state === 'setup_incomplete';
          case 'subscription_issue':
            return !sub || daysUntilExpiry < 0;
          case 'near_expiry':
            return sub && daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
          case 'expired_sub':
            return sub && daysUntilExpiry < 0;
          default:
            return true;
        }
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const owner = owners.find(o => o.user_id === r.owner_id);
        return (
          r.name.toLowerCase().includes(q) ||
          (owner?.email?.toLowerCase().includes(q)) ||
          (owner?.username?.toLowerCase().includes(q))
        );
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((r) => 
        statusFilter === 'active' ? r.is_active : !r.is_active
      );
    }

    // Subscription filter
    if (subscriptionFilter !== 'all') {
      result = result.filter((r) => {
        const sub = getSubscription(r.id);
        const isExpired = sub && differenceInDays(new Date(sub.end_date), new Date()) < 0;

        switch (subscriptionFilter) {
          case 'active':
            return sub && !isExpired;
          case 'expired':
            return sub && isExpired;
          case 'none':
            return !sub;
          default:
            return true;
        }
      });
    }

    // Feature filters
    if (activeFeatures.length > 0) {
      result = result.filter((r) => {
        const hasQR = qrStatusMap.get(r.id) ?? false;
        const hasKDS = kdsStatusMap.get(r.id) ?? false;
        const hasInv = inventoryStatusMap.get(r.id) ?? false;

        return activeFeatures.every((f) => {
          if (f === 'qr') return hasQR;
          if (f === 'kds') return hasKDS;
          if (f === 'inventory') return hasInv;
          return true;
        });
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'last_activity':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'expiry_nearest':
          const subA = getSubscription(a.id);
          const subB = getSubscription(b.id);
          const endA = subA ? new Date(subA.end_date).getTime() : Infinity;
          const endB = subB ? new Date(subB.end_date).getTime() : Infinity;
          return endA - endB;
        default:
          return 0;
      }
    });

    return result;
  }, [restaurants, owners, subscriptions, summaryFilter, searchQuery, statusFilter, subscriptionFilter, activeFeatures, sortOption, qrStatusMap, kdsStatusMap, inventoryStatusMap]);

  // Pagination
  const totalPages = Math.ceil(filteredRestaurants.length / pageSize);
  const paginatedRestaurants = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRestaurants.slice(start, start + pageSize);
  }, [filteredRestaurants, currentPage, pageSize]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, subscriptionFilter, activeFeatures, summaryFilter, pageSize]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (restaurantId: string): Promise<string | null> => {
    if (!logoFile) return null;
    
    const fileExt = logoFile.name.split('.').pop();
    const filePath = `${restaurantId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('restaurant-logos')
      .upload(filePath, logoFile, { upsert: true });
    
    if (error) throw error;
    
    const { data: urlData } = supabase.storage
      .from('restaurant-logos')
      .getPublicUrl(filePath);
    
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleCreateRestaurant = async () => {
    if (!restaurantName.trim()) {
      toast({ title: "Please enter a restaurant name", variant: "destructive" });
      return;
    }
    
    try {
      setUploadingLogo(true);
      
      let logoUrl: string | null = null;
      if (logoFile) {
        const tempId = crypto.randomUUID();
        const fileExt = logoFile.name.split('.').pop();
        const filePath = `${tempId}.${fileExt}`;
        
        const { error } = await supabase.storage
          .from('restaurant-logos')
          .upload(filePath, logoFile, { upsert: true });
        
        if (!error) {
          const { data: urlData } = supabase.storage
            .from('restaurant-logos')
            .getPublicUrl(filePath);
          logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }
      
      await createRestaurantWithSub.mutateAsync({ 
        name: restaurantName,
        logoUrl,
        period: subscriptionPeriod,
        bonusMonths,
        reason: subscriptionReason || undefined,
      });
      
      setRestaurantName("");
      setLogoFile(null);
      setLogoPreview(null);
      setSubscriptionPeriod("MONTHLY");
      setBonusMonths(0);
      setSubscriptionReason("");
      setRestaurantDialogOpen(false);
    } catch (error) {
      // Error already handled by hook
    } finally {
      setUploadingLogo(false);
    }
  };
  
  const handleManageSubscription = async () => {
    if (!manageTarget) return;
    
    try {
      await renewSubscription.mutateAsync({
        restaurantId: manageTarget.id,
        period: managePeriod,
        bonusMonths: manageBonusMonths,
        startDate: manageStartDate,
        reason: manageReason || undefined,
        notes: manageReason || undefined,
      });
      
      setManageDialogOpen(false);
      setManageTarget(null);
      setManagePeriod("MONTHLY");
      setManageBonusMonths(0);
      setManageStartDate(new Date());
      setManageReason("");
    } catch (error) {
      // Error already handled by hook
    }
  };

  const openManageDialog = (restaurantId: string, restaurantName: string) => {
    const existingSub = getSubscription(restaurantId);
    setManageTarget({ id: restaurantId, name: restaurantName });
    setManagePeriod(existingSub?.period as SubscriptionPeriod || "MONTHLY");
    setManageBonusMonths(existingSub?.bonus_months || 0);
    // Use existing start_date if available, otherwise default to today
    setManageStartDate(existingSub?.start_date ? new Date(existingSub.start_date) : new Date());
    setManageReason(existingSub?.notes || "");
    setManageDialogOpen(true);
  };

  const handleUpdateLogo = async () => {
    if (!editLogoRestaurantId || !logoFile) return;
    
    try {
      setUploadingLogo(true);
      const logoUrl = await uploadLogo(editLogoRestaurantId);
      if (logoUrl) {
        await updateRestaurant.mutateAsync({ id: editLogoRestaurantId, logoUrl });
      }
      setLogoFile(null);
      setLogoPreview(null);
      setEditLogoDialogOpen(false);
      setEditLogoRestaurantId(null);
    } catch (error) {
      toast({ title: "Error uploading logo", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCreateOwner = async () => {
    const emailResult = emailSchema.safeParse(ownerEmail);
    if (!emailResult.success) {
      toast({ title: emailResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    const passwordResult = passwordSchema.safeParse(ownerPassword);
    if (!passwordResult.success) {
      toast({ title: passwordResult.error.errors[0].message, variant: "destructive" });
      return;
    }
    const trimmedDisplayName = ownerDisplayName.trim();
    if (trimmedDisplayName.length < 2) {
      toast({ title: "Display name must be at least 2 characters", variant: "destructive" });
      return;
    }
    await createOwner.mutateAsync({ email: ownerEmail, password: ownerPassword, username: trimmedDisplayName });
    setOwnerEmail("");
    setOwnerPassword("");
    setOwnerDisplayName("");
    setOwnerPhone("");
    setOwnerDialogOpen(false);
  };

  const handleAssignOwner = async () => {
    if (!selectedRestaurant || !selectedOwner) {
      toast({ title: "Please select both restaurant and owner", variant: "destructive" });
      return;
    }
    await assignOwner.mutateAsync({ restaurantId: selectedRestaurant, ownerId: selectedOwner });
    
    if (assignOwnerPhone.trim()) {
      const phoneValue = assignOwnerPhone.trim();
      const { data: existingSettings } = await supabase
        .from('restaurant_settings')
        .select('id')
        .eq('restaurant_id', selectedRestaurant)
        .maybeSingle();
      
      if (existingSettings) {
        await supabase
          .from('restaurant_settings')
          .update({ owner_phone: phoneValue })
          .eq('restaurant_id', selectedRestaurant);
      } else {
        await supabase
          .from('restaurant_settings')
          .insert({ restaurant_id: selectedRestaurant, owner_phone: phoneValue });
      }
    }
    
    setSelectedRestaurant("");
    setSelectedOwner("");
    setAssignOwnerPhone("");
    setAssignDialogOpen(false);
  };

  const handleToggleActive = (restaurantId: string, restaurantName: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      setRestaurantToDeactivate({ id: restaurantId, name: restaurantName });
      setDeactivateDialogOpen(true);
    } else {
      toggleActive.mutate({ restaurantId, isActive: true });
    }
  };

  const confirmDeactivate = () => {
    if (restaurantToDeactivate) {
      toggleActive.mutate({ restaurantId: restaurantToDeactivate.id, isActive: false });
      setDeactivateDialogOpen(false);
      setRestaurantToDeactivate(null);
    }
  };

  const handleInventoryToggle = (restaurantId: string, restaurantName: string, currentEnabled: boolean) => {
    setInventoryToggleTarget({ id: restaurantId, name: restaurantName, currentEnabled });
    setInventoryToggleDialogOpen(true);
  };

  const confirmInventoryToggle = () => {
    if (inventoryToggleTarget) {
      toggleInventory.mutate({ 
        restaurantId: inventoryToggleTarget.id, 
        enabled: !inventoryToggleTarget.currentEnabled 
      });
      setInventoryToggleDialogOpen(false);
      setInventoryToggleTarget(null);
    }
  };

  const handleKDSToggle = (restaurantId: string, restaurantName: string, currentEnabled: boolean) => {
    setKdsToggleTarget({ id: restaurantId, name: restaurantName, currentEnabled });
    setKdsToggleDialogOpen(true);
  };

  const confirmKDSToggle = () => {
    if (kdsToggleTarget) {
      toggleKDS.mutate({ 
        restaurantId: kdsToggleTarget.id, 
        enabled: !kdsToggleTarget.currentEnabled 
      });
      setKdsToggleDialogOpen(false);
      setKdsToggleTarget(null);
    }
  };

  const handleQRToggle = (restaurantId: string, restaurantName: string, currentEnabled: boolean) => {
    setQrToggleTarget({ id: restaurantId, name: restaurantName, currentEnabled });
    setQrToggleDialogOpen(true);
  };

  const confirmQRToggle = () => {
    if (qrToggleTarget) {
      toggleQR.mutate({ 
        restaurantId: qrToggleTarget.id, 
        enabled: !qrToggleTarget.currentEnabled 
      });
      setQrToggleDialogOpen(false);
      setQrToggleTarget(null);
    }
  };

  const handleFeatureToggle = (feature: FeatureFilter) => {
    setActiveFeatures(prev => 
      prev.includes(feature) 
        ? prev.filter(f => f !== feature)
        : [...prev, feature]
    );
  };

  const unassignedRestaurants = restaurants.filter((r) => !r.owner_id);

  if (loadingRestaurants || loadingOwners) {
    return (
      <DashboardLayout title="System Admin">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="System Admin">
      <div className="space-y-4 animate-fade-in">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatCard title={t('sa_total_restaurants')} value={restaurants.length} icon={Store} />
          <StatCard title={t('sa_total_owners')} value={owners.length} icon={Users} />
        </div>

        {/* Actions Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Create Restaurant */}
          <Dialog open={restaurantDialogOpen} onOpenChange={setRestaurantDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow relative overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{t('sa_create_restaurant')}</h3>
                    <p className="text-xs text-muted-foreground">{t('sa_create_restaurant_desc')}</p>
                  </div>
                  <span className="absolute bottom-1 end-3 text-4xl font-bold text-muted-foreground/15 select-none pointer-events-none">1</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-md !top-[1vh] !translate-y-0">
              <DialogHeader>
                <DialogTitle>{t('create')} {t('restaurant_name')}</DialogTitle>
                <DialogDescription>{t('sub_create_desc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1">
                  <Label htmlFor="restaurant-name" className="text-sm">
                    {t('restaurant_name')} <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder={t('restaurant_name')}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">{t('upload_logo')} ({t('optional')})</Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoInputRef}
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  {logoPreview ? (
                    <div className="flex items-center gap-3">
                      <img src={logoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded-lg border" />
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full h-9"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('upload_logo')}
                    </Button>
                  )}
                </div>
                
                <div className="pt-3 border-t space-y-3">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('sub_subscription_settings')}
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="subscription-period" className="text-sm">
                        {t('sub_period')} <span className="text-destructive">*</span>
                      </Label>
                      <Select value={subscriptionPeriod} onValueChange={(v) => setSubscriptionPeriod(v as SubscriptionPeriod)}>
                        <SelectTrigger id="subscription-period" className="h-9">
                          <SelectValue placeholder={t('sub_period')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MONTHLY">{t('period_monthly')}</SelectItem>
                          <SelectItem value="QUARTERLY">{t('period_quarterly')}</SelectItem>
                          <SelectItem value="SEMI_ANNUAL">{t('period_semi_annual')}</SelectItem>
                          <SelectItem value="ANNUAL">{t('period_annual')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="bonus-months" className="text-sm">{t('sub_bonus_months')}</Label>
                      <Input
                        id="bonus-months"
                        type="number"
                        min={0}
                        max={6}
                        value={bonusMonths}
                        onChange={(e) => setBonusMonths(Math.min(Math.max(0, parseInt(e.target.value) || 0), 6))}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{t('sub_bonus_months_max')}</p>
                  
                  <div className="space-y-1">
                    <Label htmlFor="subscription-reason" className="text-sm">{t('sub_reason')} ({t('optional')})</Label>
                    <Textarea
                      id="subscription-reason"
                      value={subscriptionReason}
                      onChange={(e) => setSubscriptionReason(e.target.value)}
                      placeholder={t('sub_reason_placeholder')}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground pt-1">
                  <span className="text-destructive">*</span> {t('required_fields_note')}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setRestaurantDialogOpen(false);
                  setLogoFile(null);
                  setLogoPreview(null);
                  setSubscriptionPeriod("MONTHLY");
                  setBonusMonths(0);
                  setSubscriptionReason("");
                }}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreateRestaurant} disabled={createRestaurantWithSub.isPending || uploadingLogo}>
                  {(createRestaurantWithSub.isPending || uploadingLogo) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Create Owner */}
          <Dialog open={ownerDialogOpen} onOpenChange={setOwnerDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow relative overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{t('sa_create_owner')}</h3>
                    <p className="text-xs text-muted-foreground">{t('sa_create_owner_desc')}</p>
                  </div>
                  <span className="absolute bottom-1 end-3 text-4xl font-bold text-muted-foreground/15 select-none pointer-events-none">2</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="p-4">
              <DialogHeader className="pb-2">
                <DialogTitle>{t('sa_create_owner_dialog_title')}</DialogTitle>
                <DialogDescription className="text-sm">{t('sa_create_owner_dialog_desc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="owner-display-name" className="text-sm mb-1 block">{t('sa_display_name')}</Label>
                  <Input
                    id="owner-display-name"
                    className="py-2 px-3 h-9"
                    value={ownerDisplayName}
                    onChange={(e) => setOwnerDisplayName(e.target.value)}
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">{t('sa_display_name_min')}</p>
                </div>
                <div>
                  <Label htmlFor="owner-email" className="text-sm mb-1 block">{t('email')}</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    className="py-2 px-3 h-9"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="owner-password" className="text-sm mb-1 block">{t('password')}</Label>
                  <Input
                    id="owner-password"
                    type="password"
                    className="py-2 px-3 h-9"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="owner-phone" className="text-sm mb-1 block">
                    رقم موبايل صاحب المطعم (اختياري)
                  </Label>
                  <Input
                    id="owner-phone"
                    type="tel"
                    dir="ltr"
                    className="py-2 px-3 h-9"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="079XXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    معلومة تشغيلية – لا يتم الإرسال حاليًا
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => {
                  setOwnerDialogOpen(false);
                  setOwnerDisplayName("");
                  setOwnerPhone("");
                }}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleCreateOwner} disabled={createOwner.isPending || ownerDisplayName.trim().length < 2}>
                  {createOwner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Owner */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow relative overflow-hidden">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Link className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">{t('sa_assign_owner')}</h3>
                    <p className="text-xs text-muted-foreground">{t('sa_assign_owner_desc')}</p>
                  </div>
                  <span className="absolute bottom-1 end-3 text-4xl font-bold text-muted-foreground/15 select-none pointer-events-none">3</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="p-4">
              <DialogHeader className="pb-2">
                <DialogTitle>{t('sa_assign_dialog_title')}</DialogTitle>
                <DialogDescription className="text-sm">{t('sa_assign_dialog_desc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <div>
                  <Label className="text-sm mb-1 block">{t('restaurant_name')}</Label>
                  <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('sa_select_restaurant')} />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedRestaurants.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm mb-1 block">{t('sa_owner_label')}</Label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={t('sa_select_owner')} />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map((o) => (
                        <SelectItem key={o.id} value={o.user_id}>
                          {o.email ?? o.user_id.slice(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assign-owner-phone" className="text-sm mb-1 block">
                    رقم موبايل صاحب المطعم (اختياري)
                  </Label>
                  <Input
                    id="assign-owner-phone"
                    type="tel"
                    dir="ltr"
                    className="py-2 px-3 h-9"
                    value={assignOwnerPhone}
                    onChange={(e) => setAssignOwnerPhone(e.target.value)}
                    placeholder="079XXXXXXXX"
                  />
                  <p className="text-xs text-muted-foreground mt-0.5">
                    معلومة تشغيلية – لا يتم الإرسال حاليًا
                  </p>
                </div>
              </div>
              <DialogFooter className="pt-2">
                <Button variant="outline" onClick={() => {
                  setAssignDialogOpen(false);
                  setAssignOwnerPhone("");
                }}>
                  {t('cancel')}
                </Button>
                <Button onClick={handleAssignOwner} disabled={assignOwner.isPending}>
                  {assignOwner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {t('sa_assign')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Bar */}
        <RestaurantSummaryBar
          total={summaryStats.total}
          active={summaryStats.active}
          inactive={summaryStats.inactive}
          incomplete={summaryStats.incomplete}
          subscriptionIssue={summaryStats.subscriptionIssue}
          nearExpiry={summaryStats.nearExpiry}
          expiredSub={summaryStats.expiredSub}
          activeFilter={summaryFilter}
          onFilterChange={setSummaryFilter}
        />

        {/* Filter Bar */}
        <RestaurantFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          subscriptionFilter={subscriptionFilter}
          onSubscriptionChange={setSubscriptionFilter}
          sortOption={sortOption}
          onSortChange={setSortOption}
          activeFeatures={activeFeatures}
          onFeatureToggle={handleFeatureToggle}
        />

        {/* Restaurant List */}
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t('sa_restaurants_title')}</CardTitle>
            <CardDescription>
              {filteredRestaurants.length === restaurants.length 
                ? t('sa_restaurants_subtitle')
                : `${filteredRestaurants.length} of ${restaurants.length} restaurants`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {paginatedRestaurants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {restaurants.length === 0 ? t('sa_no_restaurants') : 'No restaurants match filters'}
              </p>
            ) : (
              <div className="space-y-2">
                {paginatedRestaurants.map((restaurant) => {
                  const owner = owners.find(o => o.user_id === restaurant.owner_id);
                  const subscription = getSubscription(restaurant.id);
                  
                  return (
                    <RestaurantListRow
                      key={restaurant.id}
                      restaurant={restaurant}
                      subscription={subscription}
                      ownerEmail={owner?.email || null}
                      ownerUsername={owner?.username || null}
                      ownerPhone={ownerPhoneMap.get(restaurant.id) || null}
                      inventoryEnabled={inventoryStatusMap.get(restaurant.id) ?? false}
                      kdsEnabled={kdsStatusMap.get(restaurant.id) ?? false}
                      qrEnabled={qrStatusMap.get(restaurant.id) ?? false}
                      healthData={healthDataMap.get(restaurant.id)}
                      onToggleActive={handleToggleActive}
                      onInventoryToggle={handleInventoryToggle}
                      onKDSToggle={handleKDSToggle}
                      onQRToggle={handleQRToggle}
                      onEditName={(id, name) => {
                        setEditingRestaurant({ id, name });
                        setNewRestaurantName(name);
                        setEditNameDialogOpen(true);
                      }}
                      onEditLogo={(id, logoUrl) => {
                        setEditLogoRestaurantId(id);
                        setLogoPreview(logoUrl);
                        setEditLogoDialogOpen(true);
                      }}
                      onEditOwner={async (ownerId, email, username, restaurantId) => {
                        setEditingOwner({ id: ownerId, email, username, restaurantId });
                        setNewOwnerEmail(email);
                        setNewOwnerPassword('');
                        setNewOwnerDisplayName(username || '');
                        setNewOwnerPhone('');
                        setEditOwnerDialogOpen(true);
                        
                        setLoadingOwnerPhone(true);
                        const { data: settingsData } = await supabase
                          .from('restaurant_settings')
                          .select('owner_phone')
                          .eq('restaurant_id', restaurantId)
                          .maybeSingle();
                        setNewOwnerPhone(settingsData?.owner_phone || '');
                        setLoadingOwnerPhone(false);
                      }}
                      onManageSubscription={openManageDialog}
                      onContactRestaurant={() => {
                        setContactTarget({
                          restaurant: { id: restaurant.id, name: restaurant.name, owner_id: restaurant.owner_id },
                          subscription,
                          ownerEmail: owner?.email || null,
                          ownerPhone: ownerPhoneMap.get(restaurant.id) || null,
                        });
                        setContactDialogOpen(true);
                      }}
                      togglesPending={{
                        active: toggleActive.isPending,
                        inventory: toggleInventory.isPending,
                        kds: toggleKDS.isPending,
                        qr: toggleQR.isPending,
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {filteredRestaurants.length > 0 && (
              <RestaurantListPagination
                currentPage={currentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredRestaurants.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </CardContent>
        </Card>

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('sa_deactivate_title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('sa_deactivate_desc')} <strong>{restaurantToDeactivate?.name}</strong>.
                {' '}{t('sa_deactivate_note')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {t('sa_deactivate')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Inventory Module Toggle Confirmation Dialog */}
        <AlertDialog open={inventoryToggleDialogOpen} onOpenChange={setInventoryToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {inventoryToggleTarget?.currentEnabled ? t('sa_disable_inventory_title') : t('sa_enable_inventory_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {inventoryToggleTarget?.currentEnabled 
                  ? <>{t('sa_disable_inventory_desc')} <strong>{inventoryToggleTarget?.name}</strong>. {t('sa_disable_inventory_note')}</>
                  : <>{t('sa_enable_inventory_desc')} <strong>{inventoryToggleTarget?.name}</strong>. {t('sa_enable_inventory_note')}</>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmInventoryToggle}
                className={inventoryToggleTarget?.currentEnabled 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {inventoryToggleTarget?.currentEnabled ? t('sa_disable') : t('sa_enable')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* KDS Module Toggle Confirmation Dialog */}
        <AlertDialog open={kdsToggleDialogOpen} onOpenChange={setKdsToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {kdsToggleTarget?.currentEnabled ? t('sa_disable_kds_title') : t('sa_enable_kds_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {kdsToggleTarget?.currentEnabled 
                  ? <>{t('sa_disable_kds_desc')} <strong>{kdsToggleTarget?.name}</strong>. {t('sa_disable_kds_note')}</>
                  : <>{t('sa_enable_kds_desc')} <strong>{kdsToggleTarget?.name}</strong>. {t('sa_enable_kds_note')}</>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmKDSToggle}
                className={kdsToggleTarget?.currentEnabled 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {kdsToggleTarget?.currentEnabled ? t('sa_disable') : t('sa_enable')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* QR Order Module Toggle Confirmation Dialog */}
        <AlertDialog open={qrToggleDialogOpen} onOpenChange={setQrToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {qrToggleTarget?.currentEnabled ? t('sa_disable_qr_title') : t('sa_enable_qr_title')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {qrToggleTarget?.currentEnabled 
                  ? <>{t('sa_disable_qr_desc')} <strong>{qrToggleTarget?.name}</strong>. {t('sa_disable_qr_note')}</>
                  : <>{t('sa_enable_qr_desc')} <strong>{qrToggleTarget?.name}</strong>. {t('sa_enable_qr_note')}</>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmQRToggle}
                className={qrToggleTarget?.currentEnabled 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {qrToggleTarget?.currentEnabled ? t('sa_disable') : t('sa_enable')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Edit Restaurant Name Dialog */}
        <Dialog open={editNameDialogOpen} onOpenChange={(open) => {
          setEditNameDialogOpen(open);
          if (!open) {
            setEditingRestaurant(null);
            setNewRestaurantName("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('sa_edit_name_title')}</DialogTitle>
              <DialogDescription>{t('sa_edit_name_desc')} {editingRestaurant?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-restaurant-name">{t('restaurant_name')}</Label>
                <Input
                  id="edit-restaurant-name"
                  value={newRestaurantName}
                  onChange={(e) => setNewRestaurantName(e.target.value)}
                  placeholder={t('sa_enter_new_name')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditNameDialogOpen(false);
                setEditingRestaurant(null);
                setNewRestaurantName("");
              }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={async () => {
                  if (!editingRestaurant || !newRestaurantName.trim()) return;
                  await updateRestaurant.mutateAsync({ id: editingRestaurant.id, name: newRestaurantName.trim() });
                  setEditNameDialogOpen(false);
                  setEditingRestaurant(null);
                  setNewRestaurantName("");
                }} 
                disabled={updateRestaurant.isPending || !newRestaurantName.trim()}
              >
                {updateRestaurant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Owner Dialog */}
        <Dialog open={editOwnerDialogOpen} onOpenChange={(open) => {
          setEditOwnerDialogOpen(open);
          if (!open) {
            setEditingOwner(null);
            setNewOwnerEmail("");
            setNewOwnerPassword("");
            setNewOwnerDisplayName("");
            setNewOwnerPhone("");
          }
        }}>
          <DialogContent className="p-4">
            <DialogHeader className="pb-2">
              <DialogTitle>{t('sa_edit_owner_title')}</DialogTitle>
              <DialogDescription className="text-sm">{t('sa_edit_owner_desc')} {editingOwner?.email}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <div>
                <Label htmlFor="edit-owner-display-name" className="text-sm mb-1 block">{t('sa_display_name')}</Label>
                <Input
                  id="edit-owner-display-name"
                  className="py-2 px-3 h-9"
                  value={newOwnerDisplayName}
                  onChange={(e) => setNewOwnerDisplayName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">{t('sa_display_name_min')}</p>
              </div>
              <div>
                <Label htmlFor="edit-owner-email" className="text-sm mb-1 block">{t('email')}</Label>
                <Input
                  id="edit-owner-email"
                  type="email"
                  className="py-2 px-3 h-9"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="edit-owner-password" className="text-sm mb-1 block">{t('password')}</Label>
                <Input
                  id="edit-owner-password"
                  type="password"
                  className="py-2 px-3 h-9"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <p className="text-xs text-muted-foreground mt-0.5">{t('sa_new_password_hint')}</p>
              </div>
              <div>
                <Label htmlFor="edit-owner-phone" className="text-sm mb-1 block">
                  رقم موبايل صاحب المطعم (اختياري)
                </Label>
                <Input
                  id="edit-owner-phone"
                  type="tel"
                  dir="ltr"
                  className="py-2 px-3 h-9"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  placeholder="079XXXXXXXX"
                  disabled={loadingOwnerPhone}
                />
                <p className="text-xs text-muted-foreground mt-0.5">
                  معلومة تشغيلية – لا يتم الإرسال حاليًا
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditOwnerDialogOpen(false);
                setEditingOwner(null);
                setNewOwnerEmail("");
                setNewOwnerPassword("");
                setNewOwnerDisplayName("");
                setNewOwnerPhone("");
              }}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={async () => {
                  if (!editingOwner) return;
                  
                  const trimmedDisplayName = newOwnerDisplayName.trim();
                  if (trimmedDisplayName.length < 2) {
                    toast({ title: "Display name must be at least 2 characters", variant: "destructive" });
                    return;
                  }
                  
                  const emailResult = emailSchema.safeParse(newOwnerEmail);
                  if (!emailResult.success) {
                    toast({ title: emailResult.error.errors[0].message, variant: "destructive" });
                    return;
                  }
                  
                  if (newOwnerPassword && newOwnerPassword.length < 6) {
                    toast({ title: "Password must be at least 6 characters", variant: "destructive" });
                    return;
                  }
                  
                  setUpdatingOwner(true);
                  const { data: sessionData } = await supabase.auth.getSession();
                  const accessToken = sessionData?.session?.access_token;
                  
                  if (!accessToken) {
                    toast({ title: "Not authenticated", variant: "destructive" });
                    setUpdatingOwner(false);
                    return;
                  }
                  
                  try {
                    if (trimmedDisplayName !== (editingOwner.username || '')) {
                      const { error: nameError } = await supabase.functions.invoke('update-display-name', {
                        body: { 
                          user_id: editingOwner.id, 
                          new_username: trimmedDisplayName 
                        },
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (nameError) throw nameError;
                    }
                    
                    if (newOwnerEmail !== editingOwner.email) {
                      const { error: emailError } = await supabase.functions.invoke('system-admin-update-email', {
                        body: { user_id: editingOwner.id, new_email: newOwnerEmail },
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (emailError) throw emailError;
                    }
                    
                    if (newOwnerPassword) {
                      const { error: passError } = await supabase.functions.invoke('system-admin-reset-password', {
                        body: { user_id: editingOwner.id, new_password: newOwnerPassword },
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (passError) throw passError;
                    }
                    
                    if (editingOwner.restaurantId) {
                      const phoneValue = newOwnerPhone.trim() || null;
                      const { data: existingSettings } = await supabase
                        .from('restaurant_settings')
                        .select('id')
                        .eq('restaurant_id', editingOwner.restaurantId)
                        .maybeSingle();
                      
                      if (existingSettings) {
                        await supabase
                          .from('restaurant_settings')
                          .update({ owner_phone: phoneValue })
                          .eq('restaurant_id', editingOwner.restaurantId);
                      } else {
                        await supabase
                          .from('restaurant_settings')
                          .insert({ restaurant_id: editingOwner.restaurantId, owner_phone: phoneValue });
                      }
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['owners'] });
                    toast({ title: "Owner updated successfully" });
                    setEditOwnerDialogOpen(false);
                    setEditingOwner(null);
                    setNewOwnerEmail("");
                    setNewOwnerPassword("");
                    setNewOwnerDisplayName("");
                    setNewOwnerPhone("");
                  } catch (error: any) {
                    toast({ title: "Error updating owner", description: error.message, variant: "destructive" });
                  } finally {
                    setUpdatingOwner(false);
                  }
                }} 
                disabled={updatingOwner || !newOwnerEmail.trim() || newOwnerDisplayName.trim().length < 2}
              >
                {updatingOwner ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Logo Dialog */}
        <Dialog open={editLogoDialogOpen} onOpenChange={(open) => {
          setEditLogoDialogOpen(open);
          if (!open) {
            setLogoFile(null);
            setLogoPreview(null);
            setEditLogoRestaurantId(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('sa_update_logo_title')}</DialogTitle>
              <DialogDescription>{t('sa_update_logo_desc')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <input
                type="file"
                accept="image/*"
                ref={logoInputRef}
                onChange={handleLogoSelect}
                className="hidden"
              />
              {logoPreview ? (
                <div className="flex flex-col items-center gap-4">
                  <img src={logoPreview} alt="Logo preview" className="w-32 h-32 object-contain rounded-lg border" />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {t('sa_change_logo')}
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {t('sa_upload_logo')}
                </Button>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditLogoDialogOpen(false);
                setLogoFile(null);
                setLogoPreview(null);
                setEditLogoRestaurantId(null);
              }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleUpdateLogo} disabled={!logoFile || uploadingLogo}>
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage Subscription Dialog */}
        <Dialog open={manageDialogOpen} onOpenChange={(open) => {
          setManageDialogOpen(open);
          if (!open) {
            setManageTarget(null);
            setManagePeriod("MONTHLY");
            setManageBonusMonths(0);
            setManageStartDate(new Date());
            setManageReason("");
          }
        }}>
          <DialogContent className="max-w-md p-4">
            <DialogHeader className="pb-2">
              <DialogTitle className="text-base">{t('sub_manage_title')}</DialogTitle>
              <DialogDescription className="text-sm">
                {t('sub_manage_desc')} <strong>{manageTarget?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              {/* Row 1: Duration + Bonus Months */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="manage-period" className="text-xs font-medium">{t('sub_period')}</Label>
                  <Select value={managePeriod} onValueChange={(v) => setManagePeriod(v as SubscriptionPeriod)}>
                    <SelectTrigger id="manage-period" className="h-8 text-sm">
                      <SelectValue placeholder={t('sub_period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">{t('period_monthly')}</SelectItem>
                      <SelectItem value="QUARTERLY">{t('period_quarterly')}</SelectItem>
                      <SelectItem value="SEMI_ANNUAL">{t('period_semi_annual')}</SelectItem>
                      <SelectItem value="ANNUAL">{t('period_annual')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="manage-bonus-months" className="text-xs font-medium">{t('sub_bonus_months')}</Label>
                  <Input
                    id="manage-bonus-months"
                    type="number"
                    min={0}
                    max={6}
                    value={manageBonusMonths}
                    onChange={(e) => setManageBonusMonths(Math.min(Math.max(0, parseInt(e.target.value) || 0), 6))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              
              {/* Row 2: Start Date + End Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t('sub_start_date')}</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-8 text-sm",
                          !manageStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                        {manageStartDate ? format(manageStartDate, 'PP') : <span>{t('sub_pick_date')}</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={manageStartDate}
                        onSelect={(date) => date && setManageStartDate(date)}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{t('sub_end_date')}</Label>
                  <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border bg-muted/50 h-8">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm">
                      {format(
                        addMonths(
                          manageStartDate,
                          (managePeriod === 'MONTHLY' ? 1 : managePeriod === 'QUARTERLY' ? 3 : managePeriod === 'SEMI_ANNUAL' ? 6 : 12) + manageBonusMonths
                        ),
                        'PP'
                      )}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Notes Field */}
              <div className="space-y-1 pt-1 border-t border-border/50">
                <Label htmlFor="manage-reason" className="text-xs font-medium flex items-center gap-1">
                  📝 {t('sub_note_label')}
                </Label>
                <Textarea
                  id="manage-reason"
                  value={manageReason}
                  onChange={(e) => setManageReason(e.target.value)}
                  placeholder={t('sub_reason_renew_placeholder')}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
              
              {/* Renewal Reminder Section - Compact */}
              {manageTarget && (() => {
                const restaurant = restaurants.find(r => r.id === manageTarget.id);
                const subscription = getSubscription(manageTarget.id);
                const applicableStage = getApplicableReminderStage(subscription?.end_date);
                const lastSentStage = restaurant?.last_renewal_reminder_stage;
                const canSend = canSendReminder(lastSentStage, applicableStage) && !!restaurant?.owner_id;
                
                return (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <Label className="text-xs font-medium">{t('reminder_section_title')}</Label>
                        
                        {/* Smart Tooltip */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                              <Info className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs p-2">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold">{t('reminder_tooltip_title')}</p>
                              {applicableStage === '7_DAYS' && <p>{t('reminder_tooltip_7_days')}</p>}
                              {applicableStage === '1_DAY' && <p>{t('reminder_tooltip_1_day')}</p>}
                              {applicableStage === 'EXPIRED' && <p>{t('reminder_tooltip_expired')}</p>}
                              {!applicableStage && <p>{t('reminder_tooltip_not_applicable')}</p>}
                              <p className="text-muted-foreground border-t pt-1 mt-1 text-[10px]">
                                {t('reminder_tooltip_duplicate')}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      
                      {/* Status Badge - Inline */}
                      <div className="flex items-center gap-1.5">
                        {!applicableStage && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] py-0 h-5">
                            {t('reminder_status_not_applicable')}
                          </Badge>
                        )}
                        {applicableStage && (
                          <Badge 
                            variant={applicableStage === 'EXPIRED' ? 'destructive' : applicableStage === '1_DAY' ? 'default' : 'secondary'}
                            className="text-[10px] py-0 h-5 flex items-center gap-0.5"
                          >
                            {applicableStage === 'EXPIRED' && <AlertCircle className="h-2.5 w-2.5" />}
                            {getReminderStageLabel(applicableStage, t)}
                          </Badge>
                        )}
                        {lastSentStage === applicableStage && applicableStage && (
                          <Badge variant="outline" className="text-green-600 border-green-300 text-[10px] py-0 h-5 flex items-center gap-0.5">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {t('reminder_status_already_sent')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Send Button Row */}
                    {applicableStage && (
                      <div className="flex items-center gap-2">
                        {/* No Owner Warning */}
                        {!restaurant?.owner_id && (
                          <p className="text-[10px] text-destructive flex items-center gap-0.5 flex-1">
                            <AlertCircle className="h-2.5 w-2.5" />
                            {t('reminder_no_owner')}
                          </p>
                        )}
                        
                        {restaurant?.owner_id && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (canSend && applicableStage) {
                                      sendReminder.mutate({
                                        restaurantId: manageTarget.id,
                                        stage: applicableStage,
                                      });
                                    }
                                  }}
                                  disabled={!canSend || sendReminder.isPending}
                                  className="w-full h-7 text-xs"
                                >
                                  {sendReminder.isPending ? (
                                    <>
                                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                      {t('reminder_sending')}
                                    </>
                                  ) : (
                                    <>
                                      <Mail className="h-3 w-3 mr-1" />
                                      {t('reminder_send_button')}
                                    </>
                                  )}
                                </Button>
                              </div>
                            </TooltipTrigger>
                            {!canSend && lastSentStage === applicableStage && (
                              <TooltipContent>
                                <p className="text-xs">{t('reminder_duplicate_warning')}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        )}
                      </div>
                    )}
                    
                    {/* Last Sent Info */}
                    {lastSentStage && lastSentStage !== applicableStage && (
                      <p className="text-[10px] text-muted-foreground">
                        {t('reminder_last_sent')}: {getReminderStageLabel(lastSentStage as ReminderStage, t)}
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
            <DialogFooter className="px-4 py-3 border-t gap-2">
              <Button variant="outline" size="sm" className="h-8" onClick={() => {
                setManageDialogOpen(false);
                setManageTarget(null);
                setManagePeriod("MONTHLY");
                setManageBonusMonths(0);
                setManageStartDate(new Date());
                setManageReason("");
              }}>
                {t('cancel')}
              </Button>
              <Button size="sm" className="h-8" onClick={handleManageSubscription} disabled={renewSubscription.isPending}>
                {renewSubscription.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                {t('sub_save_changes')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contact Restaurant Dialog */}
        <ContactRestaurantDialog
          open={contactDialogOpen}
          onOpenChange={setContactDialogOpen}
          restaurant={contactTarget?.restaurant || null}
          subscription={contactTarget?.subscription}
          ownerEmail={contactTarget?.ownerEmail || null}
          ownerPhone={contactTarget?.ownerPhone || null}
        />
      </div>
    </DashboardLayout>
  );
}
