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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashiers, useAddCashier, useUpdateCashierStatus } from "@/hooks/useCashiers";
import { useBranches } from "@/hooks/useBranches";
import { useResetCashierPassword } from "@/hooks/useResetCashierPassword";
import { Users, Loader2, UserPlus, Building2, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffManagementProps {
  restaurantId: string;
  staffCount?: number;
}

export function StaffManagement({ restaurantId, staffCount }: StaffManagementProps) {
  const { data: cashiers = [], isLoading } = useCashiers(restaurantId);
  const { data: branches = [] } = useBranches(restaurantId);
  const addCashier = useAddCashier();
  const updateStatus = useUpdateCashierStatus();
  const resetPassword = useResetCashierPassword();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCashier, setNewCashier] = useState({ email: "", password: "", branchId: "" });
  
  // Password reset state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [selectedCashier, setSelectedCashier] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");

  // Get branch name by ID for display
  const getBranchName = (branchId: string | null | undefined) => {
    if (!branchId) return t("no_branch");
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || t("unknown_branch");
  };

  const handleCreateCashier = async () => {
    if (!newCashier.email.trim()) {
      toast({ title: t("enter_email"), variant: "destructive" });
      return;
    }
    if (!newCashier.password || newCashier.password.length < 6) {
      toast({ title: t("password_min"), variant: "destructive" });
      return;
    }
    if (!newCashier.branchId) {
      toast({ title: t("select_branch_required"), variant: "destructive" });
      return;
    }

    await addCashier.mutateAsync({
      email: newCashier.email,
      password: newCashier.password,
      restaurantId,
      branchId: newCashier.branchId,
    });

    setNewCashier({ email: "", password: "", branchId: "" });
    setCreateDialogOpen(false);
  };

  const openResetDialog = (cashierId: string, email: string) => {
    setSelectedCashier({ id: cashierId, email });
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
    if (!selectedCashier) return;
    
    await resetPassword.mutateAsync({
      userId: selectedCashier.id,
      newPassword,
      restaurantId,
    });
    
    setConfirmResetOpen(false);
    setSelectedCashier(null);
    setNewPassword("");
  };

  return (
    <>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t("staff_management")}
                <span className="text-muted-foreground font-normal">({staffCount ?? cashiers.length})</span>
              </CardTitle>
              <CardDescription>{t("manage_cashiers")}</CardDescription>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <UserPlus className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  {t("add_cashier")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_new_cashier")}</DialogTitle>
                  <DialogDescription>{t("create_cashier_desc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="cashier-email">{t("email")}</Label>
                    <Input
                      id="cashier-email"
                      type="email"
                      value={newCashier.email}
                      onChange={(e) => setNewCashier({ ...newCashier, email: e.target.value })}
                      placeholder="cashier@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-password">{t("password")}</Label>
                    <Input
                      id="cashier-password"
                      type="password"
                      value={newCashier.password}
                      onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                      placeholder={t("min_6_chars")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cashier-branch" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("assign_to_branch")} *
                    </Label>
                    <Select
                      value={newCashier.branchId}
                      onValueChange={(value) => setNewCashier({ ...newCashier, branchId: value })}
                    >
                      <SelectTrigger id="cashier-branch">
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
                  <Button onClick={handleCreateCashier} disabled={addCashier.isPending}>
                    {addCashier.isPending ? <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" /> : null}
                    {t("create_cashier")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
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
                            updateStatus.mutate({
                              roleId: cashier.id,
                              isActive: checked,
                              restaurantId
                            })
                          }
                          disabled={updateStatus.isPending}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Reset Password Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("reset_password")}</DialogTitle>
            <DialogDescription>
              {t("reset_password_for")} {selectedCashier?.email}
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
              {t("confirm_reset_password_desc")} {selectedCashier?.email}
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
