import { useState, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { useRestaurants, useCreateRestaurant, useAssignOwner, useUpdateRestaurant } from "@/hooks/useRestaurants";
import { useOwners, useCreateOwner } from "@/hooks/useOwners";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { useAllMenuItems } from "@/hooks/useMenuItems";
import { useToggleRestaurantActive } from "@/hooks/useToggleRestaurantActive";
import { useAllRestaurantsInventoryStatus, useToggleInventoryModule } from "@/hooks/useInventoryModuleToggle";
import { Store, Users, Plus, Link, Eye, Loader2, Upload, Image, Power, Package } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { formatJOD } from "@/lib/utils";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function SystemAdmin() {
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants();
  const { data: owners = [], isLoading: loadingOwners } = useOwners();
  const { data: inventoryStatusMap = new Map() } = useAllRestaurantsInventoryStatus();
  const createRestaurant = useCreateRestaurant();
  const updateRestaurant = useUpdateRestaurant();
  const createOwner = useCreateOwner();
  const assignOwner = useAssignOwner();
  const toggleActive = useToggleRestaurantActive();
  const toggleInventory = useToggleInventoryModule();
  const { toast } = useToast();
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [viewingRestaurant, setViewingRestaurant] = useState<string | null>(null);
  const [editLogoRestaurantId, setEditLogoRestaurantId] = useState<string | null>(null);

  // Dialog states
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editLogoDialogOpen, setEditLogoDialogOpen] = useState(false);
  
  // Deactivation confirmation dialog
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [restaurantToDeactivate, setRestaurantToDeactivate] = useState<{id: string; name: string} | null>(null);

  // Inventory toggle confirmation dialog
  const [inventoryToggleDialogOpen, setInventoryToggleDialogOpen] = useState(false);
  const [inventoryToggleTarget, setInventoryToggleTarget] = useState<{id: string; name: string; currentEnabled: boolean} | null>(null);

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
      
      // First create the restaurant to get its ID
      const newRestaurant = await createRestaurant.mutateAsync({ name: restaurantName });
      
      // Then upload logo if provided
      if (logoFile && newRestaurant?.id) {
        const logoUrl = await uploadLogo(newRestaurant.id);
        if (logoUrl) {
          await updateRestaurant.mutateAsync({ id: newRestaurant.id, logoUrl });
        }
      }
      
      setRestaurantName("");
      setLogoFile(null);
      setLogoPreview(null);
      setRestaurantDialogOpen(false);
    } catch (error) {
      toast({ title: "Error creating restaurant", variant: "destructive" });
    } finally {
      setUploadingLogo(false);
    }
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
    await createOwner.mutateAsync({ email: ownerEmail, password: ownerPassword });
    setOwnerEmail("");
    setOwnerPassword("");
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Restaurant</DialogTitle>
                <DialogDescription>Enter the name and logo for the new restaurant.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="restaurant-name">Restaurant Name</Label>
                  <Input
                    id="restaurant-name"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="Enter restaurant name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Restaurant Logo (optional)</Label>
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
                        Remove
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setRestaurantDialogOpen(false);
                  setLogoFile(null);
                  setLogoPreview(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRestaurant} disabled={createRestaurant.isPending || uploadingLogo}>
                  {(createRestaurant.isPending || uploadingLogo) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create
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
                <DialogDescription>Create a new owner account with email and password.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
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
                <Button variant="outline" onClick={() => setOwnerDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateOwner} disabled={createOwner.isPending}>
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
              <div className="space-y-3">
                {restaurants.map((restaurant) => {
                  const inventoryEnabled = inventoryStatusMap.get(restaurant.id) ?? false;
                  return (
                  <div key={restaurant.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {restaurant.logo_url ? (
                        <img 
                          src={restaurant.logo_url} 
                          alt={`${restaurant.name} logo`}
                          className="w-9 h-9 object-contain rounded-lg"
                        />
                      ) : (
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Store className="h-4 w-4 text-primary" />
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
                    <div className="flex items-center gap-2">
                      {/* Active/Inactive Badge */}
                      <Badge variant={restaurant.is_active ? "default" : "destructive"} className="text-xs">
                        {restaurant.is_active ? "ACTIVE" : "INACTIVE"}
                      </Badge>
                      {/* Active Toggle */}
                      <div className="flex items-center gap-1">
                        <Switch
                          checked={restaurant.is_active}
                          onCheckedChange={() => handleToggleActive(restaurant.id, restaurant.name, restaurant.is_active)}
                          disabled={toggleActive.isPending}
                        />
                      </div>
                      {/* Inventory Module Toggle */}
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-background border">
                        <Package className={`h-3.5 w-3.5 ${inventoryEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-xs text-muted-foreground">Inventory</span>
                        <Switch
                          checked={inventoryEnabled}
                          onCheckedChange={() => handleInventoryToggle(restaurant.id, restaurant.name, inventoryEnabled)}
                          disabled={toggleInventory.isPending}
                          className="scale-75"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditLogoRestaurantId(restaurant.id);
                          setLogoPreview(restaurant.logo_url || null);
                          setEditLogoDialogOpen(true);
                        }}
                      >
                        <Image className="h-4 w-4 mr-2" />
                        Logo
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setViewingRestaurant(restaurant.id);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View Menu
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

        {/* View Menu Dialog */}
        <ViewMenuDialog
          restaurantId={viewingRestaurant}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          restaurants={restaurants}
        />

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
      </div>
    </DashboardLayout>
  );
}

function ViewMenuDialog({
  restaurantId,
  open,
  onOpenChange,
  restaurants,
}: {
  restaurantId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurants: { id: string; name: string }[];
}) {
  const restaurant = restaurants.find((r) => r.id === restaurantId);
  const { data: categories = [] } = useMenuCategories(restaurantId || undefined);
  const { data: items = [] } = useAllMenuItems(restaurantId || undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{restaurant?.name || "Menu"}</DialogTitle>
          <DialogDescription>View menu categories and items (read-only)</DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {categories.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No menu categories yet.</p>
          ) : (
            categories.map((category) => (
              <div key={category.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground">{category.name}</h4>
                  {!category.is_active && (
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">Inactive</span>
                  )}
                </div>
                <div className="space-y-2 pl-4">
                  {items
                    .filter((i) => i.category_id === category.id)
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-border last:border-0"
                      >
                        <div>
                          <p className="font-medium text-foreground">{item.name}</p>
                          {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {item.is_offer && (
                            <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">Offer</span>
                          )}
                          {!item.is_available && (
                            <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded">
                              Unavailable
                            </span>
                          )}
                          <span className="font-medium text-foreground">${formatJOD(Number(item.price))}</span>
                        </div>
                      </div>
                    ))}
                  {items.filter((i) => i.category_id === category.id).length === 0 && (
                    <p className="text-sm text-muted-foreground">No items in this category</p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
