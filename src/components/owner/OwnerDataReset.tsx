import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRestaurantContextSafe } from "@/contexts/RestaurantContext";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function OwnerDataReset() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const { selectedRestaurant } = useRestaurantContextSafe();
  const [isResetting, setIsResetting] = useState(false);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleReset = async () => {
    if (!selectedRestaurant?.id) {
      toast({
        title: language === "ar" ? "خطأ" : "Error",
        description: language === "ar" 
          ? "يجب اختيار المطعم أولاً" 
          : "Please select a restaurant first",
        variant: "destructive",
      });
      return;
    }

    setIsResetting(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (!accessToken) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke("owner-data-reset", {
        body: { restaurant_id: selectedRestaurant.id },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to reset data");
      }

      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["menu-categories"] });
      queryClient.invalidateQueries({ queryKey: ["menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["all-menu-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["cashiers"] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-staff"] });
      queryClient.invalidateQueries({ queryKey: ["modifier-groups"] });

      toast({
        title: language === "ar" ? "تم إعادة التعيين" : "Reset Complete",
        description: language === "ar"
          ? `تم حذف ${data?.deleted?.total || 0} سجل بنجاح`
          : `Successfully deleted ${data?.deleted?.total || 0} records`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        title: language === "ar" ? "فشل إعادة التعيين" : "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  if (!selectedRestaurant) {
    return null;
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          {language === "ar" ? "إعادة تعيين البيانات" : "Reset Data"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {language === "ar" ? "تحذير: إعادة تعيين البيانات" : "Warning: Data Reset"}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-destructive">
              <p className="font-medium mb-2">
                {language === "ar" 
                  ? "سيتم حذف جميع بيانات القائمة والمخزون المرتبطة بصاحب المطعم"
                  : "This will delete all menu and inventory data for this restaurant"}
              </p>
              <p className="text-sm opacity-80">
                {language === "ar"
                  ? "يشمل ذلك: الأصناف، الفئات، الوصفات، المخزون، الموظفين"
                  : "Including: items, categories, recipes, inventory, staff"}
              </p>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">
                {language === "ar" ? "المطعم:" : "Restaurant:"}
              </p>
              <p className="text-foreground">{selectedRestaurant.name}</p>
            </div>

            <p className="text-sm text-muted-foreground">
              {language === "ar"
                ? "لا يمكن التراجع عن هذا الإجراء. هل أنت متأكد؟"
                : "This action cannot be undone. Are you sure?"}
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isResetting}>
            {language === "ar" ? "إلغاء" : "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleReset}
            disabled={isResetting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isResetting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === "ar" ? "جارٍ الحذف..." : "Deleting..."}
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                {language === "ar" ? "حذف الكل" : "Delete All"}
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
