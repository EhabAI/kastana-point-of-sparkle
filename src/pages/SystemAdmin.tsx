import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useRestaurants, useCreateRestaurant, useAssignOwner } from "@/hooks/useRestaurants";
import { useOwners, useCreateOwner } from "@/hooks/useOwners";
import { useMenuCategories } from "@/hooks/useMenuCategories";
import { useAllMenuItems } from "@/hooks/useMenuItems";
import { Store, Users, Plus, Link, Eye, Loader2 } from "lucide-react";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.string().email("Please enter a valid email");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

export default function SystemAdmin() {
  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants();
  const { data: owners = [], isLoading: loadingOwners } = useOwners();
  const createRestaurant = useCreateRestaurant();
  const createOwner = useCreateOwner();
  const assignOwner = useAssignOwner();
  const { toast } = useToast();

  // Form states
  const [restaurantName, setRestaurantName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [selectedRestaurant, setSelectedRestaurant] = useState("");
  const [selectedOwner, setSelectedOwner] = useState("");
  const [viewingRestaurant, setViewingRestaurant] = useState<string | null>(null);

  // Dialog states
  const [restaurantDialogOpen, setRestaurantDialogOpen] = useState(false);
  const [ownerDialogOpen, setOwnerDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  const handleCreateRestaurant = async () => {
    if (!restaurantName.trim()) {
      toast({ title: "Please enter a restaurant name", variant: "destructive" });
      return;
    }
    await createRestaurant.mutateAsync(restaurantName);
    setRestaurantName("");
    setRestaurantDialogOpen(false);
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
                <DialogDescription>Enter the name for the new restaurant.</DialogDescription>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRestaurantDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRestaurant} disabled={createRestaurant.isPending}>
                  {createRestaurant.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                {restaurants.map((restaurant) => (
                  <div key={restaurant.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Store className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{restaurant.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {restaurant.owner_id 
                            ? `Owner: ${owners.find(o => o.user_id === restaurant.owner_id)?.email || restaurant.owner_id.slice(0, 8) + '...'}`
                            : "No owner assigned"}
                        </p>
                      </div>
                    </div>
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
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* View Menu Dialog */}
        <ViewMenuDialog
          restaurantId={viewingRestaurant}
          open={viewDialogOpen}
          onOpenChange={setViewDialogOpen}
          restaurants={restaurants}
        />
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
                          <span className="font-medium text-foreground">${Number(item.price).toFixed(2)}</span>
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
