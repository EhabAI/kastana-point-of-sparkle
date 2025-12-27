import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCashiers, useAddCashier, useDeleteCashier } from '@/hooks/useCashiers';
import { Users, Loader2, Plus, Trash2, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StaffManagementProps {
  restaurantId: string;
}

export function StaffManagement({ restaurantId }: StaffManagementProps) {
  const { data: cashiers = [], isLoading } = useCashiers(restaurantId);
  const addCashier = useAddCashier();
  const deleteCashier = useDeleteCashier();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCashier, setNewCashier] = useState({ email: '', password: '' });

  // Debug log
  console.log('Cashiers loaded:', cashiers);

  const handleCreateCashier = async () => {
    if (!newCashier.email.trim()) {
      toast({ title: 'Please enter an email address', variant: 'destructive' });
      return;
    }
    if (!newCashier.password || newCashier.password.length < 6) {
      toast({ title: 'Password must be at least 6 characters', variant: 'destructive' });
      return;
    }

    await addCashier.mutateAsync({
      email: newCashier.email,
      password: newCashier.password,
      restaurantId,
    });

    setNewCashier({ email: '', password: '' });
    setCreateDialogOpen(false);
  };

  const handleDeleteCashier = async (roleId: string) => {
    if (confirm('Are you sure you want to remove this cashier?')) {
      await deleteCashier.mutateAsync({ roleId, restaurantId });
    }
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Management
            </CardTitle>
            <CardDescription>Manage your restaurant's cashiers</CardDescription>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-2" />
                Add Cashier
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Cashier</DialogTitle>
                <DialogDescription>Create a new cashier account for your restaurant.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="cashier-email">Email</Label>
                  <Input
                    id="cashier-email"
                    type="email"
                    value={newCashier.email}
                    onChange={(e) => setNewCashier({ ...newCashier, email: e.target.value })}
                    placeholder="cashier@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashier-password">Password</Label>
                  <Input
                    id="cashier-password"
                    type="password"
                    value={newCashier.password}
                    onChange={(e) => setNewCashier({ ...newCashier, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateCashier} disabled={addCashier.isPending}>
                  {addCashier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Cashier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : cashiers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No cashiers yet. Add one to get started.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cashiers.map((cashier) => (
                <TableRow key={cashier.id}>
                  <TableCell className="font-medium">
                    {cashier.email || 'No email address'}
                  </TableCell>
                  <TableCell>
                    {new Date(cashier.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteCashier(cashier.id)}
                      disabled={deleteCashier.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
