import { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Bell, Loader2, Mail, MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useSendAdminNotification, NotificationType } from "@/hooks/useAdminNotifications";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays } from "date-fns";
import { RestaurantSubscription } from "@/hooks/useRestaurantSubscriptions";

interface SendNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: { id: string; name: string } | null;
  subscription?: RestaurantSubscription;
}

type TemplateKey = 'subscription' | 'welcome' | 'technical' | 'custom';

interface Template {
  key: TemplateKey;
  labelAr: string;
  labelEn: string;
  titleAr: string;
  titleEn: string;
  messageAr: string;
  messageEn: string;
}

const TEMPLATES: Template[] = [
  {
    key: 'subscription',
    labelAr: 'تنبيه اشتراك',
    labelEn: 'Subscription Alert',
    titleAr: 'تنبيه بخصوص الاشتراك',
    titleEn: 'Subscription Notice',
    messageAr: 'مرحباً {restaurant_name}،\n\nنود تذكيركم بأن اشتراككم ينتهي بتاريخ {subscription_end_date} (متبقي {days_left} يوم).\n\nيرجى التواصل معنا للتجديد.\n\nشكراً لكم.',
    messageEn: 'Hello {restaurant_name},\n\nThis is a reminder that your subscription ends on {subscription_end_date} ({days_left} days remaining).\n\nPlease contact us to renew.\n\nThank you.',
  },
  {
    key: 'welcome',
    labelAr: 'رسالة ترحيب',
    labelEn: 'Welcome Message',
    titleAr: 'أهلاً بكم في كاستانا',
    titleEn: 'Welcome to Kastana',
    messageAr: 'مرحباً {restaurant_name}،\n\nأهلاً وسهلاً بكم في نظام كاستانا لنقاط البيع!\n\nنحن سعداء بانضمامكم إلينا. إذا احتجتم أي مساعدة، لا تترددوا في التواصل معنا.\n\nفريق كاستانا',
    messageEn: 'Hello {restaurant_name},\n\nWelcome to Kastana POS System!\n\nWe are delighted to have you with us. If you need any assistance, please do not hesitate to contact us.\n\nKastana Team',
  },
  {
    key: 'technical',
    labelAr: 'مشكلة تقنية',
    labelEn: 'Technical Issue',
    titleAr: 'إشعار تقني',
    titleEn: 'Technical Notice',
    messageAr: 'مرحباً {restaurant_name}،\n\nنود إعلامكم بأنه تم رصد مشكلة تقنية في حسابكم.\n\nيرجى التواصل مع فريق الدعم الفني للمساعدة.\n\nشكراً لتفهمكم.',
    messageEn: 'Hello {restaurant_name},\n\nWe would like to inform you that a technical issue has been detected in your account.\n\nPlease contact our support team for assistance.\n\nThank you for your understanding.',
  },
  {
    key: 'custom',
    labelAr: 'رسالة مخصصة',
    labelEn: 'Custom Message',
    titleAr: '',
    titleEn: '',
    messageAr: '',
    messageEn: '',
  },
];

