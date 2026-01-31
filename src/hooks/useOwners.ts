import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from "@/contexts/LanguageContext";
import { resolveMessage, resolveErrorMessage } from "@/lib/messageResolver";

export interface Owner {
  id: string;
  user_id: string;
  role: 'owner';
  created_at: string;
  email?: string;
  username?: string;
}

export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      // First get all owners
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'owner')
        .order('created_at', { ascending: false });
      
      if (rolesError) throw rolesError;
      if (!roles || roles.length === 0) return [] as Owner[];

      // Then fetch their profiles
      const userIds = roles.map(r => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, username')
        .in('id', userIds);
      
      if (profilesError) throw profilesError;

      // Map profiles to owners
      const profileMap = new Map(profiles?.map(p => [p.id, { email: p.email, username: p.username }]) || []);
      return roles.map(row => ({
        ...row,
        email: profileMap.get(row.user_id)?.email || undefined,
        username: profileMap.get(row.user_id)?.username || undefined
      })) as Owner[];
    },
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { language } = useLanguage();

  return useMutation({
    mutationFn: async ({ email, password, username }: { email: string; password: string; username: string }) => {
      // Ensure we send a valid user JWT to the backend function
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (sessionError || !accessToken) {
        throw new Error('Not authenticated. Please sign in again.');
      }

      const payload = { email, password, role: 'owner' as const, username };
      console.log('Create owner payload:', { email, role: payload.role, username });

      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: payload,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) {
        let message = error.message;
        try {
          // FunctionsHttpError may include a Response with a JSON body
          const maybeBody = await (error as any).context?.json?.();
          if (maybeBody?.error?.message) message = maybeBody.error.message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      if (!data?.user_id) throw new Error('Unexpected error creating owner');
      return { id: data.user_id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owners'] });
      toast({ title: resolveMessage("owner_created", language) });
    },
    onError: (error: Error) => {
      const msg = resolveErrorMessage(error, language, "owner_create_error");
      toast({ title: msg.title, description: msg.description, variant: 'destructive' });
    },
  });
}
