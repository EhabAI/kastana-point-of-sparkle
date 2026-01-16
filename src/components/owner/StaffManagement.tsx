import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashiers, useAddCashier, useUpdateCashierStatus } from "@/hooks/useCashiers";
import { useKitchenStaff, useAddKitchenStaff, useUpdateKitchenStaffStatus } from "@/hooks/useKitchenStaff";
import { useBranches } from "@/hooks/useBranches";
import { useResetCashierPassword } from "@/hooks/useResetCashierPassword";
import { useKDSEnabled } from "@/hooks/useKDSEnabled";
import { Users, Loader2, UserPlus, Building2, KeyRound, ChefHat } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffManagementProps {
  restaurantId: string;
  staffCount?: number;
}

export function StaffManagement({ restaurantId, staffCount }: StaffManagementProps) {
  const { data: cashiers = [], isLoading: cashiersLoading } = useCashiers(restaurantId);
  const { data: kitchenStaff = [], isLoading: kitchenLoading } = useKitchenStaff(restaurantId);
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: kdsEnabled } = useKDSEnabled(restaurantId);
  const addCashier = useAddCashier();
  const addKitchenStaff = useAddKitchenStaff();
  const updateCashierStatus = useUpdateCashierStatus();
  const updateKitchenStatus = useUpdateKitchenStaffStatus();
  const resetPassword = useResetCashierPassword();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState("cashiers");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<"cashier" | "kitchen">("cashier");
  const [newStaff, setNewStaff] = useState({ email: "", password: "", branchId: "" });
  
  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const isLoading = cashiersLoading || kitchenLoading;
  const totalStaff = cashiers.length + kitchenStaff.length;

  // Get branch name by ID for display
  const getBranchName = (branchId: string | null | undefined) => {
    if (!branchId) return t("no_branch");
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || t("unknown_branch");
  };

  const openCreateDialog = (type: "cashier" | "kitchen") => {
    setCreateType(type);
    setNewStaff({ email: "", password: "", branchId: "" });
    setCreateDialogOpen(true);
  };

  const handleCreateStaff = async () => {
    if (!newStaff.email.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    if (!newStaff.password || newStaff.password.length < 6) {
      toast({ title: t("password_min"), variant: "destructive" });
      return;
    }
    if (!newStaff.branchId) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }

    try {
      if (createType === "cashier") {
        await addCashier.mutateAsync({
          email: newStaff.email,
          password: newStaff.password,
          restaurantId,
          branchId: newStaff.branchId,
        });
      } else {
        await addKitchenStaff.mutateAsync({
          email: newStaff.email,
          password: newStaff.password,
          restaurantId,
          branchId: newStaff.branchId,
        });
      }

      setNewStaff({ email: "", password: "", branchId: "" });
      setCreateDialogOpen(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const openResetDialog = (userId: string, email: string) => {
    setSelectedStaff({ id: userId, email });
    setNewPassword("");
    setResetDialogOpen(true);
  };

  const handleResetPassword = () => {
    if (newPassword.length < 6) {
      toast({ title: t("password_min"), variant: "destructive" });
      return;
    }
    setResetDialogOpen(false);
    setConfirmResetOpen(true);
  };

  const confirmPasswordReset = async () => {
    if (!selectedStaff) return;
    
    try {
      await resetPassword.mutateAsync({
        userId: selectedStaff.id,
        newPassword,
        restaurantId,
      });
      
      setConfirmResetOpen(false);
      setSelectedStaff(null);
      setNewPassword("");
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  const isPending = addCashier.isPending || addKitchenStaff.isPending;

  return (
    <>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("staff_management")}
                <span className="text-muted-foreground font-normal">({staffCount ?? totalStaff})</span>
              </CardTitle>
              <CardDescription>{t("manage_staff_desc")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="cashiers" className="gap-2">
                  <Users className="h-4 w-4" />
                  {t("cashiers")} ({cashiers.length})
                </TabsTrigger>
                {kdsEnabled && (
                  <TabsTrigger value="kitchen" className="gap-2">
                    <ChefHat className="h-4 w-4" />
                    {t("kitchen_staff")} ({kitchenStaff.length})
                  </TabsTrigger>
                )}
              </TabsList>
              
              <div className="flex gap-2">
                <Button size="sm" onClick={() => openCreateDialog("cashier")}>
                  <UserPlus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("add_cashier")}
                </Button>
                {kdsEnabled && (
                  <Button size="sm" variant="outline" onClick={() => openCreateDialog("kitchen")}>
                    <ChefHat className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("add_kitchen_staff")}
                  </Button>
                )}
              </div>
            </div>

            <TabsContent value="cashiers">
              {cashiersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : cashiers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">{t("no_cashiers")}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("email")}</TableHead>
                      <TableHead>{t("branch")}</TableHead>
                      <TableHead>{t("created")}</TableHead>
                      <TableHead>{t("actions")}</TableHead>
                      <TableHead className="text-right">{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cashiers.map((cashier) => (
                      <TableRow key={cashier.id} className="hover-row">
                        <TableCell className="font-medium">{cashier.email || t("no_email")}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            {getBranchName(cashier.branch_id)}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(cashier.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetDialog(cashier.user_id, cashier.email || "")}
                            title={t("reset_password")}
                          >
                            <KeyRound className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                            {t("reset_password")}
                          </Button>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className={`text-xs font-medium ${cashier.is_active ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                              {cashier.is_active ? t("active") : t("inactive")}
                            </span>
                            <Switch
                              checked={cashier.is_active}
                              onCheckedChange={(checked) => 
                                updateCashierStatus.mutate({
                                  roleId: cashier.id,
                                  isActive: checked,
                                  restaurantId
                                })
                              }
                              disabled={updateCashierStatus.isPending}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            {kdsEnabled && (
              <TabsContent value="kitchen">
                {kitchenLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : kitchenStaff.length === 0 ? (
                  <div className="text-center py-8">
                    <ChefHat className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">{t("no_kitchen_staff")}</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("email")}</TableHead>
                        <TableHead>{t("branch")}</TableHead>
                        <TableHead>{t("created")}</TableHead>
                        <TableHead>{t("actions")}</TableHead>
                        <TableHead className="text-right">{t("status")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kitchenStaff.map((staff) => (
                        <TableRow key={staff.id} className="hover-row">
                          <TableCell className="font-medium">{staff.email || t("no_email")}</TableCell>
                          <TableCell>
                            <span className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              {getBranchName(staff.branch_id)}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(staff.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openResetDialog(staff.user_id, staff.email || "")}
                              title={t("reset_password")}
                            >
                              <KeyRound className="h-4 w-4 ltr:mr-1 rtl:ml-1" />
                              {t("reset_password")}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={`text-xs font-medium ${staff.is_active ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
                                {staff.is_active ? t("active") : t("inactive")}
                              </span>
                              <Switch
                                checked={staff.is_active}
                                onCheckedChange={(checked) => 
                                  updateKitchenStatus.mutate({
                                    roleId: staff.id,
                                    isActive: checked,
                                    restaurantId
                                  })
                                }
                                disabled={updateKitchenStatus.isPending}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Staff Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {createType === "cashier" ? t("add_new_cashier") : t("add_new_kitchen_staff")}
            </DialogTitle>
            <DialogDescription>
              {createType === "cashier" ? t("create_cashier_desc") : t("create_kitchen_desc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-email">{t("email")}</Label>
              <Input
                id="staff-email"
                type="email"
                value={newStaff.email}
                onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                placeholder={createType === "cashier" ? "cashier@example.com" : "kitchen@example.com"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">{t("password")}</Label>
              <Input
                id="staff-password"
                type="password"
                value={newStaff.password}
                onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                placeholder={t("min_6_chars")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-branch" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                {t("assign_to_branch")} *
              </Label>
              <Select
                value={newStaff.branchId}
                onValueChange={(value) => setNewStaff({ ...newStaff, branchId: value })}
              >
                <SelectTrigger id="staff-branch">
                  <SelectValue placeholder={t("select_branch")} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                      {branch.is_default && ` (${t("default")})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleCreateStaff} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
              {createType === "cashier" ? t("create_cashier") : t("create_kitchen_staff")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reset_password")}</DialogTitle>
            <DialogDescription>
              {t("reset_password_for")} {selectedStaff?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">{t("new_password")}</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("min_6_chars")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleResetPassword} disabled={newPassword.length < 6}>
              {t("continue")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmResetOpen} onOpenChange={setConfirmResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirm_reset_password")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirm_reset_password_desc")} {selectedStaff?.email}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmPasswordReset}
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
              {t("reset_password")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