export function SendNotificationDialog({
  open,
  onOpenChange,
  restaurant,
  subscription,
}: SendNotificationDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const sendNotification = useSendAdminNotification();

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateKey>('subscription');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Calculate subscription info for placeholders
  const subscriptionInfo = useMemo(() => {
    if (!subscription) {
      return { endDate: '-', daysLeft: 0, isExpired: true };
    }
    const endDate = new Date(subscription.end_date);
    const daysLeft = differenceInDays(endDate, new Date());
    return {
      endDate: format(endDate, 'yyyy/MM/dd'),
      daysLeft: Math.max(0, daysLeft),
      isExpired: daysLeft < 0,
    };
  }, [subscription]);

  // Replace placeholders in message
  const replacePlaceholders = (text: string) => {
    if (!restaurant) return text;
    return text
      .replace(/{restaurant_name}/g, restaurant.name)
      .replace(/{subscription_end_date}/g, subscriptionInfo.endDate)
      .replace(/{days_left}/g, String(subscriptionInfo.daysLeft));
  };

  // Handle template selection
  const handleTemplateChange = (templateKey: TemplateKey) => {
    setSelectedTemplate(templateKey);
    const template = TEMPLATES.find(t => t.key === templateKey);
    if (template) {
      const templateTitle = language === 'ar' ? template.titleAr : template.titleEn;
      const templateMessage = language === 'ar' ? template.messageAr : template.messageEn;
      setTitle(templateTitle);
      setMessage(replacePlaceholders(templateMessage));
    }
  };

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && restaurant) {
      // Set default template with replaced placeholders
      const defaultTemplate = TEMPLATES[0];
      setSelectedTemplate('subscription');
      setTitle(language === 'ar' ? defaultTemplate.titleAr : defaultTemplate.titleEn);
      setMessage(replacePlaceholders(language === 'ar' ? defaultTemplate.messageAr : defaultTemplate.messageEn));
    } else if (!isOpen) {
      setSelectedTemplate('subscription');
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
        type: selectedTemplate as NotificationType,
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg p-0">
        <DialogHeader className="px-4 pt-4 pb-2 flex-shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            {language === 'ar' ? 'التواصل مع صاحب المطعم' : 'Contact Restaurant Owner'}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {restaurant?.name}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="px-4 space-y-4">
          {/* Communication Method Section */}
          <div className="space-y-2">
            <Label className="text-xs font-medium text-muted-foreground">
              {language === 'ar' ? 'طريقة التواصل' : 'Communication Method'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {/* Active: Internal Notification */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/30">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'إشعار داخل النظام' : 'In-App Notification'}
                </span>
              </div>
              {/* Disabled: Email */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border opacity-60">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'بريد إلكتروني' : 'Email'}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {language === 'ar' ? 'قريبًا' : 'Soon'}
                </Badge>
              </div>
              {/* Disabled: WhatsApp */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border opacity-60">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'واتساب' : 'WhatsApp'}
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5">
                  {language === 'ar' ? 'قريبًا' : 'Soon'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Template Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="template" className="text-xs font-medium">
              {language === 'ar' ? 'نوع الرسالة' : 'Message Template'}
            </Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
              <SelectTrigger id="template" className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((template) => (
                  <SelectItem key={template.key} value={template.key}>
                    {language === 'ar' ? template.labelAr : template.labelEn}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Input */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-title" className="text-xs font-medium">
              {language === 'ar' ? 'عنوان الرسالة' : 'Title'}
            </Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={language === 'ar' ? 'عنوان الإشعار...' : 'Notification title...'}
              className="h-9"
            />
          </div>

          {/* Message Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="notif-message" className="text-xs font-medium">
              {language === 'ar' ? 'نص الرسالة' : 'Message'}
            </Label>
            <Textarea
              id="notif-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={language === 'ar' ? 'محتوى الرسالة...' : 'Message content...'}
              rows={5}
              className="resize-none text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' 
                ? 'يمكنك استخدام: {restaurant_name}, {subscription_end_date}, {days_left}'
                : 'Available placeholders: {restaurant_name}, {subscription_end_date}, {days_left}'
              }
            </p>
          </div>

          {/* Subscription Info Preview */}
          {subscription && (
            <div className="p-2.5 rounded-md bg-muted/50 border text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'انتهاء الاشتراك:' : 'Subscription ends:'}
                </span>
                <span className={subscriptionInfo.isExpired ? 'text-destructive' : ''}>
                  {subscriptionInfo.endDate}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {language === 'ar' ? 'الأيام المتبقية:' : 'Days remaining:'}
                </span>
                <Badge 
                  variant={subscriptionInfo.isExpired ? 'destructive' : subscriptionInfo.daysLeft <= 7 ? 'outline' : 'secondary'}
                  className="text-[10px]"
                >
                  {subscriptionInfo.isExpired 
                    ? (language === 'ar' ? 'منتهي' : 'Expired')
                    : `${subscriptionInfo.daysLeft} ${language === 'ar' ? 'يوم' : 'days'}`
                  }
                </Badge>
              </div>
            </div>
          )}
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
            {language === 'ar' ? 'إرسال الرسالة' : 'Send Message'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
