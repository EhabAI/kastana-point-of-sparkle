import { useState } from "react";
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOwnerRestaurant } from "@/hooks/useRestaurants";
import { useMenuCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useMenuCategories";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, MenuItem } from "@/hooks/useMenuItems";
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
  Package
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { BranchProvider } from "@/contexts/BranchContext";
import { CSVUpload } from "@/components/owner/CSVUpload";
import { TableManagement } from "@/components/owner/TableManagement";
import { StaffManagement } from "@/components/owner/StaffManagement";
import { RestaurantSettings } from "@/components/owner/RestaurantSettings";
import { DiscountSettings } from "@/components/owner/DiscountSettings";
import { BasicReports } from "@/components/owner/BasicReports";
import { ShiftsView } from "@/components/owner/ShiftsView";
import { DashboardOverview } from "@/components/owner/DashboardOverview";
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
import { SmartEndOfDaySummary } from "@/components/owner/SmartEndOfDaySummary";
import { SystemConfidenceScore } from "@/components/owner/SystemConfidenceScore";
import { SuggestedNextAction } from "@/components/owner/SuggestedNextAction";
import { MistakePatternDetector } from "@/components/owner/MistakePatternDetector";
import { KitchenDoneOrdersCard } from "@/components/owner/KitchenDoneOrdersCard";
import { TodayIncomeCard } from "@/components/owner/TodayIncomeCard";
import { useRestaurantTables } from "@/hooks/useRestaurantTables";
import { useCashiers } from "@/hooks/useCashiers";
import { useOwnerRestaurantSettings } from "@/hooks/useOwnerRestaurantSettings";
import { useInventoryEnabled } from "@/hooks/useInventoryEnabled";
import { formatJOD } from "@/lib/utils";

export default function OwnerAdmin() {
  const { role } = useAuth();
  const { t } = useLanguage();
  const { data: restaurant, isLoading: loadingRestaurant } = useOwnerRestaurant();
  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories(restaurant?.id);
  const { data: tables = [] } = useRestaurantTables(restaurant?.id);
  const { data: cashiers = [] } = useCashiers(restaurant?.id);
  const { data: settings } = useOwnerRestaurantSettings();
  const { isEnabled: inventoryEnabled } = useInventoryEnabled();
  const { toast } = useToast();
  const currency = settings?.currency || "JOD";


  if (loadingRestaurant) {
    return (
      <BranchProvider>
        <DashboardLayout title={t("owner_dashboard")}>
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DashboardLayout>
      </BranchProvider>
    );
  }

  if (!restaurant) {
    return (
      <BranchProvider>
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
      </BranchProvider>
    );
  }

  return (
    <BranchProvider>
      <DashboardLayout title={t("owner_dashboard")}>
        <div className="space-y-5 animate-fade-in">
        {/* Restaurant Header - Minimal & Professional */}
        <div className="flex items-center gap-3 pb-3 border-b border-border/30">
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`${restaurant.name} logo`}
              className="w-8 h-8 object-contain rounded-lg ring-1 ring-border/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center ring-1 ring-border/30">
              <Store className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <h2 className="text-base font-semibold text-foreground tracking-tight">{restaurant.name}</h2>
        </div>

        {/* Tabbed Navigation - Professional POS-style full-width tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <div className="sticky top-0 z-10 -mx-4 px-4 bg-background border-b border-border">
            <TabsList className="flex w-full h-12 bg-transparent p-0 gap-0 overflow-x-auto scrollbar-hide">
              <TabsTrigger 
                value="overview" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden sm:inline">{t("overview")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("analytics")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="reports" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">{t("reports")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="menu" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <UtensilsCrossed className="h-4 w-4" />
                <span className="hidden sm:inline">{t("menu")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="management" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">{t("manage")}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="branches" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">{t("branches")}</span>
              </TabsTrigger>
              {inventoryEnabled && (
                <TabsTrigger 
                  value="inventory" 
                  className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
                >
                  <Package className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("inventory")}</span>
                </TabsTrigger>
              )}
              <TabsTrigger 
                value="settings" 
                className="flex-1 min-w-[100px] h-full inline-flex items-center justify-center gap-2 px-4 text-sm font-medium text-muted-foreground bg-muted/30 hover:bg-muted/50 hover:text-foreground border-b-3 border-transparent data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:font-bold data-[state=active]:border-primary rounded-none transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">{t("settings")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab - Compact vertical rhythm */}
          <TabsContent value="overview" className="space-y-3 mt-3">
            {role === "owner" && (
              <DashboardOverview
                restaurantId={restaurant.id}
                tableCount={tables.length}
                staffCount={cashiers.length}
                currency={currency}
              />
            )}
            {/* Smart Features Row */}
            {role === "owner" && (
              <div className="space-y-3">
                <SmartEndOfDaySummary restaurantId={restaurant.id} currency={currency} />
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <SystemConfidenceScore restaurantId={restaurant.id} />
                  <SuggestedNextAction restaurantId={restaurant.id} />
                  <KitchenDoneOrdersCard restaurantId={restaurant.id} />
                  <TodayIncomeCard restaurantId={restaurant.id} currency={currency} />
                </div>
              </div>
            )}
            {role === "owner" && <MistakePatternDetector restaurantId={restaurant.id} />}
            {role === "owner" && <NotificationsAlerts />}
            {role === "owner" && <RefundVoidInsights />}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6 mt-6">
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
            {role === "owner" && <TableManagement restaurantId={restaurant.id} tableCount={tables.length} />}
            {role === "owner" && <StaffManagement restaurantId={restaurant.id} staffCount={cashiers.length} />}
          </TabsContent>

          {/* Branches Tab */}
          <TabsContent value="branches" className="space-y-6 mt-6">
            {role === "owner" && <BranchManagement restaurantId={restaurant.id} />}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-6 mt-6">
            {role === "owner" && inventoryEnabled && <InventoryDashboard restaurantId={restaurant.id} />}
            {role === "owner" && !inventoryEnabled && <InventoryDisabledCard />}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6 mt-6">
            {role === "owner" && <RestaurantSettings />}
            {role === "owner" && <PaymentMethodsSettings restaurantId={restaurant.id} />}
            {role === "owner" && <DiscountSettings />}
          </TabsContent>
        </Tabs>
        </div>
      </DashboardLayout>
    </BranchProvider>
  );
}

