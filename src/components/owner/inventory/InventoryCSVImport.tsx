import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryUnits, useCreateInventoryItem, useInventoryItems } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getOwnerErrorMessage } from "@/lib/ownerErrorHandler";
import { Upload, Loader2, FileText, AlertTriangle } from "lucide-react";

interface InventoryCSVImportProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVRow {
  name: string;
  category?: string;
  base_unit: string;
  branch_name: string;
  quantity?: string;
  min_level?: string;
  reorder_point?: string;
}

interface ImportResult {
  itemsCreated: number;
  itemsReused: number;
  transactionsCreated: number;
  transactionsSkipped: number;
  errors: string[];
}

// Helper to map error codes to user-friendly messages
function getTransactionErrorMessage(code: string, t: (key: string) => string): string {
  const errorMap: Record<string, string> = {
    insufficient_stock: t("inv_insufficient_stock"),
    invalid_item: t("inv_invalid_item"),
    invalid_branch: t("inv_invalid_branch"),
    inventory_disabled: t("inv_module_disabled"),
    subscription_expired: t("subscription_expired"),
    server_error: t("server_error"),
  };
  return errorMap[code] || t("inv_transaction_failed");
}

export function InventoryCSVImport({ restaurantId, open, onOpenChange }: InventoryCSVImportProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);
  const { data: existingItems = [] } = useInventoryItems(restaurantId);
  const createItem = useCreateInventoryItem();

  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<ImportResult | null>(null);
  const [showWarning, setShowWarning] = useState(false);

  const parseCSV = (text: string): CSVRow[] => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const rows: CSVRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      if (row.name && row.base_unit && row.branch_name) {
        rows.push(row);
      }
    }

    return rows;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
      setShowWarning(false);
    }
  };

  const handleStartImport = () => {
    if (!file) {
      toast({ title: t("inv_select_file"), variant: "destructive" });
      return;
    }
    setShowWarning(true);
  };

  const handleConfirmImport = async () => {
    if (!file) return;

    setShowWarning(false);
    setIsProcessing(true);
    setResults(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({ title: t("csv_empty"), variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      let itemsCreated = 0;
      let itemsReused = 0;
      let transactionsCreated = 0;
      let transactionsSkipped = 0;
      const errors: string[] = [];

      for (const row of rows) {
        // Find branch by name
        const branch = branches.find(
          (b) => b.name.toLowerCase() === row.branch_name?.toLowerCase()
        );

        if (!branch) {
          errors.push(`${row.name}: ${t("inv_branch_not_found")} "${row.branch_name}"`);
          continue;
        }

        // Find unit by name
        const unit = units.find(
          (u) => u.name.toLowerCase() === row.base_unit?.toLowerCase()
        );

        if (!unit) {
          errors.push(`${row.name}: ${t("inv_unit_not_found")} "${row.base_unit}"`);
          continue;
        }

        // Check if item exists (by name + base_unit + branch)
        let existingItem = existingItems.find(
          (item) =>
            item.name.toLowerCase() === row.name.toLowerCase() &&
            item.baseUnitId === unit.id &&
            item.branchId === branch.id
        );

        // If item doesn't exist, check for name + unit mismatch in same branch
        if (!existingItem) {
          const itemWithSameName = existingItems.find(
            (item) =>
              item.name.toLowerCase() === row.name.toLowerCase() &&
              item.branchId === branch.id
          );

          if (itemWithSameName && itemWithSameName.baseUnitId !== unit.id) {
            errors.push(
              `${row.name}: ${t("inv_unit_mismatch")} (${t("existing")}: ${itemWithSameName.baseUnitName}, CSV: ${row.base_unit})`
            );
            continue;
          }
        }

        let itemId = existingItem?.id;

        // Create item if not exists
        if (!existingItem) {
          try {
            const newItem = await createItem.mutateAsync({
              restaurantId,
              branchId: branch.id,
              name: row.name,
              baseUnitId: unit.id,
              minLevel: parseFloat(row.min_level || "0") || 0,
              reorderPoint: parseFloat(row.reorder_point || "0") || 0,
            });
            itemId = newItem.id;
            itemsCreated++;
          } catch (err: any) {
            errors.push(`${row.name}: ${err.message}`);
            continue;
          }
        } else {
          itemsReused++;
        }

        // Create transaction if quantity > 0
        const quantity = parseFloat(row.quantity || "0");
        if (quantity > 0 && itemId) {
          try {
            const { data, error } = await supabase.functions.invoke(
              "inventory-create-transaction",
              {
                body: {
                  itemId,
                  branchId: branch.id,
                  txnType: "INITIAL_STOCK",
                  qty: quantity,
                  unitId: unit.id,
                  notes: t("csv_import"),
                  skipIfHasStock: true, // Skip if item already has transactions
                },
              }
            );

            // Handle response - edge function always returns 200 for business logic
            if (error) {
              // Network or system error
              errors.push(`${row.name}: ${t("inv_transaction_failed")}`);
            } else if (data?.success) {
              if (data.skipped) {
                // Item already has stock - this is expected, not an error
                transactionsSkipped++;
              } else {
                transactionsCreated++;
              }
            } else if (data?.error) {
              // Business logic error from edge function
              const errorCode = data.error.code || "unknown";
              const errorMsg = getTransactionErrorMessage(errorCode, t);
              errors.push(`${row.name}: ${errorMsg}`);
            }
          } catch (err: unknown) {
            // Catch any unexpected errors gracefully
            console.error("[CSV Import] Transaction error:", err);
            errors.push(`${row.name}: ${t("inv_transaction_failed")}`);
          }
        }
      }

      setResults({ itemsCreated, itemsReused, transactionsCreated, transactionsSkipped, errors });

      // Show success toast with summary
      const hasChanges = itemsCreated > 0 || transactionsCreated > 0;
      const hasSkipped = transactionsSkipped > 0;
      
      if (hasChanges || hasSkipped) {
        const parts: string[] = [];
        if (itemsCreated > 0) parts.push(`${itemsCreated} ${t("items_created")}`);
        if (transactionsCreated > 0) parts.push(`${transactionsCreated} ${t("inv_stock_added")}`);
        if (transactionsSkipped > 0) parts.push(`${transactionsSkipped} ${t("inv_items_skipped_existing")}`);
        
        toast({
          title: t("inv_import_complete"),
          description: parts.join("، "),
        });
      }
    } catch (error: unknown) {
      const msg = getOwnerErrorMessage(error, t);
      toast({ title: msg.title, description: msg.description, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    setShowWarning(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("inv_import_csv")}</DialogTitle>
          <DialogDescription>{t("inv_import_csv_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Alert - Before Import */}
          {showWarning && (
            <Alert variant="destructive" className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-800 dark:text-amber-400">
                {t("inv_import_warning_title")}
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {t("inv_import_warning_msg")}
              </AlertDescription>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowWarning(false)}
                >
                  {t("cancel")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleConfirmImport}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {t("inv_confirm_import")}
                </Button>
              </div>
            </Alert>
          )}

          {!showWarning && (
            <>
              <div className="space-y-2">
                <Label>{t("inv_csv_file")}</Label>
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {file ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{file.name}</span>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{t("inv_click_to_upload")}</p>
                    </>
                  )}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p className="font-medium mb-1">{t("inv_csv_columns")}:</p>
                <code className="text-[10px] bg-muted px-1 py-0.5 rounded block">
                  name, category, base_unit, branch_name, quantity, min_level, reorder_point
                </code>
                <p className="mt-2 text-[10px] opacity-75">
                  {t("inv_csv_note_quantity")}
                </p>
              </div>

              {results && (
                <div className="space-y-2">
                  {(results.itemsCreated > 0 || results.itemsReused > 0 || results.transactionsCreated > 0 || results.transactionsSkipped > 0) && (
                    <div className="text-sm bg-muted/50 p-3 rounded space-y-1.5">
                      {results.itemsCreated > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="text-xs">✓</span>
                          <span>{results.itemsCreated} {t("items_created")}</span>
                        </div>
                      )}
                      {results.itemsReused > 0 && (
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                          <span className="text-xs">✓</span>
                          <span>{results.itemsReused} {t("inv_items_reused")}</span>
                        </div>
                      )}
                      {results.transactionsCreated > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="text-xs">✓</span>
                          <span>{results.transactionsCreated} {t("inv_stock_added")}</span>
                        </div>
                      )}
                      {results.transactionsSkipped > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <span className="text-xs">⏭</span>
                          <span>{results.transactionsSkipped} {t("inv_items_skipped_existing")}</span>
                        </div>
                      )}
                    </div>
                  )}
                  {results.errors.length > 0 && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded max-h-24 overflow-y-auto">
                      {results.errors.map((err, i) => (
                        <div key={i} className="text-xs">
                          • {err}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("close")}
          </Button>
          {!showWarning && (
            <Button onClick={handleStartImport} disabled={isProcessing || !file}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
              {t("inv_import")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}