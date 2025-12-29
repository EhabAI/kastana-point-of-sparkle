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
import { useOwnerRestaurant, useUpdateRestaurant } from "@/hooks/useRestaurants";
import { useMenuCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "@/hooks/useMenuCategories";
import { useMenuItems, useCreateMenuItem, useUpdateMenuItem, useDeleteMenuItem, MenuItem } from "@/hooks/useMenuItems";
import { Store, Loader2, Plus, Edit2, Trash2, FolderOpen, Tag, Flame, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CSVUpload } from "@/components/owner/CSVUpload";
import { TableManagement } from "@/components/owner/TableManagement";
import { StaffManagement } from "@/components/owner/StaffManagement";
import { RestaurantSettings } from "@/components/owner/RestaurantSettings";

export default function OwnerAdmin() {
  const { role } = useAuth();
  const { data: restaurant, isLoading: loadingRestaurant } = useOwnerRestaurant();
  const { data: categories = [], isLoading: loadingCategories } = useMenuCategories(restaurant?.id);
  const updateRestaurant = useUpdateRestaurant();
  const { toast } = useToast();

  const [editingRestaurantName, setEditingRestaurantName] = useState(false);
  const [restaurantName, setRestaurantName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const handleUpdateRestaurantName = async () => {
    if (!restaurant || !restaurantName.trim()) return;
    await updateRestaurant.mutateAsync({ id: restaurant.id, name: restaurantName });
    setEditingRestaurantName(false);
  };

  if (loadingRestaurant) {
    return (
      <DashboardLayout title="Owner Dashboard">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!restaurant) {
    return (
      <DashboardLayout title="Owner Dashboard">
        <Card className="shadow-card">
          <CardContent className="p-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">No Restaurant Assigned</h2>
            <p className="text-muted-foreground">
              Please contact your system administrator to assign a restaurant to your account.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Owner Dashboard">
      <div className="space-y-8 animate-fade-in">
        {/* Restaurant Info */}
        <Card className="shadow-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {restaurant.logo_url ? (
                  <img
                    src={restaurant.logo_url}
                    alt={`${restaurant.name} logo`}
                    className="w-12 h-12 object-contain rounded-lg"
                  />
                ) : (
                  <Store className="h-8 w-8 text-primary" />
                )}
                <div>
                  <CardTitle className="flex items-center gap-2">{restaurant.name}</CardTitle>
                  <CardDescription>Your restaurant information</CardDescription>
                </div>
              </div>
              <Dialog open={editingRestaurantName} onOpenChange={setEditingRestaurantName}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setRestaurantName(restaurant.name)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit Name
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Restaurant Name</DialogTitle>
                    <DialogDescription>Update your restaurant's name.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-restaurant-name">Restaurant Name</Label>
                      <Input
                        id="edit-restaurant-name"
                        value={restaurantName}
                        onChange={(e) => setRestaurantName(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setEditingRestaurantName(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateRestaurantName} disabled={updateRestaurant.isPending}>
                      {updateRestaurant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Save
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
        </Card>

        {/* Restaurant Settings Section - Only visible to owners */}
        {role === "owner" && <RestaurantSettings />}

        {/* CSV Upload Section - Only visible to owners */}
        {role === "owner" && <CSVUpload restaurantId={restaurant.id} />}

        {/* Tables Management Section - Only visible to owners */}
        {role === "owner" && <TableManagement restaurantId={restaurant.id} />}

        {/* Staff Management Section - Only visible to owners */}
        {role === "owner" && <StaffManagement restaurantId={restaurant.id} />}

        {/* Categories Section */}
        <CategoriesSection restaurantId={restaurant.id} categories={categories} isLoading={loadingCategories} />

        {/* Menu Items Section */}
        <MenuItemsSection restaurantId={restaurant.id} categories={categories} />
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
  categories: { id: string; name: string; is_active: boolean; sort_order: number }[];
  isLoading: boolean;
}) {
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const { toast } = useToast();

  const [newCategoryName, setNewCategoryName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast({ title: "Please enter a category name", variant: "destructive" });
      return;
    }
    await createCategory.mutateAsync({ restaurantId, name: newCategoryName });
    setNewCategoryName("");
    setCreateDialogOpen(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editingCategory.name.trim()) return;
    await updateCategory.mutateAsync({ id: editingCategory.id, name: editingCategory.name });
    setEditingCategory(null);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await updateCategory.mutateAsync({ id, is_active: !currentActive });
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category? All items in it will also be deleted.")) {
      await deleteCategory.mutateAsync(id);
    }
  };

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
                    <FolderOpen className="h-5 w-5" />
                    Menu Categories
                  </CardTitle>
                  <CardDescription>Organize your menu with categories</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Category</DialogTitle>
                  <DialogDescription>Add a new menu category.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="category-name">Category Name</Label>
                    <Input
                      id="category-name"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g., Appetizers"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateCategory} disabled={createCategory.isPending}>
                    {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create
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
          <p className="text-muted-foreground text-center py-8">No categories yet. Create one to get started.</p>
        ) : (
          <div className="space-y-3">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{category.name}</p>
                    <p className="text-sm text-muted-foreground">{category.is_active ? "Active" : "Inactive"}</p>
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
                        <DialogTitle>Edit Category</DialogTitle>
                        <DialogDescription>Update the category name.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-category-name">Category Name</Label>
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
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateCategory} disabled={updateCategory.isPending}>
                          {updateCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save
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
}: {
  restaurantId: string;
  categories: { id: string; name: string }[];
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const { data: items = [], isLoading } = useMenuItems(restaurantId, selectedCategoryId || undefined);
  const createItem = useCreateMenuItem();
  const updateItem = useUpdateMenuItem();
  const deleteItem = useDeleteMenuItem();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [newItem, setNewItem] = useState({ name: "", description: "", price: "", is_offer: false });

  const handleCreateItem = async () => {
    if (!selectedCategoryId) {
      toast({ title: "Please select a category first", variant: "destructive" });
      return;
    }
    if (!newItem.name.trim()) {
      toast({ title: "Please enter an item name", variant: "destructive" });
      return;
    }
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
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    await updateItem.mutateAsync({
      id: editingItem.id,
      name: editingItem.name,
      description: editingItem.description,
      price: editingItem.price,
      is_available: editingItem.is_available,
      is_offer: editingItem.is_offer,
    });
    setEditingItem(null);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      await deleteItem.mutateAsync(id);
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Menu Items
            </CardTitle>
            <CardDescription>Manage items in your menu</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!selectedCategoryId}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Menu Item</DialogTitle>
                <DialogDescription>Add a new item to your menu.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="item-name">Name</Label>
                  <Input
                    id="item-name"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g., Grilled Chicken"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-description">Description (optional)</Label>
                  <Input
                    id="item-description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Brief description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="item-price">Price</Label>
                  <Input
                    id="item-price"
                    type="number"
                    step="0.01"
                    value={newItem.price}
                    onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="item-offer"
                    checked={newItem.is_offer}
                    onCheckedChange={(checked) => setNewItem({ ...newItem, is_offer: checked })}
                  />
                  <Label htmlFor="item-offer">Mark as Offer</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateItem} disabled={createItem.isPending}>
                  {createItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Category Selector */}
        <div className="mb-6">
          <Label className="mb-2 block">Select Category</Label>
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="Choose a category" />
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
          <p className="text-muted-foreground text-center py-8">Select a category to view items.</p>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No items in this category. Add one to get started.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {item.is_offer && <Flame className="h-4 w-4 text-warning" />}
                    <p className="font-medium text-foreground">{item.name}</p>
                    {item.is_offer && (
                      <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Offer</span>
                    )}
                    {!item.is_available && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Unavailable</span>
                    )}
                  </div>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  <p className="text-sm font-medium text-primary mt-1">د.أ{Number(item.price).toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
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
                        <DialogTitle>Edit Menu Item</DialogTitle>
                        <DialogDescription>Update the item details.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Name</Label>
                          <Input
                            value={editingItem?.name || ""}
                            onChange={(e) =>
                              setEditingItem((prev) => (prev ? { ...prev, name: e.target.value } : null))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={editingItem?.description || ""}
                            onChange={(e) =>
                              setEditingItem((prev) => (prev ? { ...prev, description: e.target.value } : null))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Price</Label>
                          <Input
                            type="number"
                            step="0.01"
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
                          <Label>Mark as Offer</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>
                          Cancel
                        </Button>
                        <Button onClick={handleUpdateItem} disabled={updateItem.isPending}>
                          {updateItem.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Save
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