function CategoriesSection({
  restaurantId,
  categories,
  isLoading,
}: {
  restaurantId: string;
  categories: { id: string; name: string; is_active: boolean; sort_order: number }[];
  isLoading: boolean;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

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
      await updateCategory.mutateAsync({ id: editingCategory.id, name: editingCategory.name });
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
                    <span className="text-muted-foreground font-normal">({categories.length})</span>
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
        ) : categories.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("no_categories")}</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:shadow-md hover:bg-muted/70 border border-transparent hover:border-primary/20">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
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
                        onClick={() => setEditingCategory({ id: category.id, name: category.name })}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("edit_category")}</DialogTitle>
                        <DialogDescription>{t("update_category")}</DialogDescription>
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
  const { data: items = [], isLoading } = useMenuItems(restaurantId, selectedCategoryId || undefined);
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const { toast } = useToast();
  const { t } = useLanguage();
  // Use currency prop from restaurant_settings instead of hardcoded value
  const currencySymbol = currency;

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", is_offer: false });

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
      });
      setNewItem({ name: "", description: "", price: "", is_offer: false });
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
        {/* Category Selector */}
        <div className="mb-6">
          <Label className="mb-2 block">{t("select_category")}</Label>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder={t("choose_category")} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Items List */}
        {!selectedCategoryId ? (
          <p className="text-muted-foreground text-center py-8">{t("select_category_view")}</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">{t("no_items")}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:shadow-md hover:bg-muted/70 border border-transparent hover:border-primary/20">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.is_offer && <Flame className="h-4 w-4 text-warning" />}
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.is_offer && (
                      <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">{t("offer")}</span>
                    )}
                    {!item.is_available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">{t("unavailable")}</span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
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
    </Card>
  );
}
