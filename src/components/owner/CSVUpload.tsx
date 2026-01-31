import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOwnerContext } from '@/hooks/useOwnerContext';
import { OwnerContextIndicator, OwnerContextInlineWarning } from '@/components/owner/OwnerContextGuard';


interface CSVUploadProps {
  restaurantId: string;
}

interface MenuCSVRow {
  category_en: string;
  category_ar: string;
  item_en: string;
  item_ar: string;
  price: string;
  [key: string]: string;
}

interface OfferCSVRow {
  item_en: string;
  item_ar: string;
  price: string;
  description_en: string;
  description_ar: string;
  [key: string]: string;
}

const OFFERS_CATEGORY_NAME = 'العروض';

function parseCSV<T extends Record<string, string>>(csvText: string, expectedColumns: string[]): { rows: T[]; error: string | null } {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    return { rows: [], error: 'CSV file is empty or has no data rows' };
  }

  const headerLine = lines[0].replace(/\r/g, '');
  const headers = headerLine.split(',').map(h => h.trim().toLowerCase());

  // Validate columns
  const missingColumns = expectedColumns.filter(col => !headers.includes(col.toLowerCase()));
  if (missingColumns.length > 0) {
    return { rows: [], error: `Missing required columns: ${missingColumns.join(', ')}` };
  }

  const rows: T[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r/g, '').trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() || '';
    });
    
    rows.push(row as T);
  }

  return { rows, error: null };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result;
}

