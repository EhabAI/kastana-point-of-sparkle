import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Loader2, Info, AlertTriangle, AlertCircle } from "lucide-react";
import { useSendAdminNotification } from "@/hooks/useAdminNotifications";
import { useToast } from "@/hooks/use-toast";

interface InternalNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: { id: string; name: string } | null;
  ownerEmail?: string | null;
}

type NotifType = 'info' | 'warning' | 'action_required';
type SuggestedMessageKey = 'custom' | 'subscription_reminder' | 'action_needed' | 'setup_incomplete' | 'admin_note' | 'friendly_followup';

interface SuggestedMessage {
  key: SuggestedMessageKey;
  labelAr: string;
  labelEn: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
}

const NOTIFICATION_TYPES: { value: NotifType; labelAr: string; labelEn: string; icon: React.ElementType; color: string }[] = [
  { value: 'info', labelAr: 'معلومات', labelEn: 'Info', icon: Info, color: 'text-blue-500' },
  { value: 'warning', labelAr: 'تنبيه', labelEn: 'Warning', icon: AlertTriangle, color: 'text-amber-500' },
  { value: 'action_required', labelAr: 'إجراء مطلوب', labelEn: 'Action Required', icon: AlertCircle, color: 'text-red-500' },
];

// Suggested messages generator - uses localized brand signature
const getSuggestedMessages = (language: string): Record<NotifType, SuggestedMessage[]> => {
  const brandSignature = language === 'ar' ? 'فريق كاستنا' : 'Kastana Team';
  const brandFrom = language === 'ar' ? 'من فريق كاستنا' : 'From Kastana Team';
  
  return {
    action_required: [
      { key: 'custom', labelAr: 'رسالة مخصصة', labelEn: 'Custom Message', titleAr: '', titleEn: '', messageAr: '', messageEn: '' },
      { 
        key: 'subscription_reminder', 
        labelAr: 'تجديد الاشتراك', 
        labelEn: 'Subscription Renewal',
        titleAr: 'تجديد الاشتراك مطلوب',
        titleEn: 'Subscription Renewal Required',
        messageAr: `يرجى تجديد اشتراككم في أقرب وقت لضمان استمرار الخدمة.\n\n${brandSignature}`,
        messageEn: `Please renew your subscription soon to ensure service continuity.\n\n${brandSignature}`
      },
      { 
        key: 'action_needed', 
        labelAr: 'إجراء مطلوب', 
        labelEn: 'Action Needed',
        titleAr: 'مطلوب اتخاذ إجراء',
        titleEn: 'Action Required',
        messageAr: `نحتاج منكم اتخاذ إجراء بخصوص حسابكم. يرجى التواصل معنا.\n\n${brandSignature}`,
        messageEn: `We need you to take action regarding your account. Please contact us.\n\n${brandSignature}`
      },
      { 
        key: 'setup_incomplete', 
        labelAr: 'إكمال الإعداد', 
        labelEn: 'Complete Setup',
        titleAr: 'إعداد النظام غير مكتمل',
        titleEn: 'System Setup Incomplete',
        messageAr: `لاحظنا أن إعداد النظام غير مكتمل. يرجى إكمال الخطوات المتبقية.\n\n${brandSignature}`,
        messageEn: `We noticed your system setup is incomplete. Please complete the remaining steps.\n\n${brandSignature}`
      },
    ],
    warning: [
      { key: 'custom', labelAr: 'رسالة مخصصة', labelEn: 'Custom Message', titleAr: '', titleEn: '', messageAr: '', messageEn: '' },
      { 
        key: 'subscription_reminder', 
        labelAr: 'انتهاء الاشتراك قريباً', 
        labelEn: 'Subscription Expiring Soon',
        titleAr: 'تنبيه: اشتراككم ينتهي قريباً',
        titleEn: 'Warning: Subscription Expiring Soon',
        messageAr: `اشتراككم سينتهي خلال الأيام القادمة. يرجى التجديد لتجنب انقطاع الخدمة.\n\n${brandSignature}`,
        messageEn: `Your subscription will expire in the coming days. Please renew to avoid service interruption.\n\n${brandSignature}`
      },
      { 
        key: 'admin_note', 
        labelAr: 'ملاحظة هامة', 
        labelEn: 'Important Note',
        titleAr: 'ملاحظة هامة من الإدارة',
        titleEn: 'Important Administrative Note',
        messageAr: `نود لفت انتباهكم إلى ملاحظة هامة تتعلق بحسابكم.\n\n${brandSignature}`,
        messageEn: `We would like to bring an important note to your attention regarding your account.\n\n${brandSignature}`
      },
    ],
    info: [
      { key: 'custom', labelAr: 'رسالة مخصصة', labelEn: 'Custom Message', titleAr: '', titleEn: '', messageAr: '', messageEn: '' },
      { 
        key: 'friendly_followup', 
        labelAr: 'متابعة ودية', 
        labelEn: 'Friendly Follow-up',
        titleAr: language === 'ar' ? 'مرحباً من فريق كاستنا' : 'Hello from Kastana Team',
        titleEn: 'Hello from Kastana Team',
        messageAr: `نتمنى أن تكونوا بخير! نتواصل معكم للاطمئنان ومعرفة إذا كنتم بحاجة لأي مساعدة.\n\n${brandSignature}`,
        messageEn: `We hope you are doing well! We are reaching out to check in and see if you need any assistance.\n\n${brandSignature}`
      },
      { 
        key: 'admin_note', 
        labelAr: 'ملاحظة إدارية', 
        labelEn: 'Administrative Note',
        titleAr: 'ملاحظة من الإدارة',
        titleEn: 'Note from Administration',
        messageAr: `نود إبلاغكم بملاحظة إدارية تخص حسابكم.\n\n${brandSignature}`,
        messageEn: `We would like to inform you of an administrative note regarding your account.\n\n${brandSignature}`
      },
    ],
  };
};

