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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCashiers, useAddCashier, useUpdateCashierStatus } from "@/hooks/useCashiers";
import { Users, Loader2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface StaffManagementProps {
  restaurantId: string;
  staffCount?: number;
}

export function StaffManagement({ restaurantId, staffCount }: StaffManagementProps) {
  const { data: cashiers = [], isLoading } = useCashiers(restaurantId);
  const addCashier = useAddCashier();
  const updateStatus = useUpdateCashierStatus();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCashier, setNewCashier] = useState({ email: "", password: "" });

  const handleCreateCashier = async () => {
    if (!newCashier.email.trim()) {
      toast({ title: t("enter_email"), variant: "destructive" });
      return;
    }
    if (!newCashier.password || newCashier.password.length < 6) {
      toast({ title: t("password_min"), variant: "destructive" });
      return;
    }

    await addCashier.mutateAsync({
      email: newCashier.email,
      password: newCashier.password,
      restaurantId,
    });

    setNewCashier({ email: "", password: "" });
    setCreateDialogOpen(false);
  };

  return (
    <Card className="shadow-card">
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
                <UserPlus className="h-4 w-4 mr-2" />
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  {t("cancel")}
                </Button>
                <Button onClick={handleCreateCashier} disabled={addCashier.isPending}>
                  {addCashier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
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
                <TableHead>{t("created")}</TableHead>
                <TableHead className="text-right">{t("status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.map((cashier) => (
                <TableRow key={cashier.id}>
                  <TableCell className="font-medium">{cashier.email || t("no_email")}</TableCell>
                  <TableCell>{new Date(cashier.created_at).toLocaleDateString()}</TableCell>
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
  );
}
