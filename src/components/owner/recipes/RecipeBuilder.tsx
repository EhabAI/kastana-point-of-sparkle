import { useState, useEffect, useCallback } from "react";
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
import { Trash2, Plus, Save, ChefHat, Search, Package, AlertCircle } from "lucide-react";
import { useAllMenuItems } from "@/hooks/useMenuItems";
import { useInventoryItems, useInventoryUnits } from "@/hooks/useInventoryItems";
import { useRecipeByMenuItem, useUpsertRecipe } from "@/hooks/useRecipes";
import { cn } from "@/lib/utils";

interface RecipeBuilderProps {
  restaurantId: string;
}

interface RecipeLineInput {
  id: string;
  inventory_item_id: string;
  qty: string;
  unit_id: string;
}

export function RecipeBuilder({ restaurantId }: RecipeBuilderProps) {
  const { t, language } = useLanguage();
  const isRTL = language === "ar";

  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string>("");
  const [menuSearch, setMenuSearch] = useState("");
  const [lines, setLines] = useState<RecipeLineInput[]>([]);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: menuItems = [], isLoading: loadingMenuItems } = useAllMenuItems(restaurantId);
  const { data: inventoryItems = [], isLoading: loadingInventory } = useInventoryItems(restaurantId);
  const { data: units = [] } = useInventoryUnits(restaurantId);
  const { data: existingRecipe, isLoading: loadingRecipe } = useRecipeByMenuItem(restaurantId, selectedMenuItemId);
  const upsertRecipe = useUpsertRecipe();

  // Filter menu items by search
  const filteredMenuItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(menuSearch.toLowerCase())
  );

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
    if (!selectedMenuItemId) return;

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

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      {/* Menu Item Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChefHat className="h-5 w-5" />
            {t("recipe_builder")}
          </CardTitle>
          <CardDescription>{t("recipe_builder_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>{t("select_menu_item")}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t("search_menu_items")}
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            {menuSearch && (
              <ScrollArea className="h-48 border rounded-md">
                {loadingMenuItems ? (
                  <div className="p-4 text-center text-muted-foreground">{t("loading")}</div>
                ) : filteredMenuItems.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">{t("no_results")}</div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredMenuItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedMenuItemId(item.id);
                          setMenuSearch("");
                        }}
                        className={cn(
                          "w-full text-start p-3 rounded-md hover:bg-accent transition-colors",
                          selectedMenuItemId === item.id && "bg-primary/10"
                        )}
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.price} {t("currency")}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            )}
          </div>

          {selectedMenuItem && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Package className="h-5 w-5 text-primary" />
              <div>
                <div className="font-medium">{selectedMenuItem.name}</div>
                <div className="text-sm text-muted-foreground">
                  {selectedMenuItem.price} {t("currency")}
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
