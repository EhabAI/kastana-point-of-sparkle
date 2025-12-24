import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Owner {
  id: string;
  user_id: string;
  role: 'owner';
  created_at: string;
  email?: string;
}

export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('role', 'owner')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Owner[];
    },
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-create-user', {
        body: { email, password },
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
      toast({ title: 'Owner created successfully' });
    },
    onError: (error: Error) => {
      const message = error.message.includes('already registered') 
        ? 'This email is already registered'
        : error.message;
      toast({ title: 'Error creating owner', description: message, variant: 'destructive' });
    },
  });
}
