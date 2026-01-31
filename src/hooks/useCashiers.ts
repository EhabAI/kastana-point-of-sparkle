import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveMessage, resolveErrorMessage, isInTrainingMode } from "@/lib/messageResolver";

export interface Cashier {
  id: string;
  user_id: string;
  role: 'cashier';
  restaurant_id: string;
  branch_id: string | null;
  created_at: string;
  email?: string;
  username?: string;
  is_active: boolean;
}

export function useCashiers(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['cashiers', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [] as Cashier[];

      // First get all cashiers for this restaurant
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'cashier')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false });

      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [] as Cashier[];

      // Then fetch their profiles
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      // Map emails and usernames to cashiers
      const profileMap = new Map(profiles?.map(p => [p.id, { email: p.email, username: p.username }]) || []);

      return roles.map(row => ({
        ...row,
        branch_id: row.branch_id || null,
        email: profileMap.get(row.user_id)?.email || undefined,
        username: profileMap.get(row.user_id)?.username || undefined,
        is_active: row.is_active ?? true,
      })) as Cashier[];
    },
    enabled: !!restaurantId,
  });
}

export function useAddCashier() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      restaurantId,
      branchId,
      username
    }: { 
      email: string; 
      password: string; 
      restaurantId: string;
      branchId: string;
      username: string;
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
          role: 'cashier',
          restaurant_id: restaurantId,
          branch_id: branchId,
          username
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

      if (!data?.user_id) throw new Error('Unexpected error creating cashier');
      return { id: data.user_id };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cashiers', variables.restaurantId] });
      toast({ title: resolveMessage("cashier_created", language) });
    },
    onError: (error: Error) => {
      const msg = resolveErrorMessage(error, language, "cashier_create_error");
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}

export function useUpdateCashierStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

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
        throw new Error(error.message || 'Failed to update cashier status');
      }

      return { roleId, isActive: data.is_active };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cashiers', variables.restaurantId] });
      const messageKey = data.isActive ? "cashier_activated" : "cashier_deactivated";
      toast({ title: resolveMessage(messageKey, language) });
    },
    onError: (error: Error) => {
      const msg = resolveErrorMessage(error, language, "cashier_status_error");
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}
