import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRestaurantTables, useCreateRestaurantTable, useUpdateRestaurantTable, RestaurantTable } from "@/hooks/useRestaurantTables";
import { useBranches } from "@/hooks/useBranches";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { useQROrderEnabled } from "@/hooks/useQRModuleToggle";
import { Loader2, Plus, Edit2, QrCode, Copy, Download, Table2, ChevronDown, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";
import { getQRMenuBaseURL } from "@/components/DomainRouter";
import QRCode from "qrcode";

interface TableManagementProps {
  restaurantId: string;
  tableCount?: number;
}

// Generate real QR code as data URL using qrcode library
async function generateQRCodeDataURL(data: string, size: number = 200): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("QR code generation failed:", error);
    return "";
  }
}

// Generate real QR code as SVG string using qrcode library
async function generateQRCodeSVG(data: string, size: number = 200): Promise<string> {
  try {
    return await QRCode.toString(data, {
      type: "svg",
      width: size,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    });
  } catch (error) {
    console.error("QR code SVG generation failed:", error);
    return "";
  }
}

function QRCodeDisplay({ data, size = 120 }: { data: string; size?: number }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!data) {
      setQrDataUrl("");
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    generateQRCodeDataURL(data, size).then((url) => {
      setQrDataUrl(url);
      setIsLoading(false);
    });
  }, [data, size]);

  if (isLoading) {
    return (
      <div 
        className="bg-white p-2 rounded border flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!qrDataUrl) {
    return (
      <div 
        className="bg-white p-2 rounded border flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <QrCode className="h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="bg-white p-2 rounded border">
      <img 
        src={qrDataUrl} 
        alt="QR Code" 
        width={size} 
        height={size}
        className="block"
      />
    </div>
  );
}

function TableRow({ 
  table, 
  restaurantId,
  onEdit,
  branchName,
  qrEnabled
}: { 
  table: RestaurantTable; 
  restaurantId: string;
  onEdit: (table: RestaurantTable) => void;
  branchName: string;
  qrEnabled: boolean;
}) {
  const updateTable = useUpdateRestaurantTable();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // QR link requires branchId - do not generate QR if missing
  const branchId = table.branch_id;
  const hasValidBranch = !!branchId;
  // Use centralized QR menu domain for all QR codes
  const menuLink = hasValidBranch 
    ? `${getQRMenuBaseURL()}/menu/${restaurantId}/${branchId}/${table.table_code}`
    : "";
  
  const handleCopyLink = async () => {
    if (!hasValidBranch) {
      toast({ title: t("branch_required_for_qr"), variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(menuLink);
    toast({ title: t("link_copied") });
  };
  
  const handleDownloadQR = async () => {
    if (!hasValidBranch) {
      toast({ title: t("branch_required_for_qr"), variant: "destructive" });
      return;
    }
    
    try {
      // Generate QR code as PNG data URL directly
      const pngDataUrl = await QRCode.toDataURL(menuLink, {
        width: 400,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      });
      
      // Convert data URL to blob and download
      const response = await fetch(pngDataUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.download = `table-${table.table_name}-${table.table_code}.png`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("QR download failed:", error);
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };
  
  const handleToggleActive = async () => {
    try {
      await updateTable.mutateAsync({ id: table.id, isActive: !table.is_active });
    } catch (error) {
      const { title, description } = getOwnerErrorMessage(error, t);
      toast({ title, description, variant: "destructive" });
    }
  };
  
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg gap-4 transition-all duration-200 hover:shadow-md hover:border-primary/30 border ${!hasValidBranch ? 'bg-destructive/10 border-destructive/30' : 'bg-muted/50 border-transparent'}`}>
      <div className="flex items-start gap-4">
        {/* QR Code - only show when qrEnabled */}
        {qrEnabled && (
          hasValidBranch ? (
            <QRCodeDisplay data={menuLink} size={80} />
          ) : (
            <div className="w-20 h-20 bg-muted flex items-center justify-center rounded border border-dashed border-destructive">
              <span className="text-xs text-destructive text-center px-1">{t("no_branch")}</span>
            </div>
          )
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground">{table.table_name}</p>
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              <Users className="h-3 w-3" />
              {table.capacity ?? 4}
            </span>
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${hasValidBranch ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/20 text-destructive'}`}>
              <Building2 className="h-3 w-3" />
              {branchName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${table.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
              {table.is_active ? t("active") : t("inactive")}
            </span>
            {!hasValidBranch && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                {t("branch_required")}
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t("code")}: {table.table_code}</p>
          {/* QR link text - only show when qrEnabled */}
          {qrEnabled && hasValidBranch && (
            <p className="text-xs text-muted-foreground mt-1 break-all max-w-xs">{menuLink}</p>
          )}
          {/* Info text when QR disabled */}
          {!qrEnabled && (
            <p className="text-xs text-muted-foreground mt-1 italic">{t("qr_order_disabled_info")}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Switch 
          checked={table.is_active} 
          onCheckedChange={handleToggleActive}
          disabled={updateTable.isPending || !hasValidBranch}
        />
        {/* QR buttons - only show when qrEnabled */}
        {qrEnabled && (
          <>
            <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!hasValidBranch}>
              <Copy className="h-4 w-4 mr-1" />
              {t("copy")}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadQR} disabled={!hasValidBranch}>
              <Download className="h-4 w-4 mr-1" />
              QR
            </Button>
          </>
        )}
        <Button variant="ghost" size="icon" onClick={() => onEdit(table)}>
          <Edit2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function TableManagement({ restaurantId, tableCount }: TableManagementProps) {
  const { data: tables = [], isLoading } = useRestaurantTables(restaurantId);
  const { data: branches = [], isLoading: branchesLoading } = useBranches(restaurantId);
  const { selectedBranch } = useBranchContextSafe();
  const { data: qrEnabled = false } = useQROrderEnabled(restaurantId);
  const createTable = useCreateRestaurantTable();
  const updateTable = useUpdateRestaurantTable();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  const [isOpen, setIsOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState(4);
  const [newTableBranchId, setNewTableBranchId] = useState("");
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editTableName, setEditTableName] = useState("");
  const [editTableCapacity, setEditTableCapacity] = useState(4);

  // Use globally selected branch from BranchSelector for filtering
  // Filter tables by selected branch (if a branch is selected)
  const filteredTables = selectedBranch?.id 
    ? tables.filter(t => t.branch_id === selectedBranch.id)
    : tables;

  // Get branch name by ID
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return t("no_branch");
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || t("unknown_branch");
  };
  
  const handleCreate = async () => {
    if (!newTableName.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    if (!newTableBranchId) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    try {
      await createTable.mutateAsync({ 
        restaurantId, 
        tableName: newTableName.trim(), 
        capacity: newTableCapacity,
        branchId: newTableBranchId
      });
      setNewTableName("");
      setNewTableCapacity(4);
      setCreateDialogOpen(false);
    } catch (error) {
      const { title, description } = getOwnerErrorMessage(error, t);
      toast({ title, description, variant: "destructive" });
    }
  };
  
  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setEditTableName(table.table_name);
    setEditTableCapacity(table.capacity ?? 4);
  };
  
  const handleSaveEdit = async () => {
    if (!editingTable || !editTableName.trim()) {
      toast({ title: t("error_validation_failed"), variant: "destructive" });
      return;
    }
    try {
      await updateTable.mutateAsync({ id: editingTable.id, tableName: editTableName.trim(), capacity: editTableCapacity });
      setEditingTable(null);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity">
                <Table2 className="h-5 w-5" />
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {t("tables_management")}
                    <span className="text-muted-foreground font-normal">({tableCount ?? tables.length})</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </CardTitle>
                  <CardDescription>{t("tables_desc")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={branches.length === 0}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("add_table")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("add_table")}</DialogTitle>
                  <DialogDescription>{t("add_table_desc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-branch" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {t("branch")} <span className="text-destructive">*</span>
                    </Label>
                    <Select value={newTableBranchId} onValueChange={setNewTableBranchId}>
                      <SelectTrigger id="table-branch" className={!newTableBranchId ? "border-destructive" : ""}>
                        <SelectValue placeholder={t("select_branch")} />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!newTableBranchId && (
                      <p className="text-xs text-destructive">{t("branch_required")}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table-name">{t("table_name")}</Label>
                    <Input
                      id="table-name"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      placeholder={t("table_name_placeholder")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table-capacity">{t("number_of_chairs")}</Label>
                    <Input
                      id="table-capacity"
                      type="number"
                      min={1}
                      value={newTableCapacity}
                      onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 4)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>{t("cancel")}</Button>
                  <Button onClick={handleCreate} disabled={createTable.isPending}>
                    {createTable.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t("create")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            
            {isLoading || branchesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-8">
                <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">{t("no_tables")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredTables.map((table) => (
                  <TableRow 
                    key={table.id} 
                    table={table} 
                    restaurantId={restaurantId}
                    onEdit={handleEdit}
                    branchName={getBranchName(table.branch_id)}
                    qrEnabled={qrEnabled}
                  />
                ))}
              </div>
            )}
            
            {/* Edit Dialog */}
            <Dialog open={!!editingTable} onOpenChange={(open) => !open && setEditingTable(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("edit_table")}</DialogTitle>
                  <DialogDescription>{t("edit_table_desc")}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-table-name">{t("table_name")}</Label>
                    <Input
                      id="edit-table-name"
                      value={editTableName}
                      onChange={(e) => setEditTableName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-table-capacity">{t("number_of_chairs")}</Label>
                    <Input
                      id="edit-table-capacity"
                      type="number"
                      min={1}
                      value={editTableCapacity}
                      onChange={(e) => setEditTableCapacity(parseInt(e.target.value) || 4)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingTable(null)}>{t("cancel")}</Button>
                  <Button onClick={handleSaveEdit} disabled={updateTable.isPending}>
                    {updateTable.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {t("save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
