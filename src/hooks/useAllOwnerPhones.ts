import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAllOwnerPhones() {
  return useQuery({
    queryKey: ['all-owner-phones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('restaurant_settings')
        .select('restaurant_id, owner_phone');
      
      if (error) throw error;
      
      const phoneMap = new Map<string, string | null>();
      data?.forEach((row) => {
        phoneMap.set(row.restaurant_id, row.owner_phone);
      });
      
      return phoneMap;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
