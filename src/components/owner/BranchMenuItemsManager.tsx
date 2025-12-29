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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBranchMenuItems, useUpdateBranchMenuItem, useBulkUpdateBranchMenuItems, useCopyBranchPrices, BranchMenuItemWithBase } from "@/hooks/useBranchMenuItems";
import { useBranchContext } from "@/contexts/BranchContext";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { 
  Tag, 
  Loader2, 
  ChevronDown, 
  Edit2, 
  Flame, 
  Copy, 
  CheckSquare, 
  XSquare,
  Percent,
  DollarSign,
  AlertCircle
} from "lucide-react";

interface BranchMenuItemsManagerProps {
  restaurantId: string;
  currency: string;
}

export function BranchMenuItemsManager({ restaurantId, currency }: BranchMenuItemsManagerProps) {
  const { selectedBranch, branches, isBranchSelected } = useBranchContext();
  const { data: categories = [] } = useMenuCategories(restaurantId);
  const { data: items = [], isLoading } = useBranchMenuItems(selectedBranch?.id);
  const updateItem = useUpdateBranchMenuItem();
  const bulkUpdate = useBulkUpdateBranchMenuItems();
  const copyPrices = useCopyBranchPrices();

  const [isOpen, setIsOpen] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<BranchMenuItemWithBase | null>(null);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [sourceBranchId, setSourceBranchId] = useState<string>("");
  const [copyPromos, setCopyPromos] = useState(false);

  const [editFormData, setEditFormData] = useState({
    price: "",
    promo_price: "",
    promo_label: "",
    promo_start: "",
    promo_end: "",
  });

  const [promoFormData, setPromoFormData] = useState({
    promo_price: "",
    promo_label: "",
    promo_start: "",
    promo_end: "",
  });

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return items;
    return items.filter(item => item.category_id === selectedCategory);
  }, [items, selectedCategory]);

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
    return categories.find(c => c.id === catId)?.name || "غير مصنف";
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

  const handleBulkActive = async (active: boolean) => {
    if (!selectedBranch || selectedItems.length === 0) return;
    await bulkUpdate.mutateAsync({
      branchId: selectedBranch.id,
      itemIds: selectedItems,
      updates: { is_active: active },
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
      },
    });
    setPromoDialogOpen(false);
    setSelectedItems([]);
    setPromoFormData({ promo_price: "", promo_label: "", promo_start: "", promo_end: "" });
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
    });
    setEditingItem(null);
  };

  const handleToggleAvailable = async (item: BranchMenuItemWithBase) => {
    await updateItem.mutateAsync({
      id: item.id,
      is_available: !item.is_available,
    });
  };

  const handleToggleActive = async (item: BranchMenuItemWithBase) => {
    await updateItem.mutateAsync({
      id: item.id,
      is_active: !item.is_active,
    });
  };

  if (!isBranchSelected) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">اختر الفرع أولاً</h3>
          <p className="text-muted-foreground">يجب اختيار فرع من القائمة أعلاه لإدارة الأسعار والعروض</p>
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
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    أسعار وعروض الفرع
                    <Badge variant="outline">{selectedBranch?.name}</Badge>
                  </CardTitle>
                  <CardDescription>إدارة الأسعار والعروض لكل فرع</CardDescription>
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
                <Copy className="h-4 w-4 mr-2" />
                نسخ من فرع
              </Button>
            </div>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Filters and Bulk Actions */}
            <div className="flex flex-wrap items-center gap-4 pb-4 border-b">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="كل الأصناف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأصناف</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedItems.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary">{selectedItems.length} محدد</Badge>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAvailability(true)}>
                    <CheckSquare className="h-4 w-4 mr-1" />
                    متاح
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAvailability(false)}>
                    <XSquare className="h-4 w-4 mr-1" />
                    غير متاح
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActive(true)}>
                    نشط
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkActive(false)}>
                    معطل
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setPromoDialogOpen(true)}>
                    <Percent className="h-4 w-4 mr-1" />
                    عرض
                  </Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll}>إلغاء التحديد</Button>
                </div>
              )}

              {selectedItems.length === 0 && filteredItems.length > 0 && (
                <Button variant="ghost" size="sm" onClick={selectAll}>
                  تحديد الكل ({filteredItems.length})
                </Button>
              )}
            </div>

            {/* Items List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">لا توجد أصناف</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(itemsByCategory).map(([catId, catItems]) => (
                  <div key={catId}>
                    <h4 className="font-semibold mb-3 text-muted-foreground">{getCategoryName(catId)}</h4>
                    <div className="space-y-2">
                      {catItems.map(item => (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            !item.is_active ? "opacity-50 bg-muted/30" : "bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedItems.includes(item.menu_item_id)}
                              onCheckedChange={() => toggleSelectItem(item.menu_item_id)}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{item.base_name}</span>
                                {item.is_promo_active && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Flame className="h-3 w-3 mr-1" />
                                    {item.promo_label || "عرض"}
                                  </Badge>
                                )}
                                {!item.is_available && (
                                  <Badge variant="secondary" className="text-xs">غير متاح</Badge>
                                )}
                                {!item.is_active && (
                                  <Badge variant="outline" className="text-xs">معطل</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {item.is_promo_active ? (
                                  <>
                                    <span className="line-through">{(item.price ?? (item.menu_item?.price || 0)).toFixed(2)}</span>
                                    <span className="text-destructive font-semibold">{item.promo_price?.toFixed(2)} {currency}</span>
                                  </>
                                ) : (
                                  <span>{item.effective_price.toFixed(2)} {currency}</span>
                                )}
                                {item.price !== null && item.price !== item.menu_item?.price && (
                                  <Badge variant="outline" className="text-xs">سعر مخصص</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={item.is_available}
                              onCheckedChange={() => handleToggleAvailable(item)}
                              title="متاح"
                            />
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => handleToggleActive(item)}
                              title="نشط"
                            />
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>

      {/* Edit Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الصنف - {editingItem?.base_name}</DialogTitle>
            <DialogDescription>
              السعر الأساسي: {editingItem?.menu_item?.price?.toFixed(2)} {currency}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                سعر الفرع (اتركه فارغاً لاستخدام السعر الأساسي)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={editFormData.price}
                onChange={(e) => setEditFormData({ ...editFormData, price: e.target.value })}
                placeholder={editingItem?.menu_item?.price?.toString()}
              />
            </div>
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" />
                إعدادات العرض
              </h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>سعر العرض</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editFormData.promo_price}
                    onChange={(e) => setEditFormData({ ...editFormData, promo_price: e.target.value })}
                    placeholder="سعر العرض"
                  />
                </div>
                <div className="space-y-2">
                  <Label>نص العرض</Label>
                  <Input
                    value={editFormData.promo_label}
                    onChange={(e) => setEditFormData({ ...editFormData, promo_label: e.target.value })}
                    placeholder="مثال: خصم 20%"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>بداية العرض</Label>
                    <Input
                      type="datetime-local"
                      value={editFormData.promo_start}
                      onChange={(e) => setEditFormData({ ...editFormData, promo_start: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نهاية العرض</Label>
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
            <Button variant="outline" onClick={() => setEditingItem(null)}>إلغاء</Button>
            <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
              {updateItem.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Promo Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تطبيق عرض على {selectedItems.length} صنف</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>سعر العرض</Label>
              <Input
                type="number"
                step="0.01"
                value={promoFormData.promo_price}
                onChange={(e) => setPromoFormData({ ...promoFormData, promo_price: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>نص العرض</Label>
              <Input
                value={promoFormData.promo_label}
                onChange={(e) => setPromoFormData({ ...promoFormData, promo_label: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>بداية العرض</Label>
                <Input
                  type="datetime-local"
                  value={promoFormData.promo_start}
                  onChange={(e) => setPromoFormData({ ...promoFormData, promo_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>نهاية العرض</Label>
                <Input
                  type="datetime-local"
                  value={promoFormData.promo_end}
                  onChange={(e) => setPromoFormData({ ...promoFormData, promo_end: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleApplyPromo} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              تطبيق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Copy Prices Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>نسخ الأسعار من فرع آخر</DialogTitle>
            <DialogDescription>
              سيتم نسخ جميع الأسعار من الفرع المصدر إلى {selectedBranch?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الفرع المصدر</Label>
              <Select value={sourceBranchId} onValueChange={setSourceBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفرع" />
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
              <Label htmlFor="copy-promos">نسخ العروض أيضاً</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>إلغاء</Button>
            <Button onClick={handleCopyPrices} disabled={!sourceBranchId || copyPrices.isPending}>
              {copyPrices.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              نسخ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Collapsible>
  );
}
