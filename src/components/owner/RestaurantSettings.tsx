import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Settings, Clock, Loader2, ChevronDown } from "lucide-react";
import {
  useOwnerRestaurantSettings,
  useUpdateOwnerRestaurantSettings,
  BusinessHours,
} from "@/hooks/useOwnerRestaurantSettings";

const DAYS_OF_WEEK = [
  { key: "sunday", label: "Sunday", labelAr: "الأحد" },
  { key: "monday", label: "Monday", labelAr: "الاثنين" },
  { key: "tuesday", label: "Tuesday", labelAr: "الثلاثاء" },
  { key: "wednesday", label: "Wednesday", labelAr: "الأربعاء" },
  { key: "thursday", label: "Thursday", labelAr: "الخميس" },
  { key: "friday", label: "Friday", labelAr: "الجمعة" },
  { key: "saturday", label: "Saturday", labelAr: "السبت" },
] as const;

const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  sunday: { open: "09:00", close: "22:00", closed: false },
  monday: { open: "09:00", close: "22:00", closed: false },
  tuesday: { open: "09:00", close: "22:00", closed: false },
  wednesday: { open: "09:00", close: "22:00", closed: false },
  thursday: { open: "09:00", close: "22:00", closed: false },
  friday: { open: "09:00", close: "22:00", closed: false },
  saturday: { open: "09:00", close: "22:00", closed: false },
};

function isArabicUI(): boolean {
  // Check document language or navigator language for Arabic
  const docLang = document.documentElement.lang?.toLowerCase();
  const navLang = navigator.language?.toLowerCase();
  return docLang?.startsWith("ar") || navLang?.startsWith("ar");
}

export function RestaurantSettings() {
  const { data: settings, isLoading } = useOwnerRestaurantSettings();
  const updateSettings = useUpdateOwnerRestaurantSettings();

  const [taxRate, setTaxRate] = useState<string>("16");
  const [pricesIncludeTax, setPricesIncludeTax] = useState(false);
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_BUSINESS_HOURS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Determine currency display based on UI language
  const currencyDisplay = isArabicUI() ? "د.أ" : "JOD";

  useEffect(() => {
    if (settings) {
      setTaxRate(String((settings.tax_rate || 0) * 100));
      setPricesIncludeTax(settings.prices_include_tax || false);
      setBusinessHours(settings.business_hours || DEFAULT_BUSINESS_HOURS);
      setHasChanges(false);
    }
  }, [settings]);

  const handleTaxRateChange = (value: string) => {
    setTaxRate(value);
    setHasChanges(true);
  };

  const handlePricesIncludeTaxChange = (checked: boolean) => {
    setPricesIncludeTax(checked);
    setHasChanges(true);
  };

  const handleBusinessHoursChange = (
    day: keyof BusinessHours,
    field: "open" | "close" | "closed",
    value: string | boolean
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    const taxRateDecimal = parseFloat(taxRate) / 100 || 0;
    await updateSettings.mutateAsync({
      tax_rate: taxRateDecimal,
      prices_include_tax: pricesIncludeTax,
      business_hours: businessHours,
    });
    setHasChanges(false);
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Restaurant Settings
                  </CardTitle>
                  <CardDescription>Configure your restaurant preferences</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Button onClick={handleSave} disabled={!hasChanges || updateSettings.isPending}>
              {updateSettings.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-8">
            {/* Currency Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-foreground">Currency</h3>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">{currencyDisplay}</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">{currencyDisplay}</p>
                  <p className="text-sm text-muted-foreground">Jordanian Dinar (read-only)</p>
                </div>
              </div>
            </div>

        {/* Tax Settings Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground">Tax Settings</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tax-rate">Tax Percentage (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxRate}
                onChange={(e) => handleTaxRateChange(e.target.value)}
                placeholder="16"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <Label htmlFor="prices-include-tax" className="text-sm font-medium">
                  Prices include tax?
                </Label>
                <p className="text-sm text-muted-foreground">Menu prices already include tax</p>
              </div>
              <Switch
                id="prices-include-tax"
                checked={pricesIncludeTax}
                onCheckedChange={handlePricesIncludeTaxChange}
              />
            </div>
          </div>
        </div>

        {/* Business Hours Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Business Hours
          </h3>
          <div className="space-y-3">
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day.key}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 bg-muted/50 rounded-lg"
              >
                <div className="w-28 shrink-0">
                  <p className="font-medium text-foreground">{day.label}</p>
                </div>
                <div className="flex flex-1 items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${day.key}-open`} className="text-sm text-muted-foreground w-12">
                      Open
                    </Label>
                    <Input
                      id={`${day.key}-open`}
                      type="time"
                      value={businessHours[day.key].open}
                      onChange={(e) => handleBusinessHoursChange(day.key, "open", e.target.value)}
                      disabled={businessHours[day.key].closed}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`${day.key}-close`} className="text-sm text-muted-foreground w-12">
                      Close
                    </Label>
                    <Input
                      id={`${day.key}-close`}
                      type="time"
                      value={businessHours[day.key].close}
                      onChange={(e) => handleBusinessHoursChange(day.key, "close", e.target.value)}
                      disabled={businessHours[day.key].closed}
                      className="w-32"
                    />
                  </div>
                  <div className="flex items-center gap-2 ml-auto">
                    <Label htmlFor={`${day.key}-closed`} className="text-sm text-muted-foreground">
                      Closed
                    </Label>
                    <Switch
                      id={`${day.key}-closed`}
                      checked={businessHours[day.key].closed}
                      onCheckedChange={(checked) => handleBusinessHoursChange(day.key, "closed", checked)}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
