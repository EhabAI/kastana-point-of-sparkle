import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface RestaurantSubscription {
  restaurant_id: string;
  start_date: string;
  period: 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';
  bonus_months: number;
  end_date: string;
  status: 'ACTIVE' | 'EXPIRED';
  updated_at: string;
  notes: string | null;
}

export type SubscriptionPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL';

export const PERIOD_LABELS: Record<SubscriptionPeriod, string> = {
  MONTHLY: '1 Month',
  QUARTERLY: '3 Months',
  SEMI_ANNUAL: '6 Months',
  ANNUAL: '12 Months',
};

/**
 * Fetch all subscriptions - System Admin only
 */
export function useRestaurantSubscriptions() {
  return useQuery({
    queryKey: ['restaurant-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_subscriptions')
        .select('*')
        .order('end_date', { ascending: true });
      
      if (error) throw error;
      return data as RestaurantSubscription[];
    },
  });
}

/**
 * Get expiring subscriptions (expired or ending within 7 days)
 */
export function useExpiringSubscriptions() {
  const { data: subscriptions = [], ...rest } = useRestaurantSubscriptions();
  
  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  
  const expiringSubscriptions = subscriptions.filter(sub => {
    const endDate = new Date(sub.end_date);
    return endDate <= sevenDaysFromNow;
  });

  return { data: expiringSubscriptions, ...rest };
}

/**
 * Create a restaurant with subscription - System Admin only
 */
export function useCreateRestaurantWithSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      name,
      logoUrl,
      period,
      bonusMonths = 0,
      reason,
    }: {
      name: string;
      logoUrl?: string | null;
      period: SubscriptionPeriod;
      bonusMonths?: number;
      reason?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('system-admin-create-restaurant-with-subscription', {
        body: {
          name,
          logo_url: logoUrl || null,
          period,
          bonus_months: bonusMonths,
          reason: reason || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-subscriptions'] });
      toast({ title: 'Restaurant created with subscription' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error creating restaurant', description: error.message, variant: 'destructive' });
    },
  });
}

/**
 * Renew subscription - System Admin only
 */
export function useRenewSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      period,
      bonusMonths = 0,
      startDate,
      reason,
      notes,
    }: {
      restaurantId: string;
      period: SubscriptionPeriod;
      bonusMonths?: number;
      startDate?: Date;
      reason?: string;
      notes?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('system-admin-renew-subscription', {
        body: {
          restaurant_id: restaurantId,
          period,
          bonus_months: bonusMonths,
          start_date: startDate?.toISOString() || null,
          reason: reason || null,
          notes: notes || null,
        },
      });

      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      queryClient.invalidateQueries({ queryKey: ['restaurant-subscriptions'] });
      toast({ title: 'Subscription renewed successfully' });
    },
    onError: (error: Error) => {
      toast({ title: 'Error renewing subscription', description: error.message, variant: 'destructive' });
    },
  });
}
