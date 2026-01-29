import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBranchMenuItems, useUpdateBranchMenuItem, useBulkUpdateBranchMenuItems, useCopyBranchPrices, BranchMenuItemWithBase, PromoStatus } from "@/hooks/useBranchMenuItems";
import { useBranchContext } from "@/contexts/BranchContext";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  Tag, 
  Loader2, 
  ChevronDown, 
  ChevronRight,
  Edit2, 
  Flame, 
  Copy, 
  CheckSquare, 
  XSquare,
  Percent,
  DollarSign,
  AlertCircle,
  Search,
  Clock,
  Ban,
  CalendarClock,
  Info,
  CalendarDays
} from "lucide-react";
import { formatJOD } from "@/lib/utils";
import { format } from "date-fns";

interface BranchMenuItemsManagerProps {
  restaurantId: string;
  currency: string;
}

export function BranchMenuItemsManager({ restaurantId, currency }: BranchMenuItemsManagerProps) {
  const { t } = useLanguage();
  const { selectedBranch, branches, isBranchSelected } = useBranchContext();
  const { data: categories = [] } = useMenuCategories(restaurantId);
  const { data: items = [], isLoading } = useBranchMenuItems(selectedBranch?.id);
  const updateItem = useUpdateBranchMenuItem();
  const bulkUpdate = useBulkUpdateBranchMenuItems();
  const copyPrices = useCopyBranchPrices();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<BranchMenuItemWithBase | null>(null);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>("");
  const [copyPromos, setCopyPromos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const [editFormData, setEditFormData] = useState({
    price: "",
    promo_price: "",
    promo_label: "",
    promo_start: "",
    promo_end: "",
    promo_enabled: true,
  });

  const [promoFormData, setPromoFormData] = useState({
    promo_price: "",
    promo_label: "",
    promo_start: "",
    promo_end: "",
    promo_enabled: true,
  });

  // Helper to get promo status badge
  const getPromoStatusBadge = (status: PromoStatus) => {
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
      case 'disabled':
        return (
          <Badge variant="outline" className="text-xs gap-1 text-muted-foreground">
            <Ban className="h-3 w-3" />
            {t("promo_status_disabled")}
          </Badge>
        );
      default:
        return null;
    }
  };

  // Filter items by search query first, then by category
  const filteredItems = useMemo(() => {
    let result = items;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(item => 
        item.base_name.toLowerCase().includes(query)
      );
    }
    
    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(item => item.category_id === selectedCategory);
    }
    
    return result;
  }, [items, selectedCategory, searchQuery]);

  // Toggle category expansion
  const toggleCategory = (catId: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  };

  // Group items by category for display
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, BranchMenuItemWithBase[]> = {};
    filteredItems.forEach(item => {
      const catId = item.category_id;
      if (!grouped[catId]) grouped[catId] = [];
      grouped[catId].push(item);
    });
    return grouped;
  }, [filteredItems]);

  const getCategoryName = (catId: string) => {
    return categories.find(c => c.id === catId)?.name || t("uncategorized");
  };

  const toggleSelectItem = (itemId: string) => {
    setSelectedItems(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const selectAll = () => {
    setSelectedItems(filteredItems.map(i => i.menu_item_id));
  };

  const deselectAll = () => {
    setSelectedItems([]);
  };

  const handleBulkAvailability = async (available: boolean) => {
    if (!selectedBranch || selectedItems.length === 0) return;
    await bulkUpdate.mutateAsync({
      branchId: selectedBranch.id,
      itemIds: selectedItems,
      updates: { is_available: available },
    });
    setSelectedItems([]);
  };


  const handleApplyPromo = async () => {
    if (!selectedBranch || selectedItems.length === 0) return;
    await bulkUpdate.mutateAsync({
      branchId: selectedBranch.id,
      itemIds: selectedItems,
      updates: {
        promo_price: promoFormData.promo_price ? parseFloat(promoFormData.promo_price) : null,
        promo_label: promoFormData.promo_label || null,
        promo_start: promoFormData.promo_start || null,
        promo_end: promoFormData.promo_end || null,
        promo_enabled: promoFormData.promo_enabled,
      },
    });
    setPromoDialogOpen(false);
    setSelectedItems([]);
    setPromoFormData({ promo_price: "", promo_label: "", promo_start: "", promo_end: "", promo_enabled: true });
  };

  const handleCopyPrices = async () => {
    if (!selectedBranch || !sourceBranchId) return;
    await copyPrices.mutateAsync({
      sourceBranchId,
      targetBranchId: selectedBranch.id,
      copyPromos,
    });
    setCopyDialogOpen(false);
    setSourceBranchId("");
    setCopyPromos(false);
  };

  const openEditDialog = (item: BranchMenuItemWithBase) => {
    setEditingItem(item);
    setEditFormData({
      price: item.price?.toString() || "",
      promo_price: item.promo_price?.toString() || "",
      promo_label: item.promo_label || "",
      promo_start: item.promo_start ? new Date(item.promo_start).toISOString().slice(0, 16) : "",
      promo_end: item.promo_end ? new Date(item.promo_end).toISOString().slice(0, 16) : "",
      promo_enabled: item.promo_enabled !== false,
    });
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    await updateItem.mutateAsync({
      id: editingItem.id,
      price: editFormData.price ? parseFloat(editFormData.price) : null,
      promo_price: editFormData.promo_price ? parseFloat(editFormData.promo_price) : null,
      promo_label: editFormData.promo_label || null,
      promo_start: editFormData.promo_start || null,
      promo_end: editFormData.promo_end || null,
      promo_enabled: editFormData.promo_enabled,
    });
    setEditingItem(null);
  };

  const handleToggleAvailable = async (item: BranchMenuItemWithBase) => {
    await updateItem.mutateAsync({
      id: item.id,
      is_available: !item.is_available,
    });
  };


  if (!isBranchSelected) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t("select_branch_first")}</h3>
          <p className="text-muted-foreground">{t("select_branch_to_manage")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-start">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {t("branch_prices_promos")}
                    <Badge variant="outline">{selectedBranch?.name}</Badge>
                  </CardTitle>
                  <CardDescription>{t("manage_prices_promos")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCopyDialogOpen(true)}
                disabled={branches.length < 2}
              >
                <Copy className="h-4 w-4 me-2" />
                {t("copy_from_branch")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
              {/* Search Input */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={t("search_items")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t("all_categories")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all_categories")}</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{selectedItems.length} {t("selected")}</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAvailability(true)}>
                    <CheckSquare className="h-4 w-4 me-1" />
                    {t("available")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAvailability(false)}>
                    <XSquare className="h-4 w-4 me-1" />
                    {t("unavailable")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPromoDialogOpen(true)}>
                    <Percent className="h-4 w-4 me-1" />
                    {t("promo")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>{t("deselect")}</Button>
                </div>
              )}

              {selectedItems.length === 0 && filteredItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  {t("select_all")} ({filteredItems.length})
                </Button>
              )}
            </div>

            {/* Items List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("no_items")}</p>
            ) : (
              <div className="space-y-4">
                {Object.entries(itemsByCategory).map(([catId, catItems]) => {
                  const isExpanded = expandedCategories.has(catId);
                  return (
                    <div key={catId} className="border rounded-lg overflow-hidden">
                      {/* Category Header - Collapsible */}
                      <button
                        onClick={() => toggleCategory(catId)}
                        className="w-full flex items-center justify-between p-3 bg-muted/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-semibold">{getCategoryName(catId)}</span>
                          <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>
                        </div>
                      </button>
                      
                      {/* Category Items */}
                      {isExpanded && (
                        <div className="p-2 space-y-2">
                          {catItems.map(item => (
                            <div
                              key={item.id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                !item.is_available ? "opacity-60 bg-muted/30" : "bg-background"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <Checkbox
                                  checked={selectedItems.includes(item.menu_item_id)}
                                  onCheckedChange={() => toggleSelectItem(item.menu_item_id)}
                                />
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium">{item.base_name}</span>
                                    {getPromoStatusBadge(item.promo_status)}
                                    {item.promo_status === 'active' && item.promo_label && (
                                      <span className="text-xs text-muted-foreground">({item.promo_label})</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {item.is_promo_active ? (
                                      <>
                                        <span className="line-through">{formatJOD(item.price ?? (item.menu_item?.price || 0))}</span>
                                        <span className="text-destructive font-semibold">{formatJOD(item.promo_price || 0)} {currency}</span>
                                      </>
                                    ) : (
                                      <span>{formatJOD(item.effective_price)} {currency}</span>
                                    )}
                                    {item.price !== null && item.price !== item.menu_item?.price && (
                                      <Badge variant="outline" className="text-xs">{t("custom_price")}</Badge>
                                    )}
                                  </div>
                                  {/* Show promo time range if scheduled or expired */}
                                  {(item.promo_status === 'scheduled' || item.promo_status === 'expired' || item.promo_status === 'active') && (item.promo_start || item.promo_end) && (
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                      <CalendarDays className="h-3 w-3" />
                                      {item.promo_start && (
                                        <span>{format(new Date(item.promo_start), "dd/MM/yyyy HH:mm")}</span>
                                      )}
                                      {item.promo_start && item.promo_end && <span>→</span>}
                                      {item.promo_end && (
                                        <span>{format(new Date(item.promo_end), "dd/MM/yyyy HH:mm")}</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {/* Available/Unavailable - Single Toggle */}
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={item.is_available}
                                    onCheckedChange={() => handleToggleAvailable(item)}
                                  />
                                  <span className={`text-sm font-medium ${item.is_available ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                                    {item.is_available ? t("available") : t("unavailable")}
                                  </span>
                                </div>
                                
                                <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("edit_item")} - {editingItem?.base_name}</DialogTitle>
            <DialogDescription>
              {t("base_price")}: {formatJOD(editingItem?.menu_item?.price || 0)} {currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                {t("branch_price")}
              </Label>
              <Input
                type="number"
                step="0.001"
                value={editFormData.price}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                placeholder={editingItem?.menu_item?.price?.toString()}
              />
            </div>
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Flame className="h-4 w-4 text-destructive" />
                  {t("promo_settings")}
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
                      <p>{t("promo_visibility_hint")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="space-y-3">
                {/* Promo Enabled Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium">{t("promo_enabled")}</Label>
                    <p className="text-xs text-muted-foreground">{t("promo_enabled_desc")}</p>
                  </div>
                  <Switch
                    checked={editFormData.promo_enabled}
                    onCheckedChange={(checked) => setEditFormData({ ...editFormData, promo_enabled: checked })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("promo_price")}</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={editFormData.promo_price}
                    onChange={(e) => setEditFormData({ ...editFormData, promo_price: e.target.value })}
                    placeholder={t("promo_price")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("promo_label")}</Label>
                  <Input
                    value={editFormData.promo_label}
                    onChange={(e) => setEditFormData({ ...editFormData, promo_label: e.target.value })}
                    placeholder={t("promo_label_placeholder")}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("promo_start")}</Label>
                    <Input
                      type="datetime-local"
                      value={editFormData.promo_start}
                      onChange={(e) => setEditFormData({ ...editFormData, promo_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("promo_end")}</Label>
                    <Input
                      type="datetime-local"
                      value={editFormData.promo_end}
                      onChange={(e) => setEditFormData({ ...editFormData, promo_end: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>{t("cancel")}</Button>
            <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
              {updateItem.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Promo Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{t("apply_promo")} - {selectedItems.length} {t("selected")}</DialogTitle>
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors me-6">
                      <Clock className="h-4 w-4" />
                      <Info className="h-3 w-3" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[250px] text-xs">
                    <p>{t("promo_visibility_hint")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Promo Enabled Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{t("promo_enabled")}</Label>
                <p className="text-xs text-muted-foreground">{t("promo_enabled_desc")}</p>
              </div>
              <Switch
                checked={promoFormData.promo_enabled}
                onCheckedChange={(checked) => setPromoFormData({ ...promoFormData, promo_enabled: checked })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("promo_price")}</Label>
              <Input
                type="number"
                step="0.01"
                value={promoFormData.promo_price}
                onChange={(e) => setPromoFormData({ ...promoFormData, promo_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("promo_label")}</Label>
              <Input
                value={promoFormData.promo_label}
                onChange={(e) => setPromoFormData({ ...promoFormData, promo_label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("promo_start")}</Label>
                <Input
                  type="datetime-local"
                  value={promoFormData.promo_start}
                  onChange={(e) => setPromoFormData({ ...promoFormData, promo_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("promo_end")}</Label>
                <Input
                  type="datetime-local"
                  value={promoFormData.promo_end}
                  onChange={(e) => setPromoFormData({ ...promoFormData, promo_end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleApplyPromo} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("apply_promo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Prices Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("copy_prices")}</DialogTitle>
            <DialogDescription>
              {t("copy_prices_from_branch")} - {selectedBranch?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t("source_branch")}</Label>
              <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder={t("select_source_branch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches
                    .filter(b => b.id !== selectedBranch?.id)
                    .map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="copy-promos"
                checked={copyPromos}
                onCheckedChange={(checked) => setCopyPromos(!!checked)}
              />
              <Label htmlFor="copy-promos">{t("include_promos")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleCopyPrices} disabled={!sourceBranchId || copyPrices.isPending}>
              {copyPrices.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
              {t("copy_prices")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
