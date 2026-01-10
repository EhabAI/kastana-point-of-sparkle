import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface RestaurantInactiveScreenProps {
  message?: string;
  showLogout?: boolean;
}

export function RestaurantInactiveScreen({
  message = "This restaurant is currently inactive. Please contact support.",
  showLogout = true,
}: RestaurantInactiveScreenProps) {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Restaurant Inactive</h1>
          <p className="text-muted-foreground">{message}</p>
        </div>
        {showLogout && (
          <Button onClick={() => signOut()} variant="outline" className="w-full">
            Sign Out
          </Button>
        )}
      </div>
    </div>
  );
}
