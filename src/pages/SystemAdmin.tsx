import { useState, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useLanguage } from "@/contexts/LanguageContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { 
  useExpiringSubscriptions, 
  useCreateRestaurantWithSubscription, 
  useRenewSubscription,
  useRestaurantSubscriptions,
  SubscriptionPeriod 
} from "@/hooks/useRestaurantSubscriptions";
import { Store, Users, Plus, Link, Loader2, Upload, Image, Package, ChefHat, Pencil, Key, AlertTriangle, RefreshCw, Calendar } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatJOD } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function SystemAdmin() {
  const { t } = useLanguage();

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants();
  const { data: owners = [], isLoading: loadingOwners } = useOwners();
  const { data: inventoryStatusMap = new Map() } = useAllRestaurantsInventoryStatus();
  const { data: kdsStatusMap = new Map() } = useAllRestaurantsKDSStatus();
  const { data: subscriptions = [] } = useRestaurantSubscriptions();
  const { data: expiringSubscriptions = [] } = useExpiringSubscriptions();
  const createRestaurantWithSub = useCreateRestaurantWithSubscription();
  const renewSubscription = useRenewSubscription();
  const updateRestaurant = useUpdateRestaurant();
  const createOwner = useCreateOwner();
  const assignOwner = useAssignOwner();
  const toggleActive = useToggleRestaurantActive();
  const toggleInventory = useToggleInventoryModule();
  const toggleKDS = useToggleKDSModule();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerDisplayName, setOwnerDisplayName] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [viewingRestaurant, setViewingRestaurant] = useState<string | null>(null);
  const [editLogoRestaurantId, setEditLogoRestaurantId] = useState<string | null>(null);
  
  // Subscription form states (create restaurant)
  const [subscriptionPeriod, setSubscriptionPeriod] = useState<SubscriptionPeriod>("MONTHLY");
  const [bonusMonths, setBonusMonths] = useState(0);
  const [subscriptionReason, setSubscriptionReason] = useState("");
  
  // Renew subscription dialog states
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<{id: string; name: string} | null>(null);
  const [renewPeriod, setRenewPeriod] = useState<SubscriptionPeriod>("MONTHLY");
  const [renewBonusMonths, setRenewBonusMonths] = useState(0);
  const [renewReason, setRenewReason] = useState("");
  
  // Edit restaurant name states
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<{id: string; name: string} | null>(null);
  const [newRestaurantName, setNewRestaurantName] = useState("");
  
  // Edit owner states
  const [editOwnerDialogOpen, setEditOwnerDialogOpen] = useState(false);
  const [editingOwner, setEditingOwner] = useState<{id: string; email: string; username?: string} | null>(null);
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("");
  const [newOwnerDisplayName, setNewOwnerDisplayName] = useState("");
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
    
    // Add cache-busting timestamp to force browser to reload the image
    return `${urlData.publicUrl}?t=${Date.now()}`;
  };

  const handleCreateRestaurant = async () => {
    if (!restaurantName.trim()) {
      toast({ title: "Please enter a restaurant name", variant: "destructive" });
      return;
    }
    
    try {
      setUploadingLogo(true);
      
      // Upload logo first if provided
      let logoUrl: string | null = null;
      if (logoFile) {
        // Create temporary ID for logo upload
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
      
      // Create restaurant with subscription via edge function
      const result = await createRestaurantWithSub.mutateAsync({ 
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
  
  const handleRenewSubscription = async () => {
    if (!renewTarget) return;
    
    try {
      await renewSubscription.mutateAsync({
        restaurantId: renewTarget.id,
        period: renewPeriod,
        bonusMonths: renewBonusMonths,
        reason: renewReason || undefined,
      });
      
      setRenewDialogOpen(false);
      setRenewTarget(null);
      setRenewPeriod("MONTHLY");
      setRenewBonusMonths(0);
      setRenewReason("");
    } catch (error) {
      // Error already handled by hook
    }
  };

  const openRenewDialog = (restaurantId: string, restaurantName: string) => {
    setRenewTarget({ id: restaurantId, name: restaurantName });
    setRenewPeriod("MONTHLY");
    setRenewBonusMonths(0);
    setRenewReason("");
    setRenewDialogOpen(true);
  };
  
  // Helper to get subscription for a restaurant
  const getSubscription = (restaurantId: string) => {
    return subscriptions.find(s => s.restaurant_id === restaurantId);
  };
  
  // Helper to check if subscription is expiring or expired
  const isSubscriptionCritical = (restaurantId: string) => {
    const sub = getSubscription(restaurantId);
    if (!sub) return true; // No subscription = critical
    const endDate = new Date(sub.end_date);
    const now = new Date();
    const daysLeft = differenceInDays(endDate, now);
    return daysLeft <= 7;
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
    setOwnerDialogOpen(false);
  };

  const handleAssignOwner = async () => {
    if (!selectedRestaurant || !selectedOwner) {
      toast({ title: "Please select both restaurant and owner", variant: "destructive" });
      return;
    }
    await assignOwner.mutateAsync({ restaurantId: selectedRestaurant, ownerId: selectedOwner });
    setSelectedRestaurant("");
    setSelectedOwner("");
    setAssignDialogOpen(false);
  };

  const handleToggleActive = (restaurantId: string, restaurantName: string, currentlyActive: boolean) => {
    if (currentlyActive) {
      // Show confirmation dialog before deactivating
      setRestaurantToDeactivate({ id: restaurantId, name: restaurantName });
      setDeactivateDialogOpen(true);
    } else {
      // Activate immediately without confirmation
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
      <div className="space-y-8 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard title="Total Restaurants" value={restaurants.length} icon={Store} />
          <StatCard title="Total Owners" value={owners.length} icon={Users} />
        </div>

        {/* Expiring Subscriptions Alert */}
        {expiringSubscriptions.length > 0 && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('sub_expiring_count')} ({expiringSubscriptions.length})
              </CardTitle>
              <CardDescription>
                {t('sub_expiring_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {expiringSubscriptions.map((sub) => {
                  const restaurant = restaurants.find(r => r.id === sub.restaurant_id);
                  const endDate = new Date(sub.end_date);
                  const now = new Date();
                  const daysLeft = differenceInDays(endDate, now);
                  const isExpired = daysLeft < 0;
                  
                  return (
                    <div 
                      key={sub.restaurant_id} 
                      className="flex items-center justify-between p-3 bg-background rounded-lg border border-destructive/30"
                    >
                      <div className="flex items-center gap-3">
                        {restaurant?.logo_url ? (
                          <img 
                            src={restaurant.logo_url} 
                            alt={`${restaurant?.name} logo`}
                            className="w-10 h-10 object-contain rounded-lg"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
                            <Store className="h-5 w-5 text-destructive" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{restaurant?.name || t('unknown')}</p>
                          <p className="text-sm text-muted-foreground">
                            {isExpired 
                              ? <span className="text-destructive font-medium">{t('sub_expired_ago').replace('{days}', String(Math.abs(daysLeft)))}</span>
                              : <span className="text-amber-600 font-medium">{t('sub_expires_in').replace('{days}', String(daysLeft))}</span>
                            }
                            {' · '}
                            {format(endDate, 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => openRenewDialog(sub.restaurant_id, restaurant?.name || 'Restaurant')}
                      >
                        <RefreshCw className="h-4 w-4 mr-1" />
                        {t('sub_renew')}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Create Restaurant */}
          <Dialog open={restaurantDialogOpen} onOpenChange={setRestaurantDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Create Restaurant</h3>
                    <p className="text-sm text-muted-foreground">Add a new restaurant</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('create')} {t('restaurant_name')}</DialogTitle>
                <DialogDescription>{t('sub_create_desc')}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name">{t('restaurant_name')}</Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder={t('restaurant_name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('upload_logo')} ({t('optional')})</Label>
                  <input
                    type="file"
                    accept="image/*"
                    ref={logoInputRef}
                    onChange={handleLogoSelect}
                    className="hidden"
                  />
                  {logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img src={logoPreview} alt="Logo preview" className="w-16 h-16 object-contain rounded-lg border" />
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                      >
                        {t('remove')}
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('upload_logo')}
                    </Button>
                  )}
                </div>
                
                {/* Subscription Settings */}
                <div className="pt-4 border-t space-y-4">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    {t('sub_subscription_settings')}
                  </h4>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subscription-period">{t('sub_period')}</Label>
                    <Select value={subscriptionPeriod} onValueChange={(v) => setSubscriptionPeriod(v as SubscriptionPeriod)}>
                      <SelectTrigger id="subscription-period">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="bonus-months">{t('sub_bonus_months')}</Label>
                    <Input
                      id="bonus-months"
                      type="number"
                      min={0}
                      max={6}
                      value={bonusMonths}
                      onChange={(e) => setBonusMonths(Math.min(Math.max(0, parseInt(e.target.value) || 0), 6))}
                    />
                    <p className="text-xs text-muted-foreground">{t('sub_bonus_months_max')}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="subscription-reason">{t('sub_reason')} ({t('optional')})</Label>
                    <Textarea
                      id="subscription-reason"
                      value={subscriptionReason}
                      onChange={(e) => setSubscriptionReason(e.target.value)}
                      placeholder={t('sub_reason_placeholder')}
                      rows={2}
                    />
                  </div>
                </div>
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
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Create Owner</h3>
                    <p className="text-sm text-muted-foreground">Add a new owner account</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Owner</DialogTitle>
                <DialogDescription>Create a new owner account with email, password, and display name.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="owner-display-name">Display Name</Label>
                  <Input
                    id="owner-display-name"
                    value={ownerDisplayName}
                    onChange={(e) => setOwnerDisplayName(e.target.value)}
                    placeholder="John Doe"
                  />
                  <p className="text-xs text-muted-foreground">Minimum 2 characters</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-email">Email</Label>
                  <Input
                    id="owner-email"
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-password">Password</Label>
                  <Input
                    id="owner-password"
                    type="password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setOwnerDialogOpen(false);
                  setOwnerDisplayName("");
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOwner} disabled={createOwner.isPending || ownerDisplayName.trim().length < 2}>
                  {createOwner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Assign Owner */}
          <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Link className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">Assign Owner</h3>
                    <p className="text-sm text-muted-foreground">Link owner to restaurant</p>
                  </div>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Assign Owner to Restaurant</DialogTitle>
                <DialogDescription>Select a restaurant and an owner to link them.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Restaurant</Label>
                  <Select value={selectedRestaurant} onValueChange={setSelectedRestaurant}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select restaurant" />
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
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select owner" />
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAssignOwner} disabled={assignOwner.isPending}>
                  {assignOwner.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Assign
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Restaurants List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Restaurants</CardTitle>
            <CardDescription>All restaurants in the system</CardDescription>
          </CardHeader>
          <CardContent>
            {restaurants.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No restaurants yet. Create one to get started.</p>
            ) : (
              <div className="space-y-4">
                {restaurants.map((restaurant) => {
                  const inventoryEnabled = inventoryStatusMap.get(restaurant.id) ?? false;
                  const kdsEnabled = kdsStatusMap.get(restaurant.id) ?? false;
                  const subscription = getSubscription(restaurant.id);
                  const subscriptionEndDate = subscription ? new Date(subscription.end_date) : null;
                  const now = new Date();
                  const daysLeft = subscriptionEndDate ? differenceInDays(subscriptionEndDate, now) : null;
                  const isExpired = daysLeft !== null && daysLeft < 0;
                  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
                  
                  return (
                    <div key={restaurant.id} className={`p-4 rounded-lg space-y-3 ${
                      !subscription ? 'bg-destructive/10 border border-destructive/30' :
                      isExpired ? 'bg-destructive/10 border border-destructive/30' :
                      isExpiringSoon ? 'bg-amber-500/10 border border-amber-500/30' :
                      'bg-muted/50'
                    }`}>
                      {/* Top row: Restaurant info + Status + Actions */}
                      <div className="flex items-center justify-between">
                        {/* Restaurant Info */}
                        <div className="flex items-center gap-3">
                          {restaurant.logo_url ? (
                            <img 
                              src={restaurant.logo_url} 
                              alt={`${restaurant.name} logo`}
                              className="w-10 h-10 object-contain rounded-lg"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Store className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-foreground">{restaurant.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {restaurant.owner_id 
                                ? `Owner: ${owners.find(o => o.user_id === restaurant.owner_id)?.email || restaurant.owner_id.slice(0, 8) + '...'}`
                                : "No owner assigned"}
                            </p>
                          </div>
                        </div>

                        {/* Status Section */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Badge variant={restaurant.is_active ? "default" : "destructive"} className="text-xs">
                              {restaurant.is_active ? "ACTIVE" : "INACTIVE"}
                            </Badge>
                            <Switch
                              checked={restaurant.is_active}
                              onCheckedChange={() => handleToggleActive(restaurant.id, restaurant.name, restaurant.is_active)}
                              disabled={toggleActive.isPending}
                            />
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 border-l pl-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingRestaurant({ id: restaurant.id, name: restaurant.name });
                                setNewRestaurantName(restaurant.name);
                                setEditNameDialogOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditLogoRestaurantId(restaurant.id);
                                setLogoPreview(restaurant.logo_url || null);
                                setEditLogoDialogOpen(true);
                              }}
                            >
                              <Image className="h-4 w-4 mr-1.5" />
                              Logo
                            </Button>
                            {restaurant.owner_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const owner = owners.find(o => o.user_id === restaurant.owner_id);
                                  if (owner) {
                                    setEditingOwner({ id: owner.user_id, email: owner.email || '', username: owner.username });
                                    setNewOwnerEmail(owner.email || '');
                                    setNewOwnerPassword('');
                                    setNewOwnerDisplayName(owner.username || '');
                                    setEditOwnerDialogOpen(true);
                                  }
                                }}
                              >
                                <Key className="h-4 w-4 mr-1.5" />
                                Owner
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Add-ons/Modules Section */}
                      <div className="flex items-center gap-3 pt-2 border-t border-border/50">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Add-ons</span>
                        
                        {/* Inventory Module */}
                        <div 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${
                            inventoryEnabled 
                              ? 'bg-primary/5 border-primary/20' 
                              : 'bg-muted/50 border-border'
                          }`}
                        >
                          <Package className={`h-4 w-4 ${inventoryEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm ${inventoryEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Inventory Management
                          </span>
                          <Badge 
                            variant={inventoryEnabled ? "default" : "secondary"} 
                            className="text-[10px] px-1.5 py-0"
                          >
                            {inventoryEnabled ? "ON" : "OFF"}
                          </Badge>
                          <Switch
                            checked={inventoryEnabled}
                            onCheckedChange={() => handleInventoryToggle(restaurant.id, restaurant.name, inventoryEnabled)}
                            disabled={toggleInventory.isPending}
                            className="ml-1"
                          />
                        </div>

                        {/* KDS Module */}
                        <div 
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border transition-colors ${
                            kdsEnabled 
                              ? 'bg-primary/5 border-primary/20' 
                              : 'bg-muted/50 border-border'
                          }`}
                        >
                          <ChefHat className={`h-4 w-4 ${kdsEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                          <span className={`text-sm ${kdsEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Kitchen Display
                          </span>
                          <Badge 
                            variant={kdsEnabled ? "default" : "secondary"} 
                            className="text-[10px] px-1.5 py-0"
                          >
                            {kdsEnabled ? "ON" : "OFF"}
                          </Badge>
                          <Switch
                            checked={kdsEnabled}
                            onCheckedChange={() => handleKDSToggle(restaurant.id, restaurant.name, kdsEnabled)}
                            disabled={toggleKDS.isPending}
                            className="ml-1"
                          />
                        </div>
                      </div>
                      
                      {/* Subscription Info Row */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('sub_subscription')}</span>
                          {subscription ? (
                            <div className="flex items-center gap-2">
                              <Badge variant={isExpired ? "destructive" : isExpiringSoon ? "outline" : "secondary"} className="text-xs">
                                {t(`period_${subscription.period.toLowerCase()}` as any)}
                                {subscription.bonus_months > 0 && ` +${subscription.bonus_months}mo`}
                              </Badge>
                              <span className={`text-sm ${
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
                          variant={isExpired || !subscription ? "default" : isExpiringSoon ? "outline" : "ghost"}
                          onClick={() => openRenewDialog(restaurant.id, restaurant.name)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          {!subscription ? t('sub_add_subscription') : t('sub_renew')}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deactivate Confirmation Dialog */}
        <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Deactivate Restaurant?</AlertDialogTitle>
              <AlertDialogDescription>
                This will block POS, QR orders, and staff access immediately for <strong>{restaurantToDeactivate?.name}</strong>.
                All owners and cashiers will be signed out and unable to access the system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDeactivate} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Inventory Module Toggle Confirmation Dialog */}
        <AlertDialog open={inventoryToggleDialogOpen} onOpenChange={setInventoryToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {inventoryToggleTarget?.currentEnabled ? "Disable Inventory Module?" : "Enable Inventory Module?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {inventoryToggleTarget?.currentEnabled 
                  ? <>This will disable all Inventory features for <strong>{inventoryToggleTarget?.name}</strong>. Stock tracking, recipes, and COGS calculations will stop working.</>
                  : <>This will activate Inventory features for <strong>{inventoryToggleTarget?.name}</strong>. Stock tracking, recipes, and COGS calculations will be enabled.</>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmInventoryToggle}
                className={inventoryToggleTarget?.currentEnabled 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {inventoryToggleTarget?.currentEnabled ? "Disable" : "Enable"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* KDS Module Toggle Confirmation Dialog */}
        <AlertDialog open={kdsToggleDialogOpen} onOpenChange={setKdsToggleDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {kdsToggleTarget?.currentEnabled ? "Disable Kitchen Display?" : "Enable Kitchen Display?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {kdsToggleTarget?.currentEnabled 
                  ? <>This will disable KDS for <strong>{kdsToggleTarget?.name}</strong>. Kitchen staff will no longer have access.</>
                  : <>This will activate KDS for <strong>{kdsToggleTarget?.name}</strong>. Kitchen staff can view and manage orders.</>
                }
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmKDSToggle}
                className={kdsToggleTarget?.currentEnabled 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
                }
              >
                {kdsToggleTarget?.currentEnabled ? "Disable" : "Enable"}
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
              <DialogTitle>Edit Restaurant Name</DialogTitle>
              <DialogDescription>Update the name for {editingRestaurant?.name}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-restaurant-name">Restaurant Name</Label>
                <Input
                  id="edit-restaurant-name"
                  value={newRestaurantName}
                  onChange={(e) => setNewRestaurantName(e.target.value)}
                  placeholder="Enter new name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditNameDialogOpen(false);
                setEditingRestaurant(null);
                setNewRestaurantName("");
              }}>
                Cancel
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
                Save
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
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Owner Account</DialogTitle>
              <DialogDescription>Update details for {editingOwner?.username || editingOwner?.email}.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-owner-display-name">Display Name</Label>
                <Input
                  id="edit-owner-display-name"
                  value={newOwnerDisplayName}
                  onChange={(e) => setNewOwnerDisplayName(e.target.value)}
                  placeholder="John Doe"
                />
                <p className="text-xs text-muted-foreground">Minimum 2 characters</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-owner-email">Email</Label>
                <Input
                  id="edit-owner-email"
                  type="email"
                  value={newOwnerEmail}
                  onChange={(e) => setNewOwnerEmail(e.target.value)}
                  placeholder="owner@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-owner-password">New Password (leave empty to keep current)</Label>
                <Input
                  id="edit-owner-password"
                  type="password"
                  value={newOwnerPassword}
                  onChange={(e) => setNewOwnerPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setEditOwnerDialogOpen(false);
                setEditingOwner(null);
                setNewOwnerEmail("");
                setNewOwnerPassword("");
                setNewOwnerDisplayName("");
              }}>
                Cancel
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
                    // Update display name if changed
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
                    
                    // Update email if changed
                    if (newOwnerEmail !== editingOwner.email) {
                      const { error: emailError } = await supabase.functions.invoke('system-admin-update-email', {
                        body: { user_id: editingOwner.id, new_email: newOwnerEmail },
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (emailError) throw emailError;
                    }
                    
                    // Update password if provided
                    if (newOwnerPassword) {
                      const { error: passError } = await supabase.functions.invoke('system-admin-reset-password', {
                        body: { user_id: editingOwner.id, new_password: newOwnerPassword },
                        headers: { Authorization: `Bearer ${accessToken}` },
                      });
                      if (passError) throw passError;
                    }
                    
                    queryClient.invalidateQueries({ queryKey: ['owners'] });
                    toast({ title: "Owner updated successfully" });
                    setEditOwnerDialogOpen(false);
                    setEditingOwner(null);
                    setNewOwnerEmail("");
                    setNewOwnerPassword("");
                    setNewOwnerDisplayName("");
                  } catch (error: any) {
                    toast({ title: "Error updating owner", description: error.message, variant: "destructive" });
                  } finally {
                    setUpdatingOwner(false);
                  }
                }} 
                disabled={updatingOwner || !newOwnerEmail.trim() || newOwnerDisplayName.trim().length < 2}
              >
                {updatingOwner ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
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
              <DialogTitle>Update Restaurant Logo</DialogTitle>
              <DialogDescription>Upload a new logo for this restaurant.</DialogDescription>
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
                    Change Logo
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
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
                Cancel
              </Button>
              <Button onClick={handleUpdateLogo} disabled={!logoFile || uploadingLogo}>
                {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Renew Subscription Dialog */}
        <Dialog open={renewDialogOpen} onOpenChange={(open) => {
          setRenewDialogOpen(open);
          if (!open) {
            setRenewTarget(null);
            setRenewPeriod("MONTHLY");
            setRenewBonusMonths(0);
            setRenewReason("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('sub_renew_title')}</DialogTitle>
              <DialogDescription>
                {t('sub_renew_desc')} <strong>{renewTarget?.name}</strong>. {t('sub_renew_start_note')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="renew-period">{t('sub_period')}</Label>
                <Select value={renewPeriod} onValueChange={(v) => setRenewPeriod(v as SubscriptionPeriod)}>
                  <SelectTrigger id="renew-period">
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
              
              <div className="space-y-2">
                <Label htmlFor="renew-bonus-months">{t('sub_bonus_months')}</Label>
                <Input
                  id="renew-bonus-months"
                  type="number"
                  min={0}
                  max={6}
                  value={renewBonusMonths}
                  onChange={(e) => setRenewBonusMonths(Math.min(Math.max(0, parseInt(e.target.value) || 0), 6))}
                />
                <p className="text-xs text-muted-foreground">{t('sub_bonus_months_max')}</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="renew-reason">{t('sub_reason')} ({t('optional')})</Label>
                <Textarea
                  id="renew-reason"
                  value={renewReason}
                  onChange={(e) => setRenewReason(e.target.value)}
                  placeholder={t('sub_reason_renew_placeholder')}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setRenewDialogOpen(false);
                setRenewTarget(null);
                setRenewPeriod("MONTHLY");
                setRenewBonusMonths(0);
                setRenewReason("");
              }}>
                {t('cancel')}
              </Button>
              <Button onClick={handleRenewSubscription} disabled={renewSubscription.isPending}>
                {renewSubscription.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('sub_renew_button')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}

