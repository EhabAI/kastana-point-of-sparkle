import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreditCard, Loader2, ChevronDown, Banknote, Building2, Wallet, AlertCircle } from "lucide-react";
import { useBranchContextSafe } from "@/contexts/BranchContext";
import { useBranchPaymentMethods, useUpdateBranchPaymentMethods } from "@/hooks/useBranchPaymentMethods";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface PaymentMethodsSettingsProps {
  restaurantId: string;
}

export function PaymentMethodsSettings({ restaurantId }: PaymentMethodsSettingsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const { selectedBranch, isLoading: branchLoading, isBranchSelected } = useBranchContextSafe();
  const [isOpen, setIsOpen] = useState(false);

  // Use the globally selected branch
  const selectedBranchId = selectedBranch?.id || null;

  const { data: paymentMethods, isLoading: methodsLoading } = useBranchPaymentMethods(selectedBranchId || undefined);
  const updateMethods = useUpdateBranchPaymentMethods();

  const [localMethods, setLocalMethods] = useState({
    cash: true,
    visa: true,
    efawateer: false,
    wallet: false,
  });
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with fetched data
  useEffect(() => {
    if (paymentMethods) {
      setLocalMethods({
        cash: paymentMethods.cash_enabled,
        visa: paymentMethods.visa_enabled,
        efawateer: paymentMethods.efawateer_enabled,
        wallet: paymentMethods.wallet_enabled,
      });
      setHasChanges(false);
    }
  }, [paymentMethods]);

  const handleToggle = (method: keyof typeof localMethods, value: boolean) => {
    setLocalMethods((prev) => ({ ...prev, [method]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!selectedBranchId) return;
    try {
      await updateMethods.mutateAsync({
        branchId: selectedBranchId,
        cashEnabled: localMethods.cash,
        visaEnabled: localMethods.visa,
        mastercardEnabled: false,
        efawateerEnabled: localMethods.efawateer,
        walletEnabled: localMethods.wallet,
      });
      setHasChanges(false);
    } catch {
      toast({ title: t("error_unexpected"), variant: "destructive" });
    }
  };

  if (branchLoading) {
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
      <Card className="shadow-card hover-lift">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <ChevronDown className={`h-5 w-5 transition-transform duration-200 ${isOpen ? "" : "-rotate-90"}`} />
                <div className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("payment_methods")}
                  </CardTitle>
                  <CardDescription>{t("configure_payment_methods_per_branch")}</CardDescription>
                </div>
              </button>
            </CollapsibleTrigger>
            <Button onClick={handleSave} disabled={!hasChanges || updateMethods.isPending}>
              {updateMethods.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {t("save_changes")}
            </Button>
          </div>
        </CardHeader>
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Branch Info - shows the globally selected branch */}
            {!isBranchSelected ? (
              <div className="flex items-center gap-2 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-700 dark:text-amber-300">
                  {t("select_branch_first")}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{selectedBranch?.name}</span>
              </div>
            )}

            {methodsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Cash */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <Banknote className="h-5 w-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t("cash")}</Label>
                      <p className="text-xs text-muted-foreground">{t("accept_cash_payments")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localMethods.cash}
                    onCheckedChange={(checked) => handleToggle("cash", checked)}
                  />
                </div>

                {/* Visa/Master */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t("visa")}</Label>
                      <p className="text-xs text-muted-foreground">{t("accept_visa_payments")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localMethods.visa}
                    onCheckedChange={(checked) => handleToggle("visa", checked)}
                  />
                </div>

                {/* CliQ (uses efawateer_enabled column) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">CliQ</Label>
                      <p className="text-xs text-muted-foreground">{t("accept_cliq_payments")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localMethods.efawateer}
                    onCheckedChange={(checked) => handleToggle("efawateer", checked)}
                  />
                </div>

                {/* Wallet (uses wallet_enabled column) */}
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg transition-all duration-200 hover:bg-muted/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/30 rounded-lg flex items-center justify-center">
                      <Wallet className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t("wallet")}</Label>
                      <p className="text-xs text-muted-foreground">{t("accept_wallet_payments")}</p>
                    </div>
                  </div>
                  <Switch
                    checked={localMethods.wallet}
                    onCheckedChange={(checked) => handleToggle("wallet", checked)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