export function InternalNotificationDialog({
  open,
  onOpenChange,
  restaurant,
  ownerEmail,
}: InternalNotificationDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const sendNotification = useSendAdminNotification();

  const [notifType, setNotifType] = useState<NotifType>('info');
  const [suggestedKey, setSuggestedKey] = useState<SuggestedMessageKey>('custom');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Get available suggested messages for current notification type (with localized brand)
  const suggestedMessages = getSuggestedMessages(language);
  const availableSuggestions = suggestedMessages[notifType];

  // Handle notification type change - reset suggested key
  const handleNotifTypeChange = (newType: NotifType) => {
    setNotifType(newType);
    setSuggestedKey('custom');
  };

  // Handle suggested message selection
  const handleSuggestedChange = (key: SuggestedMessageKey) => {
    setSuggestedKey(key);
    const suggestion = availableSuggestions.find(s => s.key === key);
    if (suggestion && key !== 'custom') {
      setTitle(language === 'ar' ? suggestion.titleAr : suggestion.titleEn);
      setMessage(language === 'ar' ? suggestion.messageAr : suggestion.messageEn);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNotifType('info');
      setSuggestedKey('custom');
      setTitle('');
      setMessage('');
    }
    onOpenChange(isOpen);
  };

  const handleSend = async () => {
    if (!restaurant || !title.trim() || !message.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى ملء جميع الحقول' : 'Please fill all fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      await sendNotification.mutateAsync({
        restaurant_id: restaurant.id,
        title: title.trim(),
        message: message.trim(),
        type: notifType as any,
      });

      toast({
        title: language === 'ar' ? 'تم الإرسال' : 'Sent',
        description: language === 'ar' ? 'تم إرسال الإشعار بنجاح' : 'Notification sent successfully',
      });

      handleOpenChange(false);
    } catch (error) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل إرسال الإشعار' : 'Failed to send notification',
        variant: 'destructive',
      });
    }
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.value === notifType);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {language === 'ar' ? 'إرسال إشعار لصاحب المطعم' : 'Send Notification to Owner'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {restaurant?.name}
            {ownerEmail && <span className="text-muted-foreground"> • {ownerEmail}</span>}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 space-y-4">
          {/* Notification Type */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-type" className="text-xs font-medium">
              {language === 'ar' ? 'نوع الإشعار' : 'Notification Type'}
            </Label>
            <Select value={notifType} onValueChange={(val) => handleNotifTypeChange(val as NotifType)}>
              <SelectTrigger id="notif-type" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <Icon className={`h-4 w-4 ${type.color}`} />
                        <span>{language === 'ar' ? type.labelAr : type.labelEn}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Suggested Message - NEW DROPDOWN */}
          <div className="space-y-1.5">
            <Label htmlFor="suggested-msg" className="text-xs font-medium">
              {language === 'ar' ? 'النص المقترح' : 'Suggested Text'}
            </Label>
            <Select value={suggestedKey} onValueChange={(val) => handleSuggestedChange(val as SuggestedMessageKey)}>
              <SelectTrigger id="suggested-msg" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableSuggestions.map((suggestion) => (
                  <SelectItem key={suggestion.key} value={suggestion.key}>
                    {language === 'ar' ? suggestion.labelAr : suggestion.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-title" className="text-xs font-medium">
              {language === 'ar' ? 'عنوان الإشعار' : 'Notification Title'} *
            </Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (suggestedKey !== 'custom') setSuggestedKey('custom');
              }}
              placeholder={language === 'ar' ? 'عنوان قصير...' : 'Short title...'}
              className="h-9"
              maxLength={100}
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-message" className="text-xs font-medium">
              {language === 'ar' ? 'نص الإشعار' : 'Notification Text'} *
            </Label>
            <Textarea
              id="notif-message"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (suggestedKey !== 'custom') setSuggestedKey('custom');
              }}
              placeholder={language === 'ar' ? 'نص الإشعار...' : 'Notification message...'}
              rows={3}
              className="resize-none text-sm"
              maxLength={300}
            />
            <p className="text-[10px] text-muted-foreground text-end">
              {message.length}/300
            </p>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-md bg-muted/50 border">
            <p className="text-[10px] text-muted-foreground mb-2">
              {language === 'ar' ? 'معاينة الإشعار:' : 'Preview:'}
            </p>
            <div className="flex items-start gap-2">
              {selectedType && (
                <selectedType.icon className={`h-4 w-4 mt-0.5 ${selectedType.color}`} />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium line-clamp-1">
                  {title || (language === 'ar' ? 'عنوان الإشعار' : 'Notification Title')}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                  {message || (language === 'ar' ? 'نص الإشعار...' : 'Notification text...')}
                </p>
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter className="px-4 py-3 border-t gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => handleOpenChange(false)}
          >
            {t('cancel')}
          </Button>
          <Button
            size="sm"
            className="h-8"
            onClick={handleSend}
            disabled={sendNotification.isPending || !title.trim() || !message.trim()}
          >
            {sendNotification.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
            ) : (
              <Bell className="h-3.5 w-3.5 me-1.5" />
            )}
            {language === 'ar' ? 'إرسال' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
