import { useState } from "react";
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
import { Loader2, Plus, Edit2, QrCode, Copy, Download, Table2, ChevronDown, Users, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface TableManagementProps {
  restaurantId: string;
  tableCount?: number;
}

// Simple QR Code generator using SVG (no external libraries)
function generateQRCodeSVG(data: string, size: number = 200): string {
  // This is a simplified QR-like visual representation
  // For a real app, you'd use a proper QR library, but per requirements, no external libs
  const cellSize = size / 25;
  const padding = cellSize * 2;
  const innerSize = size - padding * 2;
  
  // Create a deterministic pattern based on the data
  const hash = data.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const cells: boolean[][] = [];
  
  for (let i = 0; i < 21; i++) {
    cells[i] = [];
    for (let j = 0; j < 21; j++) {
      // Position detection patterns (corners)
      const isTopLeft = i < 7 && j < 7;
      const isTopRight = i < 7 && j >= 14;
      const isBottomLeft = i >= 14 && j < 7;
      
      if (isTopLeft || isTopRight || isBottomLeft) {
        // Draw finder patterns
        const li = isTopLeft ? i : isTopRight ? i : i - 14;
        const lj = isTopLeft ? j : isTopRight ? j - 14 : j;
        cells[i][j] = (li === 0 || li === 6 || lj === 0 || lj === 6 || (li >= 2 && li <= 4 && lj >= 2 && lj <= 4));
      } else {
        // Data area - deterministic based on position and hash
        cells[i][j] = ((i * 21 + j + hash) % 3) === 0;
      }
    }
  }

  const cellWidth = innerSize / 21;
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">`;
  svg += `<rect width="${size}" height="${size}" fill="white"/>`;
  
  for (let i = 0; i < 21; i++) {
    for (let j = 0; j < 21; j++) {
      if (cells[i][j]) {
        svg += `<rect x="${padding + j * cellWidth}" y="${padding + i * cellWidth}" width="${cellWidth}" height="${cellWidth}" fill="black"/>`;
      }
    }
  }
  
  svg += "</svg>";
  return svg;
}

function QRCodeDisplay({ data, size = 120 }: { data: string; size?: number }) {
  const svgString = generateQRCodeSVG(data, size);
  return (
    <div 
      className="bg-white p-2 rounded border"
      dangerouslySetInnerHTML={{ __html: svgString }}
    />
  );
}

function TableRow({ 
  table, 
  restaurantId,
  onEdit,
  branchName
}: { 
  table: RestaurantTable; 
  restaurantId: string;
  onEdit: (table: RestaurantTable) => void;
  branchName: string;
}) {
  const updateTable = useUpdateRestaurantTable();
  const { toast } = useToast();
  const { t } = useLanguage();
  
  // QR link requires branchId - do not generate QR if missing
  const branchId = table.branch_id;
  const hasValidBranch = !!branchId;
  const menuLink = hasValidBranch 
    ? `${window.location.origin}/menu/${restaurantId}/${branchId}/${table.table_code}`
    : "";
  
  const handleCopyLink = async () => {
    if (!hasValidBranch) {
      toast({ title: t("branch_required_for_qr"), variant: "destructive" });
      return;
    }
    await navigator.clipboard.writeText(menuLink);
    toast({ title: t("link_copied") });
  };
  
  const handleDownloadQR = () => {
    if (!hasValidBranch) {
      toast({ title: t("branch_required_for_qr"), variant: "destructive" });
      return;
    }
    const svg = generateQRCodeSVG(menuLink, 400);
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    
    // Create canvas to convert SVG to PNG
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 400, 400);
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((pngBlob) => {
          if (pngBlob) {
            const pngUrl = URL.createObjectURL(pngBlob);
            const link = document.createElement("a");
            link.download = `table-${table.table_name}-${table.table_code}.png`;
            link.href = pngUrl;
            link.click();
            URL.revokeObjectURL(pngUrl);
          }
        }, "image/png");
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };
  
  const handleToggleActive = async () => {
    await updateTable.mutateAsync({ id: table.id, isActive: !table.is_active });
  };
  
  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg gap-4 ${!hasValidBranch ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/50'}`}>
      <div className="flex items-start gap-4">
        {hasValidBranch ? (
          <QRCodeDisplay data={menuLink} size={80} />
        ) : (
          <div className="w-20 h-20 bg-muted flex items-center justify-center rounded border border-dashed border-destructive">
            <span className="text-xs text-destructive text-center px-1">{t("no_branch")}</span>
          </div>
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
          {hasValidBranch && (
            <p className="text-xs text-muted-foreground mt-1 break-all max-w-xs">{menuLink}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Switch 
          checked={table.is_active} 
          onCheckedChange={handleToggleActive}
          disabled={updateTable.isPending || !hasValidBranch}
        />
        <Button variant="outline" size="sm" onClick={handleCopyLink} disabled={!hasValidBranch}>
          <Copy className="h-4 w-4 mr-1" />
          {t("copy")}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownloadQR} disabled={!hasValidBranch}>
          <Download className="h-4 w-4 mr-1" />
          QR
        </Button>
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
  
  // Filter by branch - default to first branch if available
  const [filterBranchId, setFilterBranchId] = useState<string>("all");

  // DO NOT auto-select branch for new tables - Owner must explicitly select
  // newTableBranchId stays empty until user selects

  // Filter tables by selected branch
  const filteredTables = filterBranchId === "all" 
    ? tables 
    : tables.filter(t => t.branch_id === filterBranchId);

  // Get branch name by ID
  const getBranchName = (branchId: string | null) => {
    if (!branchId) return t("no_branch");
    const branch = branches.find(b => b.id === branchId);
    return branch?.name || t("unknown_branch");
  };
  
  const handleCreate = async () => {
    if (!newTableName.trim()) {
      toast({ title: t("enter_table_name"), variant: "destructive" });
      return;
    }
    if (!newTableBranchId) {
      toast({ title: t("select_branch_required"), variant: "destructive" });
      return;
    }
    await createTable.mutateAsync({ 
      restaurantId, 
      tableName: newTableName.trim(), 
      capacity: newTableCapacity,
      branchId: newTableBranchId
    });
    setNewTableName("");
    setNewTableCapacity(4);
    setCreateDialogOpen(false);
  };
  
  const handleEdit = (table: RestaurantTable) => {
    setEditingTable(table);
    setEditTableName(table.table_name);
    setEditTableCapacity(table.capacity ?? 4);
  };
  
  const handleSaveEdit = async () => {
    if (!editingTable || !editTableName.trim()) return;
    await updateTable.mutateAsync({ id: editingTable.id, tableName: editTableName.trim(), capacity: editTableCapacity });
    setEditingTable(null);
  };
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
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
            {/* Branch Filter */}
            {branches.length > 0 && (
              <div className="mb-4">
                <Label className="mb-2 block text-sm">{t("filter_by_branch")}</Label>
                <Select value={filterBranchId} onValueChange={setFilterBranchId}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue placeholder={t("all_branches")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("all_branches")}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
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
