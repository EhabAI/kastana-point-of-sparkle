import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

export type ReminderStage = '7_DAYS' | '1_DAY' | 'EXPIRED';

export interface ReminderResult {
  success: boolean;
  message: string;
  stage: ReminderStage;
  sent_to: string;
}

export interface ReminderError {
  error: string;
  message?: string;
  details?: string;
}

/**
 * Parse and format error messages for System Admin display
 */
function parseReminderError(error: unknown, isArabic: boolean): string {
  // Default messages
  const defaultMsg = isArabic 
    ? 'فشل في إرسال التذكير. يرجى المحاولة مرة أخرى.'
    : 'Failed to send reminder. Please try again.';

  if (!error) return defaultMsg;

  const errorStr = error instanceof Error ? error.message : String(error);

  // Map known error patterns to user-friendly messages
  const errorMappings: Array<{ pattern: RegExp | string; en: string; ar: string }> = [
    { 
      pattern: /not authenticated|authentication/i,
      en: 'Session expired. Please log in again.',
      ar: 'انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.'
    },
    { 
      pattern: /unauthorized|system admin/i,
      en: 'Access denied. System Admin privileges required.',
      ar: 'الوصول مرفوض. صلاحيات مسؤول النظام مطلوبة.'
    },
    { 
      pattern: /restaurant not found/i,
      en: 'Restaurant not found.',
      ar: 'المطعم غير موجود.'
    },
    { 
      pattern: /no owner/i,
      en: 'Cannot send reminder: No owner assigned to this restaurant.',
      ar: 'لا يمكن إرسال التذكير: لا يوجد مالك معين لهذا المطعم.'
    },
    { 
      pattern: /owner email/i,
      en: 'Cannot retrieve owner email address.',
      ar: 'لا يمكن الحصول على البريد الإلكتروني للمالك.'
    },
    { 
      pattern: /duplicate reminder|already been sent/i,
      en: 'This reminder has already been sent.',
      ar: 'تم إرسال هذا التذكير مسبقاً.'
    },
    { 
      pattern: /email service|not configured|RESEND/i,
      en: 'Email service not configured. Contact support.',
      ar: 'خدمة البريد غير مُعدّة. تواصل مع الدعم.'
    },
    { 
      pattern: /sender.*not verified|verification|domain/i,
      en: 'Email sender not verified. Contact support.',
      ar: 'مرسل البريد غير موثق. تواصل مع الدعم.'
    },
    { 
      pattern: /failed to send email/i,
      en: 'Email delivery failed. Please try again.',
      ar: 'فشل تسليم البريد الإلكتروني. يرجى المحاولة مرة أخرى.'
    },
    { 
      pattern: /invalid reminder stage/i,
      en: 'Invalid reminder stage selected.',
      ar: 'مرحلة التذكير غير صالحة.'
    },
  ];

  for (const mapping of errorMappings) {
    if (typeof mapping.pattern === 'string' 
      ? errorStr.toLowerCase().includes(mapping.pattern.toLowerCase())
      : mapping.pattern.test(errorStr)
    ) {
      return isArabic ? mapping.ar : mapping.en;
    }
  }

  return defaultMsg;
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
  const { language } = useLanguage();
  const isArabic = language === 'ar';

  return useMutation({
    mutationFn: async ({
      restaurantId,
      stage,
    }: {
      restaurantId: string;
      stage: ReminderStage;
    }): Promise<ReminderResult> => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error(isArabic ? 'غير مُصادق' : 'Not authenticated');
      }

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
      
      // Handle edge function error response
      if (response.data?.error) {
        const errorData = response.data as ReminderError;
        throw new Error(errorData.message || errorData.details || errorData.error);
      }
      
      return response.data as ReminderResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['restaurants'] });
      toast({ 
        title: isArabic ? 'تم إرسال التذكير بنجاح' : 'Reminder sent successfully',
        description: isArabic ? `أُرسل إلى: ${data.sent_to}` : `Sent to: ${data.sent_to}`,
      });
    },
    onError: (error: Error) => {
      const userFriendlyMessage = parseReminderError(error, isArabic);
      toast({ 
        title: isArabic ? 'فشل إرسال التذكير' : 'Failed to send reminder', 
        description: userFriendlyMessage, 
        variant: 'destructive' 
      });
    },
  });
}
