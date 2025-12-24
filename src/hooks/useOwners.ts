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
      // Create user via admin function - for now we'll use signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });
      
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Add owner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({ user_id: authData.user.id, role: 'owner' });
      
      if (roleError) throw roleError;
      
      return authData.user;
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
