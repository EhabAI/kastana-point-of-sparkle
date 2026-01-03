import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ModifierGroup, SelectedModifier } from "@/hooks/pos/useModifiers";
import { formatJOD } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";

interface MenuItem {
  id: string;
  name: string;
  price: number;
}

interface ModifierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menuItem: MenuItem | null;
  modifierGroups: ModifierGroup[];
  currency: string;
  onConfirm: (menuItem: MenuItem, modifiers: SelectedModifier[]) => void;
  isLoading?: boolean;
}

export function ModifierDialog({
  open,
  onOpenChange,
  menuItem,
  modifierGroups,
  currency,
  onConfirm,
  isLoading,
}: ModifierDialogProps) {
  const { t } = useLanguage();
  // Track selected options per group: { groupId: [optionId, ...] }
  const [selections, setSelections] = useState<Record<string, string[]>>({});

  // Reset selections when dialog opens with a new item
  useEffect(() => {
    if (open && menuItem) {
      // Set defaults
      const defaults: Record<string, string[]> = {};
      modifierGroups.forEach((group) => {
        const defaultOpts = group.options.filter((o) => o.is_default).map((o) => o.id);
        if (defaultOpts.length > 0) {
          defaults[group.id] = defaultOpts;
        }
      });
      setSelections(defaults);
    }
  }, [open, menuItem, modifierGroups]);

  if (!menuItem) return null;

  const handleSingleSelect = (groupId: string, optionId: string) => {
    setSelections((prev) => ({
      ...prev,
      [groupId]: [optionId],
    }));
  };

  const handleMultiSelect = (groupId: string, optionId: string, checked: boolean) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      if (checked) {
        return { ...prev, [groupId]: [...current, optionId] };
      } else {
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      }
    });
  };

  const calculateModifierTotal = () => {
    let total = 0;
    modifierGroups.forEach((group) => {
      const selected = selections[group.id] || [];
      group.options.forEach((option) => {
        if (selected.includes(option.id)) {
          total += option.price_adjustment;
        }
      });
    });
    return total;
  };

  const modifierTotal = calculateModifierTotal();
  const itemTotal = menuItem.price + modifierTotal;

  const handleConfirm = () => {
    const selectedModifiers: SelectedModifier[] = [];
    
    modifierGroups.forEach((group) => {
      const selected = selections[group.id] || [];
      group.options.forEach((option) => {
        if (selected.includes(option.id)) {
          selectedModifiers.push({
            modifier_option_id: option.id,
            modifier_name: group.name,
            option_name: option.name,
            price_adjustment: option.price_adjustment,
          });
        }
      });
    });

    onConfirm(menuItem, selectedModifiers);
    onOpenChange(false);
  };

  const handleSkip = () => {
    onConfirm(menuItem, []);
    onOpenChange(false);
  };

  // Check if all required groups have selections
  const isValid = modifierGroups.every((group) => {
    if (!group.is_required) return true;
    const selected = selections[group.id] || [];
    return selected.length > 0;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("customize_item")}: {menuItem.name}</DialogTitle>
          <DialogDescription>
            {t("base_price")}: {formatJOD(menuItem.price)} {currency}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 py-4">
            {modifierGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t("no_modifiers_available")}
              </p>
            ) : (
              modifierGroups.map((group) => (
                <div key={group.id} className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">
                      {group.name}
                      {group.is_required && (
                        <span className="text-destructive ml-1">*</span>
                      )}
                    </h4>
                    {group.description && (
                      <p className="text-xs text-muted-foreground">{group.description}</p>
                    )}
                    {group.max_selections === 1 && (
                      <p className="text-xs text-muted-foreground">{t("select_one")}</p>
                    )}
                  </div>

                  {group.max_selections === 1 ? (
                    // Single select - use radio
                    <RadioGroup
                      value={selections[group.id]?.[0] || ""}
                      onValueChange={(value) => handleSingleSelect(group.id, value)}
                    >
                      {group.options.map((option) => (
                        <div key={option.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={option.id} />
                            <Label htmlFor={option.id} className="text-sm cursor-pointer">
                              {option.name}
                            </Label>
                          </div>
                          {option.price_adjustment !== 0 && (
                            <span className="text-sm text-muted-foreground">
                              {option.price_adjustment > 0 ? "+" : ""}
                              {formatJOD(option.price_adjustment)} {currency}
                            </span>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    // Multi select - use checkboxes
                    <div className="space-y-2">
                      {group.options.map((option) => {
                        const isChecked = (selections[group.id] || []).includes(option.id);
                        return (
                          <div key={option.id} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={option.id}
                                checked={isChecked}
                                onCheckedChange={(checked) =>
                                  handleMultiSelect(group.id, option.id, !!checked)
                                }
                              />
                              <Label htmlFor={option.id} className="text-sm cursor-pointer">
                                {option.name}
                              </Label>
                            </div>
                            {option.price_adjustment !== 0 && (
                              <span className="text-sm text-muted-foreground">
                                {option.price_adjustment > 0 ? "+" : ""}
                                {formatJOD(option.price_adjustment)} {currency}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {modifierTotal !== 0 && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>{t("modifiers_label")}</span>
              <span>
                {modifierTotal > 0 ? "+" : ""}
                {formatJOD(modifierTotal)} {currency}
              </span>
            </div>
            <div className="flex justify-between font-medium mt-1">
              <span>{t("item_total")}</span>
              <span>{formatJOD(itemTotal)} {currency}</span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          {modifierGroups.length === 0 ? (
            <Button onClick={handleSkip} disabled={isLoading}>
              {t("add_to_order")}
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={handleSkip} disabled={isLoading}>
                {t("skip")}
              </Button>
              <Button onClick={handleConfirm} disabled={!isValid || isLoading}>
                {isLoading ? t("adding") : t("add_with_modifiers")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
