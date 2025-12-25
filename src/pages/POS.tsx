import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, ShoppingCart } from "lucide-react";

export default function POS() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-4">
          <ShoppingCart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Kastana POS</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </header>

      {/* Main Content - Placeholder */}
      <Card className="h-[calc(100vh-8rem)]">
        <CardHeader>
          <CardTitle>POS Terminal</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-muted-foreground">
            <ShoppingCart className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">POS Screen Coming Soon</p>
            <p className="text-sm">Phase 2 will implement the full POS interface</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
