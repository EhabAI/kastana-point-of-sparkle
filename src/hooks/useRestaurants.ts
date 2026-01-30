import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Restaurant {
  id: string;
  name: string;
  owner_id: string | null;
  logo_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_renewal_reminder_stage: string | null;
}

export function useRestaurants() {
  return useQuery({
    queryKey: ['restaurants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Restaurant[];
    },
  });
}

export function useOwnerRestaurant() {
  return useQuery({
    queryKey: ['owner-restaurant'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as Restaurant | null;
    },
  });
}

export function useCreateRestaurant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, logoUrl }: { name: string; logoUrl?: string }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .insert({ name, logo_url: logoUrl })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({ title: 'Restaurant created successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating restaurant', description: error.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRestaurant() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name, logoUrl }: { id: string; name?: string; logoUrl?: string }) => {
      const updates: { name?: string; logo_url?: string } = {};
      if (name !== undefined) updates.name = name;
      if (logoUrl !== undefined) updates.logo_url = logoUrl;
      
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['owner-restaurant'] });
      toast({ title: 'Restaurant updated successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error updating restaurant', description: error.message, variant: 'destructive' });
    },
  });
}

export function useAssignOwner() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ restaurantId, ownerId }: { restaurantId: string; ownerId: string }) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ owner_id: ownerId })
        .eq('id', restaurantId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({ title: 'Owner assigned successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error assigning owner', description: error.message, variant: 'destructive' });
    },
  });
}
