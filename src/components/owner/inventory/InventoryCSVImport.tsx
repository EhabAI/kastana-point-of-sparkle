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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useOwnerContext } from "@/hooks/useOwnerContext";
import { OwnerContextIndicator, OwnerContextInlineWarning } from "@/components/owner/OwnerContextGuard";
import { Upload, Loader2, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

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
  success: boolean;
  itemsCreated: number;
  unitsCreated: number;
  stockEntriesCreated: number;
  stockEntriesSkipped: number;
  errors: string[];
}

// Map edge function error codes to user-friendly messages
function getImportErrorMessage(code: string, t: (key: string) => string): string {
  const errorMap: Record<string, string> = {
    missing_auth: t("auth_required"),
    invalid_token: t("session_expired"),
    not_authorized: t("not_authorized"),
    inventory_disabled: t("inv_module_disabled"),
    subscription_expired: t("subscription_expired"),
    server_error: t("server_error"),
  };
  return errorMap[code] || t("inv_import_failed");
}

async function tryParseFunctionError(err: unknown): Promise<{ code?: string; message?: string; status?: number }> {
  try {
    const e = err as any;
    const res: Response | undefined = e?.context?.response;
    const status = typeof res?.status === "number" ? res.status : undefined;
    const payload = res ? await res.clone().json().catch(() => null) : null;

    // `subscription-guard` returns: { error: "Subscription expired", code: "SUBSCRIPTION_EXPIRED" }
    if (payload?.code === "SUBSCRIPTION_EXPIRED") {
      return { code: "subscription_expired", message: payload?.error, status };
    }

    // Some functions use: { success:false, error: "not_authorized" }
    if (typeof payload?.error === "string") {
      return { code: payload.error, message: payload?.message, status };
    }

    return { status };
  } catch {
    return {};
  }
}

export function InventoryCSVImport({ restaurantId, open, onOpenChange }: InventoryCSVImportProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Use owner context for branch validation
  const { branchId, branchName, restaurantName, isContextReady } = useOwnerContext();

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
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      if (row.name && row.base_unit && row.branch_name) {
        rows.push(row as unknown as CSVRow);
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
    if (!isContextReady) {
      toast({ title: t("select_branch_first"), variant: "destructive" });
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
      const csvRows = parseCSV(text);

      if (csvRows.length === 0) {
        toast({ title: t("csv_empty"), variant: "destructive" });
        setIsProcessing(false);
        return;
      }

      // Transform CSV rows to edge function format
      const rows = csvRows.map((row) => ({
        name: row.name,
        category: row.category || null,
        baseUnit: row.base_unit,
        branchName: row.branch_name,
        quantity: parseFloat(row.quantity || "0") || 0,
        minLevel: parseFloat(row.min_level || "0") || 0,
        reorderPoint: parseFloat(row.reorder_point || "0") || 0,
      }));

      // Call the dedicated CSV import edge function with restaurant and branch context
      const { data, error } = await supabase.functions.invoke("inventory-csv-import", {
        body: { restaurant_id: restaurantId, branch_id: branchId, rows },
      });

      if (error) {
        console.error("[CSV Import] Edge function error:", error);

        const parsed = await tryParseFunctionError(error);
        const friendly = parsed.code ? getImportErrorMessage(parsed.code, t) : t("server_error");

        toast({
          title: t("inv_import_failed"),
          description: friendly,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Handle error response from edge function
      if (!data?.success && data?.error) {
        const errorMsg = getImportErrorMessage(data.error, t);
        toast({
          title: t("inv_import_failed"),
          description: errorMsg,
          variant: "destructive",
        });
        setIsProcessing(false);
        return;
      }

      // Set results from edge function response
      const result: ImportResult = {
        success: data.success,
        itemsCreated: data.itemsCreated || 0,
        unitsCreated: data.unitsCreated || 0,
        stockEntriesCreated: data.stockEntriesCreated || 0,
        stockEntriesSkipped: data.stockEntriesSkipped || 0,
        errors: data.errors || [],
      };

      setResults(result);

      // Invalidate all inventory-related queries
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-units"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-stock"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-items"] });

      // Show success toast with summary
      const hasChanges = result.itemsCreated > 0 || result.stockEntriesCreated > 0 || result.unitsCreated > 0;
      
      if (hasChanges || result.stockEntriesSkipped > 0) {
        const parts: string[] = [];
        if (result.itemsCreated > 0) parts.push(`${result.itemsCreated} ${t("items_created")}`);
        if (result.unitsCreated > 0) parts.push(`${result.unitsCreated} ${t("inv_units_created")}`);
        if (result.stockEntriesCreated > 0) parts.push(`${result.stockEntriesCreated} ${t("inv_stock_added")}`);
        if (result.stockEntriesSkipped > 0) parts.push(`${result.stockEntriesSkipped} ${t("inv_items_skipped_existing")}`);
        
        toast({
          title: t("inv_import_complete"),
          description: parts.join("، "),
        });
      }
    } catch (error: unknown) {
      console.error("[CSV Import] Unexpected error:", error);
      toast({
        title: t("inv_import_failed"),
        description: t("server_error"),
        variant: "destructive",
      });
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

  const hasAnyResults = results && (
    results.itemsCreated > 0 ||
    results.unitsCreated > 0 ||
    results.stockEntriesCreated > 0 ||
    results.stockEntriesSkipped > 0
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("inv_import_csv")}</DialogTitle>
          <DialogDescription>{t("inv_import_csv_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Context indicator - shows which restaurant/branch this will apply to */}
          {isContextReady ? (
            <OwnerContextIndicator restaurantName={restaurantName} branchName={branchName} />
          ) : (
            <OwnerContextInlineWarning />
          )}
          
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

              {/* Import Results Summary */}
              {results && (
                <div className="space-y-2">
                  {hasAnyResults && (
                    <div className="text-sm bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 p-3 rounded space-y-1.5">
                      <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium mb-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>{t("inv_import_complete")}</span>
                      </div>
                      {results.itemsCreated > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="text-xs">✓</span>
                          <span>{results.itemsCreated} {t("items_created")}</span>
                        </div>
                      )}
                      {results.unitsCreated > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="text-xs">✓</span>
                          <span>{results.unitsCreated} {t("inv_units_created")}</span>
                        </div>
                      )}
                      {results.stockEntriesCreated > 0 && (
                        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                          <span className="text-xs">✓</span>
                          <span>{results.stockEntriesCreated} {t("inv_stock_added")}</span>
                        </div>
                      )}
                      {results.stockEntriesSkipped > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                          <span className="text-xs">⏭</span>
                          <span>{results.stockEntriesSkipped} {t("inv_items_skipped_existing")}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Only show errors if there are actual errors */}
                  {results.errors.length > 0 && (
                    <div className="text-sm text-destructive bg-destructive/10 p-2 rounded max-h-24 overflow-y-auto">
                      <p className="font-medium text-xs mb-1">{results.errors.length} {t("errors")}:</p>
                      {results.errors.slice(0, 10).map((err, i) => (
                        <div key={i} className="text-xs">
                          • {err}
                        </div>
                      ))}
                      {results.errors.length > 10 && (
                        <div className="text-xs mt-1 opacity-75">
                          +{results.errors.length - 10} {t("more_errors")}
                        </div>
                      )}
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
          {!showWarning && !results && (
            <Button onClick={handleStartImport} disabled={isProcessing || !file || !isContextReady}>
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
              {t("inv_import")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
