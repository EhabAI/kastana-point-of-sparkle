import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KitchenStaff {
  id: string;
  user_id: string;
  role: 'kitchen';
  restaurant_id: string;
  branch_id: string | null;
  created_at: string;
  email?: string;
  is_active: boolean;
}

export function useKitchenStaff(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['kitchen-staff', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [] as KitchenStaff[];

      // First get all kitchen staff for this restaurant
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'kitchen')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [] as KitchenStaff[];

      // Then fetch their profiles
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map emails to staff
      const emailMap = new Map(profiles?.map(p => [p.id, p.email]) || []);

      return roles.map(row => ({
        ...row,
        branch_id: row.branch_id || null,
        email: emailMap.get(row.user_id) || undefined,
        is_active: row.is_active ?? true,
      })) as KitchenStaff[];
    },
    enabled: !!restaurantId,
  });
}

export function useAddKitchenStaff() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      restaurantId,
      branchId 
    }: { 
      email: string; 
      password: string; 
      restaurantId: string;
      branchId: string;
    }) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { 
          email, 
          password,
          role: 'kitchen',
          restaurant_id: restaurantId,
          branch_id: branchId
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        let message = error.message;
        try {
          const maybeBody = await (error as any).context?.json?.();
          if (maybeBody?.error?.message) message = maybeBody.error.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      if (!data?.user_id) throw new Error('Unexpected error creating kitchen staff');
      return { id: data.user_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-staff', variables.restaurantId] });
      toast({ title: 'Kitchen staff created successfully' });
    },
    onError: (error: Error) => {
      const message = error.message.includes('already registered')
        ? 'This email is already registered'
        : error.message.includes('KDS must be enabled')
        ? 'KDS must be enabled to create kitchen staff'
        : error.message;
      toast({ title: 'Error creating kitchen staff', description: message, variant: 'destructive' });
    },
  });
}

export function useUpdateKitchenStaffStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      roleId, 
      isActive,
      restaurantId 
    }: { 
      roleId: string; 
      isActive: boolean;
      restaurantId: string;
    }) => {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const { data, error } = await supabase.functions.invoke('update-cashier-status', {
        body: { 
          role_id: roleId, 
          is_active: isActive,
          restaurant_id: restaurantId
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to update kitchen staff status');
      }

      return { roleId, isActive: data.is_active };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-staff', variables.restaurantId] });
      toast({ title: data.isActive ? 'Kitchen staff activated' : 'Kitchen staff deactivated' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating kitchen staff status', description: error.message, variant: 'destructive' });
    },
  });
}
