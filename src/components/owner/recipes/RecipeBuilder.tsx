import { useState, useEffect, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogBody } from "@/components/ui/dialog";
import { Trash2, Plus, Save, ChefHat, Search, Package, AlertCircle, Upload, FileText, CheckCircle2, XCircle, ArrowLeft, Loader2, Filter, PartyPopper } from "lucide-react";
import { useAllMenuItems } from "@/hooks/useMenuItems";
import { useInventoryItems, useInventoryUnits } from "@/hooks/useInventoryItems";
import { useRecipeByMenuItem, useUpsertRecipe } from "@/hooks/useRecipes";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { RecipeHowItWorksHint } from "./RecipeHowItWorksHint";
import { useOwnerContext } from "@/hooks/useOwnerContext";
import { OwnerContextGuard, OwnerContextIndicator } from "@/components/owner/OwnerContextGuard";
import { parseEdgeFunctionError } from "@/lib/ownerErrorHandler";

interface RecipeBuilderProps {
  restaurantId: string;
  branchId?: string; // Optional prop, will use context if not provided
  currency?: string;
}

interface RecipeLineInput {
  id: string;
  inventory_item_id: string;
  qty: string;
  unit_id: string;
}

interface ParsedRecipeRow {
  rowIndex: number;
  menu_item_name: string;
  inventory_item_name: string;
  quantity: string;
  unit: string;
  isValid: boolean;
  error?: string;
}

interface ImportError {
  menu_item_name: string;
  inventory_item_name: string;
  reason: string;
  reason_code: string;
}

interface ImportResult {
  success: boolean;
  recipes_created: number;
  recipes_failed: number;
  total_rows: number;
  errors: ImportError[];
}

const REQUIRED_HEADERS = ["menu_item_name", "inventory_item_name", "quantity", "unit"];

