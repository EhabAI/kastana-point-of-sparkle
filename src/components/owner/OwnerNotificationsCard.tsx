import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bell, CreditCard, MessageSquare, AlertCircle, Info, ChevronRight } from "lucide-react";
import { useOwnerNotifications, useMarkNotificationAsRead, OwnerNotification } from "@/hooks/useOwnerNotifications";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function OwnerNotificationsCard() {
  const { language } = useLanguage();
  const { data: notifications = [] } = useOwnerNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const [selectedNotification, setSelectedNotification] = useState<OwnerNotification | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Show only unread or recent notifications (last 3)
  const displayNotifications = notifications.filter(n => !n.is_read).slice(0, 3);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'subscription':
        return <CreditCard className="h-4 w-4 text-amber-500" />;
      case 'welcome':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'technical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: language === 'ar' ? ar : enUS,
    });
  };

  const handleNotificationClick = async (notification: OwnerNotification) => {
    setSelectedNotification(notification);
    setDialogOpen(true);
    
    if (!notification.is_read) {
      await markAsRead.mutateAsync(notification.id);
    }
  };

  // Don't show the card if there are no unread notifications
  if (displayNotifications.length === 0) {
    return null;
  }

  return (
    <>
      <div data-trainer="notifications-alerts" className="rounded-xl bg-[#F5F7FB] dark:bg-[#1F2937] border border-black/5 dark:border-white/[0.06] p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground/90">
              {language === 'ar' ? 'إشعارات جديدة' : 'New Notifications'}
            </h3>
          </div>
          <Badge variant="secondary" className="text-xs">
            {displayNotifications.length}
          </Badge>
        </div>
        
        {/* Notifications List */}
        <div className="space-y-2">
          {displayNotifications.map((notification) => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className="w-full text-start p-3 rounded-xl bg-background/60 dark:bg-background/40 border border-black/[0.03] dark:border-white/[0.04] hover:bg-background/80 dark:hover:bg-background/60 relative overflow-hidden"
            >
              {/* Unread indicator - thin side line */}
              {!notification.is_read && (
                <div className="absolute ltr:left-0 rtl:right-0 top-2 bottom-2 w-[3px] bg-primary rounded-full" />
              )}
              
              <div className="flex items-start gap-3 ltr:pl-2 rtl:pr-2">
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground/85 line-clamp-1">
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground/80 line-clamp-1 mt-0.5 leading-relaxed">
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                    {formatRelativeTime(notification.created_at)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full Notification Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md p-0">
          <DialogHeader className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              {selectedNotification && getNotificationIcon(selectedNotification.type)}
              <DialogTitle className="text-base">
                {selectedNotification?.title}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              {selectedNotification && formatRelativeTime(selectedNotification.created_at)}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="px-4 pb-4">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedNotification?.message}
            </div>
            {selectedNotification?.type && (
              <div className="mt-4 pt-3 border-t">
                <Badge variant="outline" className="text-xs">
                  {selectedNotification.type === 'subscription' && (language === 'ar' ? 'اشتراك' : 'Subscription')}
                  {selectedNotification.type === 'welcome' && (language === 'ar' ? 'ترحيب' : 'Welcome')}
                  {selectedNotification.type === 'technical' && (language === 'ar' ? 'تقني' : 'Technical')}
                  {selectedNotification.type === 'custom' && (language === 'ar' ? 'عام' : 'General')}
                </Badge>
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
