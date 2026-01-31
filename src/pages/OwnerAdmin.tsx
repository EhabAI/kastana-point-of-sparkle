import { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRestaurantContext } from "@/contexts/RestaurantContext";
import { useMenuCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useMenuCategories";
import { useMenuItems, useAllMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, MenuItem } from "@/hooks/useMenuItems";
import { useBranchMenuItems } from "@/hooks/useBranchMenuItems";
import { 
  Store, 
  Loader2, 
  Plus, 
  Edit2, 
  Trash2, 
  FolderOpen, 
  Tag, 
  Flame, 
  ChevronDown,
  LayoutDashboard,
  BarChart3,
  FileText,
  UtensilsCrossed,
  Users,
  Settings,
  Building2,
  ScrollText,
  Star,
  Package,
  Search,
  AlertTriangle,
  Clock,
  CalendarClock,
  Info,
  Ban
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BranchProvider, useBranchContext } from "@/contexts/BranchContext";
import { CSVUpload } from "@/components/owner/CSVUpload";
import { TableManagement } from "@/components/owner/TableManagement";
import { ComboItemsDialog } from "@/components/owner/ComboItemsDialog";
import { StaffManagement } from "@/components/owner/StaffManagement";
import { RestaurantSettings } from "@/components/owner/RestaurantSettings";
import { DiscountSettings } from "@/components/owner/DiscountSettings";
import { BasicReports } from "@/components/owner/BasicReports";
import { ShiftsView } from "@/components/owner/ShiftsView";

import { ReportsModule } from "@/components/owner/ReportsModule";
import { AnalyticsCharts } from "@/components/owner/AnalyticsCharts";
import { BestWorstSellers } from "@/components/owner/BestWorstSellers";
import { CashierPerformance } from "@/components/owner/CashierPerformance";
import { NotificationsAlerts } from "@/components/owner/NotificationsAlerts";
import { RefundVoidInsights } from "@/components/owner/RefundVoidInsights";
import { BranchSelector } from "@/components/owner/BranchSelector";
import { BranchManagement } from "@/components/owner/BranchManagement";
import { BranchMenuItemsManager } from "@/components/owner/BranchMenuItemsManager";
import { PaymentMethodsSettings } from "@/components/owner/PaymentMethodsSettings";
import { AuditLogViewer } from "@/components/owner/AuditLogViewer";
import { KitchenPerformance } from "@/components/owner/KitchenPerformance";
import { MenuLanguageGuidance } from "@/components/owner/MenuLanguageGuidance";
import { InventoryDashboard } from "@/components/owner/InventoryDashboard";
import { InventoryDisabledCard } from "@/components/owner/InventoryDisabledCard";
import { DailySummaryCard } from "@/components/owner/DailySummaryCard";
import { CashDifferencesCard } from "@/components/owner/CashDifferencesCard";
import { SuggestedNextAction } from "@/components/owner/SuggestedNextAction";
import { MistakePatternDetector } from "@/components/owner/MistakePatternDetector";
import { OperationalInsightsCard } from "@/components/owner/OperationalInsightsCard";
import { OwnerChangesBanner } from "@/components/owner/OwnerChangesBanner";
import { WhatChangedCard } from "@/components/owner/WhatChangedCard";
import { OwnerNotificationsCard } from "@/components/owner/OwnerNotificationsCard";
import { OwnerNotificationToasts } from "@/components/owner/OwnerNotificationToasts";

import { InventoryRiskCard } from "@/components/owner/InventoryRiskCard";
import { OffersStatusCard } from "@/components/owner/OffersStatusCard";
import { AssistantBranchSync } from "@/components/owner/AssistantBranchSync";
import { useRestaurantTables } from "@/hooks/useRestaurantTables";
import { useCashiers } from "@/hooks/useCashiers";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";
import { formatJOD } from "@/lib/utils";

export default function OwnerAdmin() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { selectedRestaurant: restaurant, isLoading: loadingRestaurant } = useRestaurantContext();
  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories(restaurant?.id);
  const { data: tables = [] } = useRestaurantTables(restaurant?.id);
  const { data: cashiers = [] } = useCashiers(restaurant?.id);
  const { data: settings } = useOwnerRestaurantSettings();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  const { toast } = useToast();
  const currency = settings?.currency || "JOD";
  
  // Controlled tab state for training navigation
  const [activeTab, setActiveTab] = useState("overview");
  
  // Listen for training navigation events
  useEffect(() => {
    const handleTrainingNavigate = (event: CustomEvent<{ tab: string }>) => {
      if (event.detail?.tab) {
        setActiveTab(event.detail.tab);
      }
    };
    
    window.addEventListener("owner-training-navigate", handleTrainingNavigate as EventListener);
    return () => {
      window.removeEventListener("owner-training-navigate", handleTrainingNavigate as EventListener);
    };
  }, []);


  if (loadingRestaurant) {
    return (
      <DashboardLayout title={t("owner_dashboard")}>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout title={t("owner_dashboard")}>
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">{t("no_restaurant")}</h2>
            <p className="text-muted-foreground">
              {t("no_restaurant_desc")}
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={t("owner_dashboard")}>
      {/* Sync branch context to Smart Assistant */}
      <AssistantBranchSync />
      {/* Toast notifications listener for owner */}
      <OwnerNotificationToasts />
      <div className="space-y-3 animate-fade-in">

      {/* Tabbed Navigation - Professional POS-style full-width tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="sticky top-9 z-10 -mx-4 px-4 bg-background border-b border-border">
          <TabsList className="flex w-full h-10 bg-transparent p-0 gap-0 overflow-x-auto scrollbar-hide">
            <TabsTrigger 
              value="overview" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <LayoutDashboard className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("overview")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="analytics" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <BarChart3 className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("analytics")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <FileText className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("reports")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="menu" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <UtensilsCrossed className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("menu")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="management" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <Users className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("manage")}</span>
            </TabsTrigger>
            <TabsTrigger 
              value="branches" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <Building2 className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("branches")}</span>
            </TabsTrigger>
            {inventoryEnabled && (
              <TabsTrigger 
                value="inventory" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
              >
                <Package className="h-5 w-5 shrink-0" />
                <span className="hidden sm:inline">{t("inventory")}</span>
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="settings" 
              className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/40 border-b-[3px] border-transparent rounded-none transition-all duration-200 ease-out hover:bg-primary/10 hover:text-primary hover:border-primary/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:font-bold data-[state=active]:border-primary data-[state=active]:hover:bg-primary"
            >
              <Settings className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{t("settings")}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab - Compact vertical rhythm with reduced spacing */}
        <TabsContent value="overview" className="space-y-2 mt-1.5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {/* Owner Notifications Card - Important notifications from System Admin */}
          {role === "owner" && <OwnerNotificationsCard />}
          {/* Owner Changes Banner - informational only */}
          {role === "owner" && <OwnerChangesBanner restaurantId={restaurant.id} />}
          {/* Smart Features Row */}
          {role === "owner" && (
            <div className="space-y-2">
              {/* Main dashboard grid: Daily Summary left, Cash + Inventory stacked right */}
              <div className="grid gap-2 grid-cols-1 lg:grid-cols-2">
                <DailySummaryCard restaurantId={restaurant.id} currency={currency} />
                <div className="flex flex-col gap-1.5">
                  <CashDifferencesCard restaurantId={restaurant.id} currency={currency} compact />
                  <WhatChangedCard restaurantId={restaurant.id} />
                  <InventoryRiskCard 
                    restaurantId={restaurant.id} 
                    inventoryEnabled={inventoryEnabled}
                  />
                  <OffersStatusCard restaurantId={restaurant.id} />
                </div>
              </div>
            </div>
          )}
          {role === "owner" && <OperationalInsightsCard restaurantId={restaurant.id} />}
          {role === "owner" && <MistakePatternDetector restaurantId={restaurant.id} />}
          {role === "owner" && <NotificationsAlerts />}
          {role === "owner" && <RefundVoidInsights />}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {role === "owner" && <KitchenPerformance />}
          {role === "owner" && <AnalyticsCharts />}
          {role === "owner" && <BestWorstSellers />}
          {role === "owner" && <CashierPerformance />}
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4">
          {role === "owner" && <ReportsModule />}
          {role === "owner" && <AuditLogViewer />}
        </TabsContent>

        {/* Menu Tab */}
        <TabsContent value="menu" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {role === "owner" && <CSVUpload restaurantId={restaurant.id} />}
          <CategoriesSection restaurantId={restaurant.id} categories={categories} isLoading={loadingCategories} />
          <MenuItemsSection restaurantId={restaurant.id} categories={categories} currency={currency} />
          <BranchMenuItemsManager restaurantId={restaurant.id} currency={currency} />
        </TabsContent>

        {/* Management Tab */}
        <TabsContent value="management" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {role === "owner" && <TableManagement restaurantId={restaurant.id} />}
          {role === "owner" && <StaffManagement restaurantId={restaurant.id} />}
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-6 mt-6">
          {role === "owner" && <BranchManagement restaurantId={restaurant.id} />}
        </TabsContent>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {role === "owner" && inventoryEnabled && <InventoryDashboard restaurantId={restaurant.id} currency={currency} />}
          {role === "owner" && !inventoryEnabled && <InventoryDisabledCard />}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6 mt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <BranchSelector />
          </div>
          {role === "owner" && <RestaurantSettings />}
          {role === "owner" && <PaymentMethodsSettings restaurantId={restaurant.id} />}
          {role === "owner" && <DiscountSettings />}
        </TabsContent>
      </Tabs>
      </div>
    </DashboardLayout>
  );
}

function CategoriesSection({
  restaurantId,
  categories,
  isLoading,
}: {
  restaurantId: string;
  categories: { id: string; name: string; is_active: boolean; sort_order: number; promo_start?: string | null; promo_end?: string | null; promo_status?: string }[];
  isLoading: boolean;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { selectedBranch, isBranchSelected } = useBranchContext();
  const { data: branchItems = [] } = useBranchMenuItems(selectedBranch?.id);

  // Create a set of category IDs that have items in the selected branch
  const branchCategoryIds = useMemo(() => {
    return new Set(branchItems.map(item => item.category_id));
  }, [branchItems]);
  
  // Filter categories by those that have items in the selected branch
  const filteredCategories = useMemo(() => {
    if (!isBranchSelected || branchCategoryIds.size === 0) {
      return categories;
    }
    return categories.filter(cat => branchCategoryIds.has(cat.id));
  }, [categories, isBranchSelected, branchCategoryIds]);

  const [newCategoryName, setNewCategoryName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ 
    id: string; 
    name: string;
    promo_start: string;
    promo_end: string;
    promo_status: string;
  } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Check if a category is the "العروض" (Offers) category
  const isOfferCategory = (name: string) => {
    return name === "العروض" || name.toLowerCase() === "offers";
  };

  // Get promo status badge for offers category
  const getCategoryPromoStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="destructive" className="text-xs gap-1">
            <Flame className="h-3 w-3" />
            {t("promo_status_active")}
          </Badge>
        );
      case 'scheduled':
        return (
          <Badge variant="default" className="text-xs gap-1 bg-blue-500 hover:bg-blue-600">
            <CalendarClock className="h-3 w-3" />
            {t("promo_status_scheduled")}
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="secondary" className="text-xs gap-1 text-muted-foreground">
            <Clock className="h-3 w-3" />
            {t("promo_status_expired")}
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    try {
      await createCategory.mutateAsync({ restaurantId, name: newCategoryName });
      setNewCategoryName("");
      setCreateDialogOpen(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    try {
      await updateCategory.mutateAsync({ 
        id: editingCategory.id, 
        name: editingCategory.name,
        promo_start: editingCategory.promo_start || null,
        promo_end: editingCategory.promo_end || null,
      });
      setEditingCategory(null);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateCategory.mutateAsync({ id, is_active: !currentActive });
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm(t("confirm_delete_category"))) {
      try {
        await deleteCategory.mutateAsync(id);
      } catch {
        toast({ title: t("error_unexpected"), variant: "destructive" });
      }
    }
  };

  const openEditDialog = (category: typeof categories[0]) => {
    setEditingCategory({
      id: category.id,
      name: category.name,
      promo_start: category.promo_start ? new Date(category.promo_start).toISOString().slice(0, 16) : "",
      promo_end: category.promo_end ? new Date(category.promo_end).toISOString().slice(0, 16) : "",
      promo_status: category.promo_status || 'none',
    });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "ltr:-rotate-90 rtl:rotate-90"}`} />
                <div className="text-start">
                  <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="h-5 w-5" />
                    {t("menu_categories")}
                    <span className="text-muted-foreground font-normal">({filteredCategories.length})</span>
                    {selectedBranch && (
                      <Badge variant="outline" className="font-normal">{selectedBranch.name}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{t("organize_menu")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("add_category")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("create_category")}</DialogTitle>
                  <DialogDescription>{t("add_new_category")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name" className="flex items-center">
                      {t("category_name")}
                      <MenuLanguageGuidance variant="tooltip" />
                    </Label>
                    <Input
                      id="category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <MenuLanguageGuidance variant="inline" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    {t("cancel")}
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={createCategory.isPending}>
                    {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
                    {t("create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredCategories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("no_categories")}</p>
        ) : (
          <div className="space-y-3">
            {filteredCategories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:shadow-md hover:bg-muted/70 border border-transparent hover:border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    {isOfferCategory(category.name) ? (
                      <Flame className="h-4 w-4 text-destructive" />
                    ) : (
                      <FolderOpen className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{category.name}</p>
                      {isOfferCategory(category.name) && category.promo_status && category.promo_status !== 'none' && (
                        getCategoryPromoStatusBadge(category.promo_status)
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{category.is_active ? t("active") : t("inactive")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={category.is_active}
                    onCheckedChange={() => handleToggleActive(category.id, category.is_active)}
                  />
                  <Dialog
                    open={editingCategory?.id === category.id}
                    onOpenChange={(open) => !open && setEditingCategory(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(category)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <DialogTitle>{t("edit_category")}</DialogTitle>
                            <DialogDescription>{t("update_category")}</DialogDescription>
                          </div>
                          {/* Show status badge for offers category */}
                          {isOfferCategory(category.name) && editingCategory?.promo_status && editingCategory.promo_status !== 'none' && (
                            <div className="me-6">
                              {getCategoryPromoStatusBadge(editingCategory.promo_status)}
                            </div>
                          )}
                        </div>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-category-name">{t("category_name")}</Label>
                          <Input
                            id="edit-category-name"
                            value={editingCategory?.name || ""}
                            onChange={(e) =>
                              setEditingCategory((prev) => (prev ? { ...prev, name: e.target.value } : null))
                            }
                          />
                        </div>
                        
                        {/* Offer Duration - Only for Offers category */}
                        {isOfferCategory(category.name) && (
                          <div className="border-t pt-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-medium flex items-center gap-2">
                                <Flame className="h-4 w-4 text-destructive" />
                                {t("offers_duration")}
                              </h4>
                              <TooltipProvider delayDuration={200}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
                                      <Clock className="h-4 w-4" />
                                      <Info className="h-3 w-3" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="max-w-[250px] text-xs">
                                    <p>{t("category_offers_visibility_hint")}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>{t("offer_start_date")}</Label>
                                  <Input
                                    type="datetime-local"
                                    value={editingCategory?.promo_start || ""}
                                    onChange={(e) =>
                                      setEditingCategory((prev) => (prev ? { ...prev, promo_start: e.target.value } : null))
                                    }
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>{t("offer_end_date")}</Label>
                                  <Input
                                    type="datetime-local"
                                    value={editingCategory?.promo_end || ""}
                                    onChange={(e) =>
                                      setEditingCategory((prev) => (prev ? { ...prev, promo_end: e.target.value } : null))
                                    }
                                  />
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">{t("category_offers_dates_hint")}</p>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingCategory(null)}>
                          {t("cancel")}
                        </Button>
                        <Button onClick={handleUpdateCategory} disabled={updateCategory.isPending}>
                          {updateCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
                          {t("save")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function MenuItemsSection({
  restaurantId,
  categories,
  currency,
}: {
  restaurantId: string;
  categories: { id: string; name: string }[];
  currency: string;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [itemSearch, setItemSearch] = useState("");
  const { selectedBranch, isBranchSelected } = useBranchContext();
  const { data: allItems = [], isLoading: isLoadingAll } = useAllMenuItems(restaurantId);
  const { data: categoryItems = [], isLoading: isLoadingCategory } = useMenuItems(restaurantId, selectedCategoryId || undefined);
  const { data: branchItems = [] } = useBranchMenuItems(selectedBranch?.id);
  
  // Create a set of menu item IDs that exist in the selected branch
  const branchItemIds = useMemo(() => {
    return new Set(branchItems.map(item => item.menu_item_id));
  }, [branchItems]);
  
  // Use all items when searching, category items when category is selected without search
  const isSearching = itemSearch.trim().length > 0;
  const baseItems = isSearching ? allItems : categoryItems;
  const isLoading = isSearching ? isLoadingAll : isLoadingCategory;
  
  const filteredItems = useMemo(() => {
    let result = baseItems;
    
    // Filter by branch if selected
    if (isBranchSelected && branchItemIds.size > 0) {
      result = result.filter((item) => branchItemIds.has(item.id));
    }
    
    // Filter by search term
    if (itemSearch.trim()) {
      const query = itemSearch.toLowerCase().trim();
      result = result.filter((item) => item.name.toLowerCase().includes(query));
    }
    
    // If searching and a category is selected, also filter by category
    if (isSearching && selectedCategoryId) {
      result = result.filter((item) => item.category_id === selectedCategoryId);
    }
    
    return result;
  }, [baseItems, itemSearch, isSearching, selectedCategoryId, isBranchSelected, branchItemIds]);
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const { toast } = useToast();
  const { t } = useLanguage();
  // Use currency prop from restaurant_settings instead of hardcoded value
  const currencySymbol = currency;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [managingComboItem, setManagingComboItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", is_offer: false, item_type: "food" as MenuItem["item_type"] });

  const handleCreateItem = async () => {
    if (!selectedCategoryId) {
      toast({ title: t("select_category_first"), variant: "destructive" });
      return;
    }
    if (!newItem.name.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    try {
      const price = parseFloat(newItem.price) || 0;
      await createItem.mutateAsync({
        category_id: selectedCategoryId,
        name: newItem.name,
        description: newItem.description || undefined,
        price,
        is_offer: newItem.is_offer,
        item_type: newItem.item_type,
      });
      setNewItem({ name: "", description: "", price: "", is_offer: false, item_type: "food" });
      setCreateDialogOpen(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    try {
      await updateItem.mutateAsync({
        id: editingItem.id,
        name: editingItem.name,
        description: editingItem.description,
        price: editingItem.price,
        is_available: editingItem.is_available,
        is_offer: editingItem.is_offer,
        item_type: editingItem.item_type,
      });
      setEditingItem(null);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm(t("confirm_delete_item"))) {
      try {
        await deleteItem.mutateAsync(id);
      } catch {
        toast({ title: t("error_unexpected"), variant: "destructive" });
      }
    }
  };

  return (
    <Card className="shadow-card hover-lift">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t("menu_items")}
              {selectedBranch && (
                <Badge variant="outline" className="font-normal">{selectedBranch.name}</Badge>
              )}
            </CardTitle>
            <CardDescription>{t("manage_menu_items")}</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!selectedCategoryId}>
                <Plus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("add_item")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("create_menu_item")}</DialogTitle>
                <DialogDescription>{t("add_new_item")}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name" className="flex items-center">
                    {t("name")}
                    <MenuLanguageGuidance variant="tooltip" />
                  </Label>
                  <Input
                    id="item-name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-description">{t("description_optional")}</Label>
                  <Input
                    id="item-description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-price">{t("price")}</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.001"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="0.000"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-type">{t("item_type")}</Label>
                  <Select
                    value={newItem.item_type}
                    onValueChange={(value: MenuItem["item_type"]) => setNewItem({ ...newItem, item_type: value })}
                  >
                    <SelectTrigger id="item-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="drink">{t("item_type_drink")}</SelectItem>
                      <SelectItem value="food">{t("item_type_food")}</SelectItem>
                      <SelectItem value="ready_product">{t("item_type_ready_product")}</SelectItem>
                      <SelectItem value="addon">{t("item_type_addon")}</SelectItem>
                      <SelectItem value="service">{t("item_type_service")}</SelectItem>
                      <SelectItem value="combo">{t("item_type_combo")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="item-offer"
                    checked={newItem.is_offer}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, is_offer: checked })}
                  />
                  <Label htmlFor="item-offer">{t("mark_as_offer")}</Label>
                </div>
                <MenuLanguageGuidance variant="inline" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                  {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
                  {t("create")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search & Category Selector */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 sm:max-w-64">
            <Label className="mb-2 block">{t("search")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_menu_items") || "Search items..."}
                value={itemSearch}
                onChange={(e) => setItemSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex-1 sm:max-w-64">
            <Label className="mb-2 block">{t("select_category")}</Label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={isSearching ? t("all_categories") || "All categories" : t("choose_category")} />
              </SelectTrigger>
              <SelectContent>
                {isSearching && (
                  <SelectItem value="">{t("all_categories") || "All categories"}</SelectItem>
                )}
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Items List */}
        {!selectedCategoryId && !isSearching ? (
          <p className="text-muted-foreground text-center py-8">{t("select_category_view") || "Select a category or search for items"}</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredItems.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            {itemSearch ? t("no_search_results") || "No items match your search" : t("no_items")}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:shadow-md hover:bg-muted/70 border border-transparent hover:border-primary/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.is_offer && <Flame className="h-4 w-4 text-warning" />}
                    <p className="font-medium text-foreground">{item.name}</p>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                      {t(`item_type_${item.item_type}`)}
                    </span>
                    {item.is_offer && (
                      <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">{t("offer")}</span>
                    )}
                    {!item.is_available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{t("unavailable")}</span>
                    )}
                    {/* Arabic name warning - show when description is empty */}
                    {(!item.description || item.description.trim() === "") && (
                      <span 
                        className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded flex items-center gap-1 cursor-help"
                        title={t("missing_arabic_name_tooltip")}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {t("missing_arabic_name")}
                      </span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  {/* Show helper text for missing Arabic name */}
                  {(!item.description || item.description.trim() === "") && (
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5 italic">
                      {t("missing_arabic_name_warning")}
                    </p>
                  )}
                  <p className="text-sm font-medium text-primary mt-1">{currencySymbol} {formatJOD(Number(item.price))}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => updateItem.mutate({ id: item.id, is_favorite: !item.is_favorite })}
                    title={t("mark_as_favorite")}
                  >
                    <Star
                      className={`h-4 w-4 ${item.is_favorite ? "fill-warning text-warning" : "text-muted-foreground"}`}
                    />
                  </Button>
                  <Switch
                    checked={item.is_available}
                    onCheckedChange={(checked) => updateItem.mutate({ id: item.id, is_available: checked })}
                  />
                  {item.item_type === "combo" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setManagingComboItem(item)}
                      title={t("manage_combo")}
                    >
                      <Package className="h-4 w-4 text-primary" />
                    </Button>
                  )}
                  <Dialog open={editingItem?.id === item.id} onOpenChange={(open) => !open && setEditingItem(null)}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => setEditingItem(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("edit_menu_item")}</DialogTitle>
                        <DialogDescription>{t("update_item")}</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>{t("name")}</Label>
                          <Input
                            value={editingItem?.name || ""}
                            onChange={(e) =>
                              setEditingItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("description")}</Label>
                          <Input
                            value={editingItem?.description || ""}
                            onChange={(e) =>
                              setEditingItem((prev) => (prev ? { ...prev, description: e.target.value } : null))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("price")}</Label>
                          <Input
                            type="number"
                            step="0.001"
                            value={editingItem?.price || 0}
                            onChange={(e) =>
                              setEditingItem((prev) =>
                                prev ? { ...prev, price: parseFloat(e.target.value) || 0 } : null,
                              )
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{t("item_type")}</Label>
                          <Select
                            value={editingItem?.item_type || "food"}
                            onValueChange={(value: MenuItem["item_type"]) =>
                              setEditingItem((prev) => (prev ? { ...prev, item_type: value } : null))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="drink">{t("item_type_drink")}</SelectItem>
                              <SelectItem value="food">{t("item_type_food")}</SelectItem>
                              <SelectItem value="ready_product">{t("item_type_ready_product")}</SelectItem>
                              <SelectItem value="addon">{t("item_type_addon")}</SelectItem>
                              <SelectItem value="service">{t("item_type_service")}</SelectItem>
                              <SelectItem value="combo">{t("item_type_combo")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={editingItem?.is_offer || false}
                            onCheckedChange={(checked) =>
                              setEditingItem((prev) => (prev ? { ...prev, is_offer: checked } : null))
                            }
                          />
                          <Label>{t("mark_as_offer")}</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                          {t("cancel")}
                        </Button>
                        <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
                          {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
                          {t("save")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Combo Items Dialog */}
      {managingComboItem && (
        <ComboItemsDialog
          comboItem={managingComboItem}
          allMenuItems={allItems}
          open={!!managingComboItem}
          onOpenChange={(open) => !open && setManagingComboItem(null)}
          currency={currencySymbol}
        />
      )}
    </Card>
  );
}
