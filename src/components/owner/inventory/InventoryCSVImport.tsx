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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { useInventoryUnits, useCreateInventoryItem } from "@/hooks/useInventoryItems";
import { useToast } from "@/hooks/use-toast";
import { Upload, Loader2, FileText } from "lucide-react";

interface InventoryCSVImportProps {
  restaurantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface CSVRow {
  name: string;
  base_unit: string;
  min_level: string;
  reorder_point: string;
}

export function InventoryCSVImport({ restaurantId, open, onOpenChange }: InventoryCSVImportProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: branches = [] } = useBranches(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);
  const createItem = useCreateInventoryItem();

  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<{ created: number; errors: string[] } | null>(null);

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
      if (row.name) {
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
    }
  };

  const handleImport = async () => {
    if (!file || !selectedBranch) {
      toast({ title: t("inv_select_branch_file"), variant: "destructive" });
      return;
    }

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

      let created = 0;
      const errors: string[] = [];

      for (const row of rows) {
        // Find unit by name
        const unit = units.find(
          (u) => u.name.toLowerCase() === row.base_unit?.toLowerCase()
        );

        if (!unit) {
          errors.push(`${row.name}: ${t("inv_unit_not_found")} "${row.base_unit}"`);
          continue;
        }

        try {
          await createItem.mutateAsync({
            restaurantId,
            branchId: selectedBranch,
            name: row.name,
            baseUnitId: unit.id,
            minLevel: parseFloat(row.min_level) || 0,
            reorderPoint: parseFloat(row.reorder_point) || 0,
          });
          created++;
        } catch (err: any) {
          errors.push(`${row.name}: ${err.message}`);
        }
      }

      setResults({ created, errors });

      if (created > 0) {
        toast({
          title: t("inv_import_success"),
          description: `${created} ${t("items_created")}`,
        });
      }
    } catch (error: any) {
      toast({ title: error.message || t("inv_import_failed"), variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setSelectedBranch("");
    setResults(null);
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
          <div className="space-y-2">
            <Label>{t("branch")}</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder={t("select_branch_required")} />
              </SelectTrigger>
              <SelectContent>
                {branches.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded">
              name, base_unit, min_level, reorder_point
            </code>
          </div>

          {results && (
            <div className="space-y-2">
              {results.created > 0 && (
                <div className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 p-2 rounded">
                  ✓ {results.created} {t("items_created")}
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t("close")}
          </Button>
          <Button onClick={handleImport} disabled={isProcessing || !file || !selectedBranch}>
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />}
            {t("inv_import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