export function CSVUpload({ restaurantId }: CSVUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  
  // Use unified owner context for restaurant and branch validation
  const { branchId, branchName, restaurantName, isContextReady } = useOwnerContext();
  
  const [menuFileName, setMenuFileName] = useState<string | null>(null);
  const [offersFileName, setOffersFileName] = useState<string | null>(null);
  const [menuUploading, setMenuUploading] = useState(false);
  const [offersUploading, setOffersUploading] = useState(false);
  const [menuResult, setMenuResult] = useState<{ success: boolean; message: string } | null>(null);
  const [offersResult, setOffersResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const menuInputRef = useRef<HTMLInputElement>(null);
  const offersInputRef = useRef<HTMLInputElement>(null);
  
  // Use the globally selected branch from the BranchSelector
  const effectiveMenuBranchId = branchId;
  const effectiveOffersBranchId = branchId;

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['menu-categories'] });
    queryClient.invalidateQueries({ queryKey: ['menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['all-menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['branch-menu-items'] });
    queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
  };

  const handleMenuUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate branch selection
    if (!effectiveMenuBranchId) {
      setMenuResult({ success: false, message: t("select_branch_first") || 'Please select a branch first' });
      return;
    }

    setMenuFileName(file.name);
    setMenuUploading(true);
    setMenuResult(null);

    try {
      const text = await file.text();
      const { rows, error } = parseCSV<MenuCSVRow>(text, ['category_en', 'category_ar', 'item_en', 'item_ar', 'price']);
      
      if (error) {
        setMenuResult({ success: false, message: error });
        return;
      }

      if (rows.length === 0) {
        setMenuResult({ success: false, message: 'No valid data rows found in CSV' });
        return;
      }

      // Get existing categories for this restaurant
      const { data: existingCategories, error: catFetchError } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId);

      if (catFetchError) throw catFetchError;

      const categoryMap = new Map<string, string>();
      existingCategories?.forEach(cat => {
        categoryMap.set(cat.name.toLowerCase(), cat.id);
      });

      // Group items by category
      const itemsByCategory = new Map<string, MenuCSVRow[]>();
      rows.forEach(row => {
        const categoryKey = row.category_en.trim();
        if (!categoryKey) return;
        
        if (!itemsByCategory.has(categoryKey)) {
          itemsByCategory.set(categoryKey, []);
        }
        itemsByCategory.get(categoryKey)!.push(row);
      });

      let categoriesCreated = 0;
      let itemsCreated = 0;
      let itemsUpdated = 0;
      let branchLinksCreated = 0;

      // Process categories (sorted alphabetically, offers excluded from this upload)
      const sortedCategories = Array.from(itemsByCategory.keys())
        .filter(cat => cat.toLowerCase() !== OFFERS_CATEGORY_NAME.toLowerCase() && cat.toLowerCase() !== 'offers')
        .sort((a, b) => a.localeCompare(b));

      for (let sortIndex = 0; sortIndex < sortedCategories.length; sortIndex++) {
        const categoryEn = sortedCategories[sortIndex];
        const categoryItems = itemsByCategory.get(categoryEn)!;
        const categoryAr = categoryItems[0].category_ar || categoryEn;
        
        // Use category_en as the name (you could modify this to store both)
        const categoryName = categoryEn;
        let categoryId = categoryMap.get(categoryName.toLowerCase());

        if (!categoryId) {
          // Create category with sort_order starting from 1 (0 is reserved for offers)
          const { data: newCat, error: catError } = await supabase
            .from('menu_categories')
            .insert({
              restaurant_id: restaurantId,
              name: categoryName,
              is_active: true,
              sort_order: sortIndex + 1,
            })
            .select('id')
            .single();

          if (catError) throw catError;
          categoryId = newCat.id;
          categoryMap.set(categoryName.toLowerCase(), categoryId);
          categoriesCreated++;
        }

        // Get existing items in this category
        const { data: existingItems, error: itemsFetchError } = await supabase
          .from('menu_items')
          .select('id, name')
          .eq('category_id', categoryId);

        if (itemsFetchError) throw itemsFetchError;

        const existingItemMap = new Map<string, string>();
        existingItems?.forEach(item => {
          existingItemMap.set(item.name.toLowerCase(), item.id);
        });

        // Sort items alphabetically
        const sortedItems = categoryItems.sort((a, b) => a.item_en.localeCompare(b.item_en));

        for (let itemIndex = 0; itemIndex < sortedItems.length; itemIndex++) {
          const row = sortedItems[itemIndex];
          const itemName = row.item_en.trim();
          if (!itemName) continue;

          const price = parseFloat(row.price) || 0;
          const existingItemId = existingItemMap.get(itemName.toLowerCase());

          if (existingItemId) {
            // Update existing item
            const { error: updateError } = await supabase
              .from('menu_items')
              .update({
                price,
                description: row.item_ar || null,
                sort_order: itemIndex,
              })
              .eq('id', existingItemId);

            if (updateError) throw updateError;
            
            // Ensure branch_menu_items entry exists for this branch
            const { data: existingBranchLink } = await supabase
              .from('branch_menu_items')
              .select('id')
              .eq('branch_id', effectiveMenuBranchId)
              .eq('menu_item_id', existingItemId)
              .maybeSingle();

            if (!existingBranchLink) {
              const { error: branchLinkError } = await supabase
                .from('branch_menu_items')
                .insert({
                  branch_id: effectiveMenuBranchId,
                  menu_item_id: existingItemId,
                  is_active: true,
                  is_available: true,
                  price: price,
                  sort_order: itemIndex,
                });
              if (branchLinkError) throw branchLinkError;
              branchLinksCreated++;
            }
            
            itemsUpdated++;
          } else {
            // Create new item
            const { data: newItem, error: insertError } = await supabase
              .from('menu_items')
              .insert({
                category_id: categoryId,
                name: itemName,
                description: row.item_ar || null,
                price,
                is_available: true,
                is_offer: false,
                sort_order: itemIndex,
              })
              .select('id')
              .single();

            if (insertError) throw insertError;
            
            // Create branch_menu_items entry for the selected branch
            const { error: branchLinkError } = await supabase
              .from('branch_menu_items')
              .insert({
                branch_id: effectiveMenuBranchId,
                menu_item_id: newItem.id,
                is_active: true,
                is_available: true,
                price: price,
                sort_order: itemIndex,
              });
            if (branchLinkError) throw branchLinkError;
            
            branchLinksCreated++;
            itemsCreated++;
          }
        }
      }

      setMenuResult({
        success: true,
        message: `Successfully processed: ${categoriesCreated} categories created, ${itemsCreated} items created, ${itemsUpdated} items updated, ${branchLinksCreated} branch links created`,
      });

      refreshData();
      toast({ title: 'Menu CSV uploaded successfully!' });

    } catch (err) {
      console.error('Menu upload error:', err);
      setMenuResult({ 
        success: false, 
        message: err instanceof Error ? err.message : 'An error occurred during upload' 
      });
    } finally {
      setMenuUploading(false);
      if (menuInputRef.current) {
        menuInputRef.current.value = '';
      }
    }
  };

  const handleOffersUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate branch selection
    if (!effectiveOffersBranchId) {
      setOffersResult({ success: false, message: t("select_branch_first") || 'Please select a branch first' });
      return;
    }

    setOffersFileName(file.name);
    setOffersUploading(true);
    setOffersResult(null);

    try {
      const text = await file.text();
      const { rows, error } = parseCSV<OfferCSVRow>(text, ['item_en', 'item_ar', 'price', 'description_en', 'description_ar']);
      
      if (error) {
        setOffersResult({ success: false, message: error });
        return;
      }

      if (rows.length === 0) {
        setOffersResult({ success: false, message: 'No valid data rows found in CSV' });
        return;
      }

      // Get or create offers category
      let { data: offersCategory, error: catFetchError } = await supabase
        .from('menu_categories')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('name', OFFERS_CATEGORY_NAME)
        .maybeSingle();

      if (catFetchError) throw catFetchError;

      let offersCategoryId: string;

      if (!offersCategory) {
        // Create offers category with sort_order = 0 to ensure it's first
        const { data: newCat, error: catCreateError } = await supabase
          .from('menu_categories')
          .insert({
            restaurant_id: restaurantId,
            name: OFFERS_CATEGORY_NAME,
            is_active: true,
            sort_order: 0,
          })
          .select('id')
          .single();

        if (catCreateError) throw catCreateError;
        offersCategoryId = newCat.id;
      } else {
        offersCategoryId = offersCategory.id;
        
        // Ensure offers category has sort_order = 0
        await supabase
          .from('menu_categories')
          .update({ sort_order: 0 })
          .eq('id', offersCategoryId);
      }

      // Get existing offer items
      const { data: existingItems, error: itemsFetchError } = await supabase
        .from('menu_items')
        .select('id, name')
        .eq('category_id', offersCategoryId);

      if (itemsFetchError) throw itemsFetchError;

      const existingItemMap = new Map<string, string>();
      existingItems?.forEach(item => {
        existingItemMap.set(item.name.toLowerCase(), item.id);
      });

      let itemsCreated = 0;
      let itemsUpdated = 0;
      let branchLinksCreated = 0;

      // Sort offers alphabetically
      const sortedOffers = rows.sort((a, b) => a.item_en.localeCompare(b.item_en));

      for (let i = 0; i < sortedOffers.length; i++) {
        const row = sortedOffers[i];
        const itemName = row.item_en.trim();
        if (!itemName) continue;

        const price = parseFloat(row.price) || 0;
        const description = [row.description_en, row.description_ar].filter(Boolean).join(' | ') || row.item_ar || null;
        const existingItemId = existingItemMap.get(itemName.toLowerCase());

        if (existingItemId) {
          // Update existing offer
          const { error: updateError } = await supabase
            .from('menu_items')
            .update({
              price,
              description,
              is_offer: true,
              sort_order: i,
            })
            .eq('id', existingItemId);

          if (updateError) throw updateError;
          
          // Ensure branch_menu_items entry exists for this branch
          const { data: existingBranchLink } = await supabase
            .from('branch_menu_items')
            .select('id')
            .eq('branch_id', effectiveOffersBranchId)
            .eq('menu_item_id', existingItemId)
            .maybeSingle();

          if (!existingBranchLink) {
            const { error: branchLinkError } = await supabase
              .from('branch_menu_items')
              .insert({
                branch_id: effectiveOffersBranchId,
                menu_item_id: existingItemId,
                is_active: true,
                is_available: true,
                price: price,
                sort_order: i,
              });
            if (branchLinkError) throw branchLinkError;
            branchLinksCreated++;
          }
          
          itemsUpdated++;
        } else {
          // Create new offer
          const { data: newItem, error: insertError } = await supabase
            .from('menu_items')
            .insert({
              category_id: offersCategoryId,
              name: itemName,
              description,
              price,
              is_available: true,
              is_offer: true,
              sort_order: i,
            })
            .select('id')
            .single();

          if (insertError) throw insertError;
          
          // Create branch_menu_items entry for the selected branch
          const { error: branchLinkError } = await supabase
            .from('branch_menu_items')
            .insert({
              branch_id: effectiveOffersBranchId,
              menu_item_id: newItem.id,
              is_active: true,
              is_available: true,
              price: price,
              sort_order: i,
            });
          if (branchLinkError) throw branchLinkError;
          
          branchLinksCreated++;
          itemsCreated++;
        }
      }

      setOffersResult({
        success: true,
        message: `Successfully processed: ${itemsCreated} offers created, ${itemsUpdated} offers updated, ${branchLinksCreated} branch links created`,
      });

      refreshData();
      toast({ title: 'Offers CSV uploaded successfully!' });

    } catch (err) {
      console.error('Offers upload error:', err);
      setOffersResult({ 
        success: false, 
        message: err instanceof Error ? err.message : 'An error occurred during upload' 
      });
    } finally {
      setOffersUploading(false);
      if (offersInputRef.current) {
        offersInputRef.current.value = '';
      }
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          {t("csv_upload")}
        </CardTitle>
        <CardDescription>{t("csv_upload_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context indicator - shows which restaurant/branch this will apply to */}
        {isContextReady ? (
          <OwnerContextIndicator restaurantName={restaurantName} branchName={branchName} />
        ) : (
          <OwnerContextInlineWarning />
        )}
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Menu CSV Upload */}
          <div className="space-y-3">
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <h4 className="font-medium text-foreground mb-2">{t("upload_menu_csv")}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t("menu_csv_columns")}
              </p>
              
              
              <input
                ref={menuInputRef}
                type="file"
                accept=".csv"
                onChange={handleMenuUpload}
                className="hidden"
                id="menu-csv-input"
                disabled={!isContextReady}
              />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => menuInputRef.current?.click()}
                disabled={menuUploading || !isContextReady}
              >
                {menuUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                    {t("uploading")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("upload_menu_csv")}
                  </>
                )}
              </Button>

              {menuFileName && !menuUploading && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("selected_file")}: {menuFileName}
                </p>
              )}

              {menuResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  menuResult.success 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {menuResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">{menuResult.message}</p>
                </div>
              )}
            </div>
          </div>

          {/* Offers CSV Upload */}
          <div className="space-y-3">
            <div className="p-4 border border-border rounded-lg bg-muted/30">
              <h4 className="font-medium text-foreground mb-2">{t("upload_offers_csv")}</h4>
              <p className="text-sm text-muted-foreground mb-3">
                {t("offers_csv_columns")}
              </p>
              
              
              <input
                ref={offersInputRef}
                type="file"
                accept=".csv"
                onChange={handleOffersUpload}
                className="hidden"
                id="offers-csv-input"
                disabled={!isContextReady}
              />
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => offersInputRef.current?.click()}
                disabled={offersUploading || !isContextReady}
              >
                {offersUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                    {t("uploading")}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    {t("upload_offers_csv")}
                  </>
                )}
              </Button>

              {offersFileName && !offersUploading && (
                <p className="text-sm text-muted-foreground mt-2">
                  {t("selected_file")}: {offersFileName}
                </p>
              )}

              {offersResult && (
                <div className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  offersResult.success 
                    ? 'bg-success/10 text-success' 
                    : 'bg-destructive/10 text-destructive'
                }`}>
                  {offersResult.success ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  )}
                  <p className="text-sm">{offersResult.message}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
