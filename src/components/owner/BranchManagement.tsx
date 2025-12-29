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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBranches, useCreateBranch, useUpdateBranch, useDeleteBranch, Branch } from "@/hooks/useBranches";
import { Building2, Plus, Edit2, Trash2, Loader2, ChevronDown, MapPin, Phone, Hash, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";

interface BranchManagementProps {
  restaurantId: string;
}

export function BranchManagement({ restaurantId }: BranchManagementProps) {
  const { t } = useLanguage();
  const { data: branches = [], isLoading } = useBranches(restaurantId);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const deleteBranch = useDeleteBranch();

  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    phone: "",
  });

  const resetForm = () => {
    setFormData({ name: "", code: "", address: "", phone: "" });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    
    await createBranch.mutateAsync({
      restaurant_id: restaurantId,
      name: formData.name,
      code: formData.code || undefined,
      address: formData.address || undefined,
      phone: formData.phone || undefined,
    });
    
    resetForm();
    setCreateDialogOpen(false);
  };

  const handleUpdate = async () => {
    if (!editingBranch || !formData.name.trim()) return;
    
    await updateBranch.mutateAsync({
      id: editingBranch.id,
      name: formData.name,
      code: formData.code || null,
      address: formData.address || null,
      phone: formData.phone || null,
    });
    
    setEditingBranch(null);
    resetForm();
  };

  const handleToggleActive = async (branch: Branch) => {
    await updateBranch.mutateAsync({
      id: branch.id,
      is_active: !branch.is_active,
    });
  };

  const handleSetDefault = async (branch: Branch) => {
    // First unset current default
    const currentDefault = branches.find(b => b.is_default);
    if (currentDefault) {
      await updateBranch.mutateAsync({ id: currentDefault.id, is_default: false });
    }
    // Set new default
    await updateBranch.mutateAsync({ id: branch.id, is_default: true });
  };

  const handleDelete = async (branch: Branch) => {
    if (branch.is_default) {
      alert(t("cannot_delete_default"));
      return;
    }
    if (confirm(`${t("confirm_delete_branch")} "${branch.name}"?`)) {
      await deleteBranch.mutateAsync(branch.id);
    }
  };

  const openEditDialog = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code || "",
      address: branch.address || "",
      phone: branch.phone || "",
    });
  };

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
                    <Building2 className="h-5 w-5" />
                    {t("branch_management")}
                    <span className="text-muted-foreground font-normal">({branches.length})</span>
                  </CardTitle>
                  <CardDescription>{t("manage_restaurant_branches")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={resetForm}>
                  <Plus className="h-4 w-4 me-2" />
                  {t("add_branch")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_branch")}</DialogTitle>
                  <DialogDescription>{t("add_new_branch")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="branch-name">{t("branch_name_required")}</Label>
                    <Input
                      id="branch-name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t("branch_name_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-code">{t("branch_code")}</Label>
                    <Input
                      id="branch-code"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      placeholder={t("branch_code_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-address">{t("branch_address")}</Label>
                    <Input
                      id="branch-address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder={t("full_address")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branch-phone">{t("branch_phone")}</Label>
                    <Input
                      id="branch-phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+962..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t("cancel")}</Button>
                  <Button onClick={handleCreate} disabled={createBranch.isPending}>
                    {createBranch.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
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
            ) : branches.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t("no_branches_add")}</p>
            ) : (
              <div className="space-y-3">
                {branches.map((branch) => (
                  <div
                    key={branch.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      branch.is_active ? "bg-muted/50" : "bg-muted/20 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{branch.name}</p>
                          {branch.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 me-1" />
                              {t("default")}
                            </Badge>
                          )}
                          {!branch.is_active && (
                            <Badge variant="destructive" className="text-xs">{t("disabled")}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          {branch.code && (
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {branch.code}
                            </span>
                          )}
                          {branch.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {branch.address}
                            </span>
                          )}
                          {branch.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {branch.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {!branch.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(branch)}
                          title={t("set_default")}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Switch
                        checked={branch.is_active}
                        onCheckedChange={() => handleToggleActive(branch)}
                      />
                      <Dialog
                        open={editingBranch?.id === branch.id}
                        onOpenChange={(open) => !open && setEditingBranch(null)}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(branch)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t("edit_branch")}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>{t("branch_name_required")}</Label>
                              <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("branch_code")}</Label>
                              <Input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("branch_address")}</Label>
                              <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>{t("branch_phone")}</Label>
                              <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingBranch(null)}>{t("cancel")}</Button>
                            <Button onClick={handleUpdate} disabled={updateBranch.isPending}>
                              {updateBranch.isPending && <Loader2 className="h-4 w-4 animate-spin me-2" />}
                              {t("save")}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      {!branch.is_default && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(branch)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
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
