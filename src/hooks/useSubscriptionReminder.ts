import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type ReminderStage = '7_DAYS' | '1_DAY' | 'EXPIRED';

export interface ReminderResult {
  success: boolean;
  message: string;
  stage: ReminderStage;
  sent_to: string;
}

/**
 * Calculate the applicable reminder stage based on subscription end date
 */
export function getApplicableReminderStage(endDate: string | null | undefined): ReminderStage | null {
  if (!endDate) return null;
  
  const now = new Date();
  const end = new Date(endDate);
  const diffMs = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 'EXPIRED';
  if (diffDays === 1) return '1_DAY';
  if (diffDays <= 7) return '7_DAYS';
  
  return null; // No applicable stage
}

/**
 * Get label for reminder stage
 */
export function getReminderStageLabel(stage: ReminderStage, t: (key: string) => string): string {
  switch (stage) {
    case '7_DAYS':
      return t('reminder_stage_7_days');
    case '1_DAY':
      return t('reminder_stage_1_day');
    case 'EXPIRED':
      return t('reminder_stage_expired');
    default:
      return stage;
  }
}

/**
 * Check if a reminder can be sent (not already sent for this stage)
 */
export function canSendReminder(
  lastStage: string | null | undefined,
  currentStage: ReminderStage | null
): boolean {
  if (!currentStage) return false;
  return lastStage !== currentStage;
}

/**
 * Hook to send subscription renewal reminder - System Admin only
 */
export function useSendSubscriptionReminder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      restaurantId,
      stage,
    }: {
      restaurantId: string;
      stage: ReminderStage;
    }): Promise<ReminderResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('send-subscription-renewal-reminder', {
        body: {
          mode: 'manual',
          restaurant_id: restaurantId,
          stage,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to send reminder');
      }
      
      if (response.data?.error) {
        throw new Error(response.data.error);
      }
      
      return response.data as ReminderResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({ 
        title: 'Reminder sent successfully',
        description: `Sent to: ${data.sent_to}`,
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: 'Failed to send reminder', 
        description: error.message, 
        variant: 'destructive' 
      });
    },
  });
}
