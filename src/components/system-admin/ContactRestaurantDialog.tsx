import { useState, useMemo, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSendSubscriptionReminder, ReminderStage } from "@/hooks/useSubscriptionReminder";
import { Mail, MessageCircle, Copy, Loader2, Send } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { RestaurantSubscription } from "@/hooks/useRestaurantSubscriptions";

type CommunicationMethod = "email" | "whatsapp";
type MessageTemplate = "expiring_soon" | "expired" | "follow_up";
type SuggestedTemplate = "subscription_reminder" | "action_required" | "setup_incomplete" | "admin_note" | "friendly_followup" | "custom";

interface ContactRestaurantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurant: {
    id: string;
    name: string;
    owner_id: string | null;
  } | null;
  subscription: RestaurantSubscription | undefined;
  ownerEmail: string | null;
  ownerPhone: string | null;
}

// Normalize phone for WhatsApp (Jordan format)
function normalizePhoneForWhatsApp(phone: string): string | null {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  } 
  else if (cleaned.startsWith('0') && cleaned.length === 10 && /^07[789]/.test(cleaned)) {
    cleaned = '962' + cleaned.substring(1);
  }
  else if (cleaned.startsWith('7') && cleaned.length === 9 && /^7[789]/.test(cleaned)) {
    cleaned = '962' + cleaned;
  }
  
  if (!/^\d{10,15}$/.test(cleaned)) return null;
  
  return cleaned;
}