export function RecipeBuilder({ restaurantId, branchId: propBranchId, currency = "JOD" }: RecipeBuilderProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";
  
  // Use owner context for branch validation
  const ownerContext = useOwnerContext();
  const effectiveBranchId = propBranchId || ownerContext.branchId;

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [menuSearch, setMenuSearch] = useState("");
  const [recipeFilter, setRecipeFilter] = useState<"all" | "with_recipe" | "without_recipe">("all");
  const [lines, setLines] = useState<RecipeLineInput[]>([]);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  
  // CSV Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRecipeRow[]>([]);
  const [headerError, setHeaderError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setHeaderError(null);
    setParsedRows([]);
    setShowPreview(false);
  };

  const handleOpenImportModal = () => {
    setSelectedFile(null);
    setHeaderError(null);
    setParsedRows([]);
    setShowPreview(false);
    setShowResult(false);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setIsImportModalOpen(true);
  };

  const handleCloseImportModal = () => {
    setIsImportModalOpen(false);
    setSelectedFile(null);
    setHeaderError(null);
    setParsedRows([]);
    setShowPreview(false);
    setShowResult(false);
    setImportResult(null);
  };

  const parseCSV = (text: string): { headers: string[]; rows: string[][] } => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseRow = (row: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;
      
      for (let i = 0; i < row.length; i++) {
        const char = row[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseRow(lines[0]).map(h => h.toLowerCase().trim());
    const rows = lines.slice(1).map(parseRow);
    
    return { headers, rows };
  };

  const validateRow = (row: string[], headers: string[], rowIndex: number): ParsedRecipeRow => {
    const getColumnValue = (columnName: string): string => {
      const index = headers.indexOf(columnName);
      return index >= 0 && row[index] ? row[index].trim() : "";
    };

    const menu_item_name = getColumnValue("menu_item_name");
    const inventory_item_name = getColumnValue("inventory_item_name");
    const quantity = getColumnValue("quantity");
    const unit = getColumnValue("unit");

    // Validation
    const errors: string[] = [];
    
    if (!menu_item_name) {
      errors.push(t("csv_error_menu_item_required"));
    }
    if (!inventory_item_name) {
      errors.push(t("csv_error_inventory_item_required"));
    }
    if (!quantity) {
      errors.push(t("csv_error_quantity_required"));
    } else {
      const qtyNum = parseFloat(quantity);
      if (isNaN(qtyNum) || qtyNum <= 0) {
        errors.push(t("csv_error_quantity_invalid"));
      }
    }
    if (!unit) {
      errors.push(t("csv_error_unit_required"));
    }

    return {
      rowIndex,
      menu_item_name,
      inventory_item_name,
      quantity,
      unit,
      isValid: errors.length === 0,
      error: errors.length > 0 ? errors.join(", ") : undefined,
    };
  };

  const handleContinueImport = async () => {
    if (!selectedFile) return;

    try {
      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);

      // Validate headers
      const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, "_"));
      const missingHeaders = REQUIRED_HEADERS.filter(h => !normalizedHeaders.includes(h));
      
      if (missingHeaders.length > 0) {
        setHeaderError(t("csv_headers_missing") + ": " + missingHeaders.join(", "));
        return;
      }

      // Parse and validate each row
      const parsed = rows.map((row, index) => validateRow(row, normalizedHeaders, index + 2));
      setParsedRows(parsed);
      setShowPreview(true);
      setHeaderError(null);
    } catch (error) {
      console.error("Error parsing CSV:", error);
      setHeaderError(t("csv_parse_error"));
    }
  };

  const handleBackToUpload = () => {
    setShowPreview(false);
    setParsedRows([]);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0 || isImporting) return;
    
    // Validate context before import
    if (!effectiveBranchId) {
      toast({
        title: language === "ar" ? "يرجى اختيار فرع أولاً" : "Please select a branch first",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Send ALL rows to the backend - it will do the full validation
      const rowsToImport = parsedRows.filter(r => r.isValid).map(row => ({
        menu_item_name: row.menu_item_name,
        inventory_item_name: row.inventory_item_name,
        quantity: parseFloat(row.quantity),
        unit: row.unit,
      }));

      const response = await supabase.functions.invoke("recipe-csv-import", {
        body: {
          restaurant_id: restaurantId,
          branch_id: effectiveBranchId,
          rows: rowsToImport,
        },
      });

      if (response.error) {
        // Try to parse bilingual error
        const parsed = parseEdgeFunctionError(response.error, language as "ar" | "en");
        throw new Error(parsed?.title || response.error.message || t("csv_import_failed"));
      }

      const result: ImportResult = response.data;
      
      // Check for API-level errors with bilingual messages
      if (!result.success && response.data?.message_en) {
        const errorMsg = language === "ar" ? response.data.message_ar : response.data.message_en;
        throw new Error(errorMsg);
      }
      
      setImportResult(result);
      setShowPreview(false);
      setShowResult(true);

      // Invalidate recipes query to refresh data
      queryClient.invalidateQueries({ queryKey: ["recipes", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["recipe"] });
      queryClient.invalidateQueries({ queryKey: ["all-recipes-menu-items", restaurantId] });

      // Invalidate recipes query to refresh data
      queryClient.invalidateQueries({ queryKey: ["recipes", restaurantId] });
      queryClient.invalidateQueries({ queryKey: ["recipe"] });
      queryClient.invalidateQueries({ queryKey: ["all-recipes-menu-items", restaurantId] });

      // Only show toast for fully successful imports
      if (result.success && result.recipes_created > 0) {
        toast({
          title: t("csv_import_success"),
          description: `${t("recipes_created")}: ${result.recipes_created}`,
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("csv_import_failed"),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const validRowsCount = parsedRows.filter(r => r.isValid).length;
  const invalidRowsCount = parsedRows.filter(r => !r.isValid).length;
  // Allow import if there are valid rows (backend will do full validation)
  const canImport = validRowsCount > 0;

  const { data: menuItems = [], isLoading: loadingMenuItems } = useAllMenuItems(restaurantId);
  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);
  const { data: existingRecipe, isLoading: loadingRecipe } = useRecipeByMenuItem(restaurantId, selectedMenuItemId, effectiveBranchId);
  const upsertRecipe = useUpsertRecipe();

  // Fetch all recipes to know which menu items have recipes
  const { data: allRecipes = [] } = useQuery({
    queryKey: ["all-recipes-menu-items", restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_item_recipes")
        .select("menu_item_id")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });

  const menuItemsWithRecipes = new Set(allRecipes.map(r => r.menu_item_id));

  // Filter menu items by search and recipe filter
  const filteredMenuItems = menuItems.filter((item) => {
    // Text search filter
    const matchesSearch = item.name.toLowerCase().includes(menuSearch.toLowerCase());
    
    // Recipe filter
    const hasRecipe = menuItemsWithRecipes.has(item.id);
    let matchesRecipeFilter = true;
    if (recipeFilter === "with_recipe") {
      matchesRecipeFilter = hasRecipe;
    } else if (recipeFilter === "without_recipe") {
      matchesRecipeFilter = !hasRecipe;
    }
    
    return matchesSearch && matchesRecipeFilter;
  });

  // Load existing recipe when menu item changes
  useEffect(() => {
    if (existingRecipe) {
      setLines(
        existingRecipe.lines.map((l) => ({
          id: l.id,
          inventory_item_id: l.inventory_item_id,
          qty: String(l.qty),
          unit_id: l.unit_id,
        }))
      );
      setNotes(existingRecipe.notes || "");
      setIsActive(existingRecipe.is_active);
      setHasChanges(false);
    } else if (selectedMenuItemId && !loadingRecipe) {
      setLines([]);
      setNotes("");
      setIsActive(true);
      setHasChanges(false);
    }
  }, [existingRecipe, selectedMenuItemId, loadingRecipe]);

  const addLine = useCallback(() => {
    setLines((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        inventory_item_id: "",
        qty: "",
        unit_id: "",
      },
    ]);
    setHasChanges(true);
  }, []);

  const removeLine = useCallback((id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
    setHasChanges(true);
  }, []);

  const updateLine = useCallback((id: string, field: keyof RecipeLineInput, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
    setHasChanges(true);
  }, []);

  const handleSave = async () => {
    if (!selectedMenuItemId || !effectiveBranchId) return;

    // Validate lines
    const validLines = lines.filter(
      (l) => l.inventory_item_id && l.qty && l.unit_id && Number(l.qty) > 0
    );

    // Check for duplicates
    const itemIds = validLines.map((l) => l.inventory_item_id);
    const hasDuplicates = itemIds.length !== new Set(itemIds).size;

    if (hasDuplicates) {
      return; // Show error handled by validation display
    }

    await upsertRecipe.mutateAsync({
      restaurant_id: restaurantId,
      branch_id: effectiveBranchId,
      menu_item_id: selectedMenuItemId,
      lines: validLines.map((l) => ({
        inventory_item_id: l.inventory_item_id,
        qty: Number(l.qty),
        unit_id: l.unit_id,
      })),
      notes: notes || undefined,
      is_active: isActive,
    });

    setHasChanges(false);
  };

  const getInventoryItemName = (id: string) => {
    return inventoryItems.find((i) => i.id === id)?.name || "";
  };

  const getUnitName = (id: string) => {
    return units.find((u) => u.id === id)?.name || "";
  };

  // Check for duplicate ingredients
  const getDuplicateItems = () => {
    const itemCounts = lines.reduce((acc, l) => {
      if (l.inventory_item_id) {
        acc[l.inventory_item_id] = (acc[l.inventory_item_id] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    return Object.entries(itemCounts)
      .filter(([_, count]) => count > 1)
      .map(([id]) => id);
  };

  const duplicateItems = getDuplicateItems();
  const hasValidationErrors = duplicateItems.length > 0;

  const selectedMenuItem = menuItems.find((m) => m.id === selectedMenuItemId);

  // Block rendering if context is not ready
  if (!effectiveBranchId && !propBranchId) {
    return (
      <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
        <OwnerContextGuard contextMissing={ownerContext.contextMissing} />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Branch Context Indicator for CSV Import */}
      
      {/* CSV Import Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className={cn("sm:max-w-md", showPreview && "sm:max-w-4xl")}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("import_recipes_from_csv")}
            </DialogTitle>
          </DialogHeader>
          
          {/* Show branch context indicator */}
          {!showResult && !showPreview && ownerContext.restaurantName && ownerContext.branchName && (
            <div className="px-1">
              <OwnerContextIndicator 
                restaurantName={ownerContext.restaurantName} 
                branchName={ownerContext.branchName} 
              />
            </div>
          )}

          {showResult && importResult ? (
            // Result View - After Import
            <DialogBody className="space-y-4 py-4">
              {/* Success Summary */}
              {importResult.recipes_created > 0 && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                      <PartyPopper className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-800 dark:text-green-200">
                        {t("recipes_created_successfully")}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        {importResult.recipes_created} {t("recipes")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Failed Summary */}
              {importResult.recipes_failed > 0 && (
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                      <XCircle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="font-semibold text-destructive">
                        {t("recipes_failed")}
                      </p>
                      <p className="text-sm text-destructive/80">
                        {importResult.recipes_failed} {t("recipes")}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("csv_total_rows")}:</span>
                  <Badge variant="secondary">{importResult.total_rows}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("recipes_created")}:</span>
                  <Badge variant="default" className="bg-green-600">{importResult.recipes_created}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("recipes_failed")}:</span>
                  <Badge variant={importResult.recipes_failed > 0 ? "destructive" : "secondary"}>
                    {importResult.recipes_failed}
                  </Badge>
                </div>
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {t("import_errors")} ({importResult.errors.length})
                  </h4>
                  <div className="border border-destructive/30 rounded-lg bg-destructive/5 p-3 space-y-2">
                    {importResult.errors.map((error, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 bg-background border border-destructive/20 rounded-md text-sm"
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{t("menu_item")}:</span>
                            <span className="text-muted-foreground">{error.menu_item_name}</span>
                          </div>
                          {error.inventory_item_name && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{t("ingredient")}:</span>
                              <span className="text-muted-foreground">{error.inventory_item_name}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-destructive">
                            <span className="font-medium">{t("error")}:</span>
                            <span>{t(`csv_error_${error.reason_code}`) || error.reason}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </DialogBody>
          ) : !showPreview ? (
            // File Upload View
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{t("csv_headers_required")}:</p>
                <code className="text-xs bg-background px-2 py-1 rounded border block overflow-x-auto">
                  menu_item_name,inventory_item_name,quantity,unit
                </code>
              </div>
              
              {headerError && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{headerError}</span>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="csv-file">{t("select_csv_file")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="flex-1"
                  />
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{selectedFile.name}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Preview View
            <div className="space-y-4 py-4">
              {/* Summary */}
              <div className="flex flex-wrap gap-4 p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("csv_total_rows")}:</span>
                  <Badge variant="secondary">{parsedRows.length}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("csv_valid_rows")}:</span>
                  <Badge variant="default" className="bg-green-600">{validRowsCount}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("csv_invalid_rows")}:</span>
                  <Badge variant={invalidRowsCount > 0 ? "destructive" : "secondary"}>{invalidRowsCount}</Badge>
                </div>
              </div>

              {invalidRowsCount > 0 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <span className="text-sm">{t("csv_invalid_rows_warning")}</span>
                </div>
              )}

              {/* Preview Table */}
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>{t("menu_item")}</TableHead>
                      <TableHead>{t("ingredient")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                      <TableHead>{t("unit")}</TableHead>
                      <TableHead className="w-[200px]">{t("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row) => (
                      <TableRow key={row.rowIndex} className={cn(!row.isValid && "bg-destructive/5")}>
                        <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                        <TableCell>{row.menu_item_name || "-"}</TableCell>
                        <TableCell>{row.inventory_item_name || "-"}</TableCell>
                        <TableCell>{row.quantity || "-"}</TableCell>
                        <TableCell>{row.unit || "-"}</TableCell>
                        <TableCell>
                          {row.isValid ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm">{t("csv_row_valid")}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-destructive">
                              <XCircle className="h-4 w-4 shrink-0" />
                              <span className="text-sm truncate" title={row.error}>{row.error}</span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {showResult ? (
              <Button onClick={handleCloseImportModal}>
                {t("close")}
              </Button>
            ) : showPreview ? (
              <>
                <Button variant="outline" onClick={handleBackToUpload} className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  {t("back")}
                </Button>
                <Button 
                  disabled={!canImport || isImporting}
                  onClick={handleImport}
                  className="gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t("importing")}
                    </>
                  ) : (
                    <>
                      {t("import")} ({validRowsCount} {t("rows")})
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleCloseImportModal}>
                  {t("cancel")}
                </Button>
                <Button 
                  onClick={handleContinueImport} 
                  disabled={!selectedFile}
                  className="gap-2"
                >
                  {t("continue")}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Menu Item Selection */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" />
              {t("recipe_builder")}
            </CardTitle>
            <CardDescription>{t("recipe_builder_desc")}</CardDescription>
            {/* Static note about inventory deduction */}
            <p className="text-xs text-muted-foreground mt-2">
              {t("recipe_note")}
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleOpenImportModal}
            className="gap-2 shrink-0"
          >
            <Upload className="h-4 w-4" />
            {t("import_csv_recipes")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* First-time how it works hint */}
          <RecipeHowItWorksHint />
          <div className="space-y-3">
            <Label>{t("select_menu_item")}</Label>
            
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search_menu_items")}
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select 
                value={recipeFilter} 
                onValueChange={(value: "all" | "with_recipe" | "without_recipe") => setRecipeFilter(value)}
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {language === "ar" ? "الكل" : "All"}
                  </SelectItem>
                  <SelectItem value="with_recipe">
                    {language === "ar" ? "أصناف لها وصفة" : "With Recipe"}
                  </SelectItem>
                  <SelectItem value="without_recipe">
                    {language === "ar" ? "أصناف بلا وصفة" : "Without Recipe"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Menu Items List - Always visible */}
            <ScrollArea className="h-64 border rounded-md">
              {loadingMenuItems ? (
                <div className="p-4 text-center text-muted-foreground">{t("loading")}</div>
              ) : filteredMenuItems.length === 0 ? (
                <div className="p-8 text-center">
                  {recipeFilter === "without_recipe" ? (
                    <div className="flex flex-col items-center gap-2">
                      <PartyPopper className="h-8 w-8 text-emerald-500" />
                      <p className="text-sm font-medium text-emerald-600">
                        {language === "ar" ? "لا توجد أصناف بدون وصفة 🎉" : "No items without recipes 🎉"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">{t("no_results")}</p>
                  )}
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredMenuItems.map((item) => {
                    const hasRecipe = menuItemsWithRecipes.has(item.id);
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedMenuItemId(item.id);
                        }}
                        className={cn(
                          "w-full text-start p-3 rounded-md hover:bg-accent transition-colors flex items-center justify-between",
                          selectedMenuItemId === item.id && "bg-primary/10 ring-1 ring-primary/30"
                        )}
                      >
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.price} {currency}
                          </div>
                        </div>
                        {hasRecipe ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {language === "ar" ? "وصفة" : "Recipe"}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {language === "ar" ? "بلا وصفة" : "No Recipe"}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

          {selectedMenuItem && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{selectedMenuItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedMenuItem.price} {currency}
                </div>
              </div>
              {existingRecipe && (
                <Badge variant="secondary" className="ms-auto">
                  {t("recipe_exists")}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recipe Lines */}
      {selectedMenuItemId && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("ingredients")}</CardTitle>
              <CardDescription>{t("ingredients_desc")}</CardDescription>
              {/* Static note in recipe edit area */}
              <p className="text-xs text-muted-foreground mt-1">
                {t("recipe_note")}
              </p>
            </div>
            <Button onClick={addLine} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              {t("add_ingredient")}
            </Button>
          </CardHeader>
          <CardContent>
            {loadingRecipe ? (
              <div className="text-center py-8 text-muted-foreground">{t("loading")}</div>
            ) : lines.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed rounded-lg">
                <ChefHat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{t("no_recipe_defined")}</p>
                <Button onClick={addLine} variant="outline" className="mt-4 gap-2">
                  <Plus className="h-4 w-4" />
                  {t("add_first_ingredient")}
                </Button>
              </div>
            ) : (
              <>
                {hasValidationErrors && (
                  <div className="mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-5 w-5" />
                    <span>{t("duplicate_ingredients_error")}</span>
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">{t("ingredient")}</TableHead>
                      <TableHead>{t("quantity")}</TableHead>
                      <TableHead>{t("unit")}</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const isDuplicate = duplicateItems.includes(line.inventory_item_id);
                      return (
                        <TableRow
                          key={line.id}
                          className={cn(isDuplicate && "bg-destructive/5")}
                        >
                          <TableCell>
                            <Select
                              value={line.inventory_item_id}
                              onValueChange={(v) => updateLine(line.id, "inventory_item_id", v)}
                            >
                              <SelectTrigger className={cn(isDuplicate && "border-destructive")}>
                                <SelectValue placeholder={t("select_ingredient")} />
                              </SelectTrigger>
                              <SelectContent>
                                {loadingInventory ? (
                                  <SelectItem value="" disabled>
                                    {t("loading")}
                                  </SelectItem>
                                ) : (
                                  inventoryItems.map((item) => (
                                    <SelectItem key={item.id} value={item.id}>
                                      {item.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.001"
                              value={line.qty}
                              onChange={(e) => updateLine(line.id, "qty", e.target.value)}
                              placeholder="0.00"
                              className="w-24"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={line.unit_id}
                              onValueChange={(v) => updateLine(line.id, "unit_id", v)}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue placeholder={t("unit")} />
                              </SelectTrigger>
                              <SelectContent>
                                {units.map((unit) => (
                                  <SelectItem key={unit.id} value={unit.id}>
                                    {unit.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeLine(line.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </>
            )}

            {/* Notes and Active */}
            {lines.length > 0 && (
              <div className="mt-6 space-y-4 border-t pt-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recipe-active">{t("recipe_active")}</Label>
                  <Switch
                    id="recipe-active"
                    checked={isActive}
                    onCheckedChange={(v) => {
                      setIsActive(v);
                      setHasChanges(true);
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recipe-notes">{t("notes")}</Label>
                  <Textarea
                    id="recipe-notes"
                    value={notes}
                    onChange={(e) => {
                      setNotes(e.target.value);
                      setHasChanges(true);
                    }}
                    placeholder={t("recipe_notes_placeholder")}
                    rows={3}
                  />
                </div>
              </div>
            )}
          </CardContent>

          {lines.length > 0 && (
            <div className="p-4 border-t flex justify-end">
              <Button
                onClick={handleSave}
                disabled={upsertRecipe.isPending || hasValidationErrors || !hasChanges}
                className="gap-2 min-w-32"
              >
                <Save className="h-4 w-4" />
                {upsertRecipe.isPending ? t("saving") : t("save_recipe")}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