export function ContactRestaurantDialog({
  open,
  onOpenChange,
  restaurant,
  subscription,
  ownerEmail,
  ownerPhone,
}: ContactRestaurantDialogProps) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const sendReminder = useSendSubscriptionReminder();
  const isArabic = language === 'ar';

  const [method, setMethod] = useState<CommunicationMethod>("email");
  const [template, setTemplate] = useState<MessageTemplate>("follow_up");
  const [suggestedTemplate, setSuggestedTemplate] = useState<SuggestedTemplate>("custom");
  const [messageContent, setMessageContent] = useState("");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Suggested templates based on communication method
  const getSuggestedTemplates = (): { value: SuggestedTemplate; label: string }[] => {
    const templates: { value: SuggestedTemplate; label: string }[] = [
      { value: "custom", label: isArabic ? "رسالة مخصصة" : "Custom Message" },
      { value: "subscription_reminder", label: isArabic ? "تذكير بالاشتراك" : "Subscription Reminder" },
      { value: "action_required", label: isArabic ? "إجراء مطلوب" : "Action Required" },
      { value: "setup_incomplete", label: isArabic ? "إعداد غير مكتمل" : "Setup Incomplete" },
      { value: "admin_note", label: isArabic ? "ملاحظة إدارية" : "Administrative Note" },
      { value: "friendly_followup", label: isArabic ? "متابعة ودية" : "Friendly Follow-up" },
    ];
    return templates;
  };

  // Brand signature (localized)
  const brandSignature = t('brandSignatureTeam');
  const brandNameFull = t('brandNameFull');

  // Generate suggested template content
  const generateSuggestedMessage = (templateType: SuggestedTemplate): string => {
    const restaurantName = restaurant?.name || '';
    const endDateStr = subscriptionEndDate ? format(subscriptionEndDate, 'yyyy-MM-dd') : '';
    const daysRemaining = daysLeft ?? 0;

    if (isArabic) {
      switch (templateType) {
        case "subscription_reminder":
          return `مرحباً،

نود تذكيركم بأن اشتراك مطعم "${restaurantName}" في ${brandNameFull} ${isExpired ? 'قد انتهى' : 'سينتهي قريباً'}.

${subscriptionEndDate ? `تاريخ انتهاء الاشتراك: ${endDateStr}` : ''}
${!isExpired && daysRemaining > 0 ? `المتبقي: ${daysRemaining} يوم` : ''}

يرجى التواصل معنا لتجديد الاشتراك.

${brandSignature}`;

        case "action_required":
          return `مرحباً،

نحتاج منكم اتخاذ إجراء بخصوص مطعم "${restaurantName}".

[يرجى توضيح الإجراء المطلوب هنا]

نرجو الاستجابة في أقرب وقت ممكن.

${brandSignature}`;

        case "setup_incomplete":
          return `مرحباً،

لاحظنا أن إعداد مطعم "${restaurantName}" في ${brandNameFull} غير مكتمل.

لضمان أفضل تجربة استخدام، يرجى إكمال الخطوات التالية:
• [الخطوة الأولى]
• [الخطوة الثانية]

إذا احتجتم للمساعدة، لا تترددوا في التواصل معنا.

${brandSignature}`;

        case "admin_note":
          return `مرحباً،

ملاحظة إدارية بخصوص مطعم "${restaurantName}":

[نص الملاحظة هنا]

للاستفسارات، يرجى التواصل معنا.

${brandSignature}`;

        case "friendly_followup":
          return `مرحباً،

نتمنى أن تكونوا بخير!

نتواصل معكم للاطمئنان على سير العمل في مطعم "${restaurantName}" ومعرفة إذا كنتم بحاجة لأي مساعدة.

نحن دائماً سعداء بخدمتكم.

${brandSignature}`;

        case "custom":
        default:
          return messageContent;
      }
    } else {
      switch (templateType) {
        case "subscription_reminder":
          return `Hello,

This is a reminder that the ${brandNameFull} subscription for "${restaurantName}" ${isExpired ? 'has expired' : 'is expiring soon'}.

${subscriptionEndDate ? `Expiration date: ${endDateStr}` : ''}
${!isExpired && daysRemaining > 0 ? `Days remaining: ${daysRemaining}` : ''}

Please contact us to renew your subscription.

${brandSignature}`;

        case "action_required":
          return `Hello,

We need you to take action regarding "${restaurantName}".

[Please specify the required action here]

We kindly request your prompt response.

${brandSignature}`;

        case "setup_incomplete":
          return `Hello,

We noticed that the setup for "${restaurantName}" in ${brandNameFull} is incomplete.

To ensure the best experience, please complete the following steps:
• [Step 1]
• [Step 2]

If you need assistance, don't hesitate to contact us.

${brandSignature}`;

        case "admin_note":
          return `Hello,

Administrative note regarding "${restaurantName}":

[Note content here]

For inquiries, please contact us.

${brandSignature}`;

        case "friendly_followup":
          return `Hello,

We hope you're doing well!

We're reaching out to check how things are going at "${restaurantName}" and to see if you need any assistance.

We're always happy to help.

${brandSignature}`;

        case "custom":
        default:
          return messageContent;
      }
    }
  };

  // Handle suggested template change
  const handleSuggestedTemplateChange = (value: SuggestedTemplate) => {
    setSuggestedTemplate(value);
    if (value !== "custom") {
      setMessageContent(generateSuggestedMessage(value));
    }
  };

  // Subscription status calculations
  const subscriptionEndDate = subscription ? new Date(subscription.end_date) : null;
  const daysLeft = subscriptionEndDate ? differenceInDays(subscriptionEndDate, new Date()) : null;
  const isExpired = daysLeft !== null && daysLeft < 0;
  const isExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;

  // Phone normalization
  const normalizedPhone = normalizePhoneForWhatsApp(ownerPhone || '');
  const hasPhone = !!normalizedPhone;
  const hasEmail = !!ownerEmail;

  // Determine available templates based on subscription state
  const availableTemplates = useMemo(() => {
    const templates: { value: MessageTemplate; label: string }[] = [];
    
    if (isExpired) {
      templates.push({ value: "expired", label: t('contact_template_expired') });
    }
    if (isExpiringSoon || daysLeft !== null && daysLeft <= 14) {
      templates.push({ value: "expiring_soon", label: t('contact_template_expiring') });
    }
    templates.push({ value: "follow_up", label: t('contact_template_follow_up') });
    
    return templates;
  }, [isExpired, isExpiringSoon, daysLeft, t]);

  // Generate message based on template
  const generateMessage = (templateType: MessageTemplate): string => {
    const restaurantName = restaurant?.name || '';
    const endDateStr = subscriptionEndDate ? format(subscriptionEndDate, 'yyyy-MM-dd') : '';
    const daysRemaining = daysLeft ?? 0;

    if (isArabic) {
      switch (templateType) {
        case "expired":
          return `مرحباً،

نود تذكيركم بأن اشتراك مطعم "${restaurantName}" في ${brandNameFull} قد انتهى.

للاستمرار في استخدام النظام، يرجى التواصل معنا لتجديد الاشتراك.

${brandSignature}`;

        case "expiring_soon":
          return `مرحباً،

نود تذكيركم بأن اشتراك مطعم "${restaurantName}" في ${brandNameFull} سينتهي قريباً.

تاريخ انتهاء الاشتراك: ${endDateStr}
المتبقي: ${Math.abs(daysRemaining)} يوم

يرجى التواصل معنا لتجديد الاشتراك قبل انتهاء المدة.

${brandSignature}`;

        case "follow_up":
        default:
          return `مرحباً،

معك ${brandSignature}. نتواصل معكم بخصوص مطعم "${restaurantName}".

كيف نستطيع مساعدتكم؟

${brandSignature}`;
      }
    } else {
      switch (templateType) {
        case "expired":
          return `Hello,

This is a reminder that the ${brandNameFull} subscription for "${restaurantName}" has expired.

To continue using the system, please contact us to renew your subscription.

${brandSignature}`;

        case "expiring_soon":
          return `Hello,

This is a reminder that the ${brandNameFull} subscription for "${restaurantName}" is expiring soon.

Expiration date: ${endDateStr}
Days remaining: ${Math.abs(daysRemaining)}

Please contact us to renew your subscription before it expires.

${brandSignature}`;

        case "follow_up":
        default:
          return `Hello,

This is the ${brandSignature} reaching out regarding "${restaurantName}".

How can we assist you?

${brandSignature}`;
      }
    }
  };

  // Update message when template changes
  useEffect(() => {
    setMessageContent(generateMessage(template));
  }, [template, restaurant, subscription, isArabic]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // Auto-select best template based on subscription state
      if (isExpired) {
        setTemplate("expired");
        setSuggestedTemplate("subscription_reminder");
      } else if (isExpiringSoon) {
        setTemplate("expiring_soon");
        setSuggestedTemplate("subscription_reminder");
      } else {
        setTemplate("follow_up");
        setSuggestedTemplate("custom");
      }
      
      // Auto-select method based on availability
      if (hasEmail) {
        setMethod("email");
      } else if (hasPhone) {
        setMethod("whatsapp");
      }
    }
  }, [open, isExpired, isExpiringSoon, hasEmail, hasPhone]);

  // Map template to reminder stage
  const getReminderStage = (): ReminderStage | null => {
    switch (template) {
      case "expired":
        return "EXPIRED";
      case "expiring_soon":
        return daysLeft !== null && daysLeft <= 1 ? "1_DAY" : "7_DAYS";
      default:
        return null;
    }
  };

  const handleSendEmail = async () => {
    if (!restaurant) return;
    
    const stage = getReminderStage();
    if (!stage) {
      toast({
        title: isArabic ? 'قالب غير مدعوم للبريد' : 'Template not supported for email',
        description: isArabic ? 'يرجى اختيار قالب "ينتهي قريباً" أو "منتهي"' : 'Please select "Expiring Soon" or "Expired" template',
        variant: "destructive",
      });
      return;
    }

    try {
      await sendReminder.mutateAsync({
        restaurantId: restaurant.id,
        stage,
      });
      onOpenChange(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleCopyWhatsApp = async () => {
    const textToCopy = hasPhone 
      ? `+${normalizedPhone}\n\n${messageContent}`
      : messageContent;
      
    try {
      await navigator.clipboard.writeText(textToCopy);
      toast({
        title: isArabic ? 'تم النسخ' : 'Copied',
        description: isArabic ? 'تم نسخ الرسالة إلى الحافظة' : 'Message copied to clipboard',
      });
      onOpenChange(false);
    } catch {
      toast({
        title: isArabic ? 'فشل النسخ' : 'Copy failed',
        variant: "destructive",
      });
    }
  };

  const handleAction = () => {
    if (method === "email") {
      setConfirmDialogOpen(true);
    } else {
      handleCopyWhatsApp();
    }
  };

  const canSend = method === "email" 
    ? hasEmail && !!getReminderStage() 
    : true;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base">{t('contact_dialog_title')}</DialogTitle>
            <DialogDescription className="text-sm">
              {restaurant?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Communication Method */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('contact_method_label')}</Label>
              <RadioGroup
                value={method}
                onValueChange={(v) => setMethod(v as CommunicationMethod)}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="email" id="method-email" disabled={!hasEmail} />
                  <Label 
                    htmlFor="method-email" 
                    className={`flex items-center gap-1.5 text-sm cursor-pointer ${!hasEmail ? 'opacity-50' : ''}`}
                  >
                    <Mail className="h-3.5 w-3.5" />
                    {t('contact_method_email')}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="whatsapp" id="method-whatsapp" />
                  <Label 
                    htmlFor="method-whatsapp" 
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {t('contact_method_whatsapp')}
                  </Label>
                </div>
              </RadioGroup>
              {!hasEmail && method === "email" && (
                <p className="text-xs text-destructive">{t('contact_no_email')}</p>
              )}
            </div>

            {/* Template Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('contact_template_label')}</Label>
              <Select value={template} onValueChange={(v) => setTemplate(v as MessageTemplate)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableTemplates.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Suggested Template Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                {isArabic ? 'النص المقترح' : 'Suggested Text'}
              </Label>
              <Select 
                value={suggestedTemplate} 
                onValueChange={(v) => handleSuggestedTemplateChange(v as SuggestedTemplate)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {getSuggestedTemplates().map((tmpl) => (
                    <SelectItem key={tmpl.value} value={tmpl.value}>
                      {tmpl.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Message Preview */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">{t('contact_message_label')}</Label>
              <Textarea
                value={messageContent}
                onChange={(e) => {
                  setMessageContent(e.target.value);
                  setSuggestedTemplate("custom");
                }}
                className="min-h-[140px] text-sm resize-none"
                dir={isArabic ? "rtl" : "ltr"}
              />
            </div>

            {/* Email Warning for Follow-up */}
            {method === "email" && template === "follow_up" && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t('contact_email_template_warning')}
              </p>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              {t('cancel')}
            </Button>
            <Button 
              size="sm" 
              onClick={handleAction}
              disabled={!canSend || sendReminder.isPending}
            >
              {sendReminder.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin me-1.5" />
              ) : method === "email" ? (
                <Send className="h-3.5 w-3.5 me-1.5" />
              ) : (
                <Copy className="h-3.5 w-3.5 me-1.5" />
              )}
              {method === "email" ? t('contact_send_email') : t('contact_copy_whatsapp')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Confirmation Dialog */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('contact_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('contact_confirm_desc')} <strong>{ownerEmail}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSendEmail}>
              {sendReminder.isPending && <Loader2 className="h-4 w-4 animate-spin me-1.5" />}
              {t('contact_confirm_send')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
